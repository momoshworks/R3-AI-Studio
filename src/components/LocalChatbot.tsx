import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Cpu,
  ShieldCheck,
  Send,
  Trash2,
  Download,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { LocalLLMStatus } from '../types';
import { Language, Theme } from '../utils/translations';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
  latencyMs?: number;
  source?: string;
}

interface LocalChatbotProps {
  theme: Theme;
  lang: Language;
}

export const LocalChatbot: React.FC<LocalChatbotProps> = ({ theme, lang }) => {
  const isDark = theme === 'dark';
  const isAr = lang === 'ar';

  const [status, setStatus] = useState<LocalLLMStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('antigravity-rust-core');
  const [messages, setMessages] = useState<LocalMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ANTIGRAVITY_LOCAL_CHAT_MESSAGES');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: isAr
          ? '### مرحباً بك في الشات بوت المحلي (Antigravity Local AI)\n\nيعمل هذا الشات بوت بالكامل **على عتاد جهازك محلياً** عبر محرك Rust المدمج، أو من خلال خوادم **Ollama** و **LM Studio** المثبتة لديك.\n\n* **100% خصوصية:** لا تخرج أي رسائل أو أكواد خارج حاسوبك.\n* **بدون اتصال بالإنترنت:** استجابة سريعة وتوليد أكواد وتدقيق أمني أوفلاين بالكامل.\n* **دعم النماذج:** يمكنك الاختيار بين محرك Rust المدمج أو أي نموذج قمت بتحميله في Ollama.'
          : '### Welcome to Antigravity Local AI\n\nThis chatbot runs completely **on your local hardware** powered by the native Rust engine and your local **Ollama** / **LM Studio** setup.\n\n* **100% Private:** Zero telemetry or messages leave your device.\n* **Fully Offline:** Works seamlessly without internet connection.\n* **Model Agnostic:** Seamlessly switch between built-in Rust core or downloaded Ollama models.',
        timestamp: Date.now(),
        modelUsed: 'Antigravity Rust Core',
        source: 'rust_builtin',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem('ANTIGRAVITY_LOCAL_CHAT_MESSAGES', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Check Local LLM Status
  const refreshStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const s = await api.checkLocalLLMStatus();
      if (s) {
        setStatus(s);
        if (s.active_model) {
          setSelectedModel(s.active_model);
        }
      }
    } catch (err) {
      console.warn('Failed to probe local LLM:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    const userMsg: LocalMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const res = await api.queryLocalLLM({
        prompt: text,
        model: selectedModel,
        temperature: 0.7,
      });

      const assistantMsg: LocalMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'تمت المعالجة.',
        timestamp: Date.now(),
        modelUsed: res.model_used || selectedModel,
        latencyMs: res.latency_ms,
        source: res.source,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: LocalMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `### تنبيه المحرك المحلي\nتعذر إتمام المعالجة: ${err.message || err}`,
        timestamp: Date.now(),
        modelUsed: selectedModel,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (window.confirm(isAr ? 'هل تريد مسح محادثة الشات بوت المحلي؟' : 'Clear local chat history?')) {
      setMessages([]);
      localStorage.removeItem('ANTIGRAVITY_LOCAL_CHAT_MESSAGES');
    }
  };

  const exportChat = () => {
    const text = messages
      .map((m) => `### ${m.role === 'user' ? 'User' : 'Antigravity Local AI'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n---`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Antigravity_Local_Chat_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    {
      title: isAr ? 'تدقيق أمان للكود' : 'Security Code Audit',
      prompt: isAr ? 'افحص هذا الكود لاكتشاف أي ثغرات أمنية واقترح أفضل ممارسات الحماية:' : 'Audit this snippet for security vulnerabilities and recommend best practices:',
    },
    {
      title: isAr ? 'تحسين أداء دالة' : 'Optimize Function',
      prompt: isAr ? 'راجع الدالة التالية وحسّن سرعتها واستهلاك الذاكرة مع الشرح المباشر:' : 'Optimize the following function for speed and minimal memory allocation:',
    },
    {
      title: isAr ? 'فحص صحة النظام' : 'System Health Audit',
      prompt: isAr ? 'حلل صحة وأمان النظام واقترح خطوات الصيانة الدورية الموصى بها.' : 'Analyze local system health and recommend recommended maintenance steps.',
    },
    {
      title: isAr ? 'شرح خوارزمية' : 'Explain Algorithm',
      prompt: isAr ? 'اشرح طريقة عمل خوارزمية البحث الثنائي (Binary Search) مع كود تنفيذي بـ Rust.' : 'Explain Binary Search with an optimized implementation in Rust.',
    },
  ];

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden select-text ${
        isDark ? 'bg-[#0e0f12] text-[#EDEDED]' : 'bg-[#F6F8F3] text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Antigravity Local Top Bar */}
      <div
        className={`px-5 py-3.5 border-b shrink-0 flex items-center justify-between gap-4 transition-colors ${
          isDark ? 'border-[#262930] bg-[#16181d]/80 backdrop-blur-md' : 'border-slate-200 bg-white/80 backdrop-blur-md'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cpu className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-[#0e0f12]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">
                {isAr ? 'الشات بوت المحلي (Antigravity Local AI)' : 'Antigravity Local AI Chatbot'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                100% Offline
              </span>
            </div>
            <p className="text-[11px] text-[#8F95A0] mt-0.5 flex items-center gap-1.5 font-mono">
              <span>{status?.server_type === 'ollama' ? 'Ollama Server (127.0.0.1:11434)' : status?.server_type === 'lmstudio' ? 'LM Studio (127.0.0.1:1234)' : 'Antigravity Rust Engine (Embedded)'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{status?.message || 'جاهز للاستخدام'}</span>
            </p>
          </div>
        </div>

        {/* Model Selector & Actions */}
        <div className="flex items-center gap-2">
          {/* Local Model Dropdown */}
          <div className="relative flex items-center">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={`text-xs font-mono px-3 py-1.5 rounded-xl border appearance-none pe-7 cursor-pointer outline-none transition-all ${
                isDark
                  ? 'bg-[#1e2026] border-[#2a2d36] text-[#EDEDED] hover:border-[#8ab4f8]/50'
                  : 'bg-white border-slate-300 text-slate-800 hover:border-blue-500'
              }`}
            >
              {(status?.models && status.models.length > 0 ? status.models : [
                { id: 'antigravity-rust-core', name: 'Antigravity Rust Core (Offline)' },
                { id: 'antigravity-code-expert', name: 'Antigravity Code Expert (Offline)' },
                { id: 'llama3.2', name: 'Ollama: Llama 3.2' },
                { id: 'mistral', name: 'Ollama: Mistral' },
                { id: 'deepseek-r1', name: 'Ollama: DeepSeek R1' },
              ]).map((m) => (
                <option key={m.id} value={m.id} className={isDark ? 'bg-[#16181d] text-white' : 'bg-white text-black'}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={refreshStatus}
            disabled={isCheckingStatus}
            className={`p-2 rounded-xl border transition-colors ${
              isDark ? 'border-[#262930] hover:bg-white/10 text-[#8F95A0] hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
            title={isAr ? 'فحص خوادم الذكاء الاصطناعي المحلية' : 'Refresh local server probe'}
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={exportChat}
            disabled={messages.length === 0}
            className={`p-2 rounded-xl border transition-colors ${
              isDark ? 'border-[#262930] hover:bg-white/10 text-[#8F95A0] hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
            title={isAr ? 'تصدير المحادثة بتنسيق Markdown' : 'Export conversation as Markdown'}
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className={`p-2 rounded-xl border transition-colors ${
              isDark ? 'border-[#262930] hover:bg-rose-500/10 text-[#8F95A0] hover:text-rose-400' : 'border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
            }`}
            title={isAr ? 'مسح المحادثة' : 'Clear chat'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3.5 ${isUser ? (isAr ? 'flex-row' : 'flex-row-reverse') : (isAr ? 'flex-row' : 'flex-row')}`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {isUser ? (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      U
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-[#1e2026] border border-[#2a2d36] flex items-center justify-center text-emerald-400 shadow-sm">
                      <Cpu className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Content Box */}
                <div className={`flex-1 max-w-[85%] space-y-1.5`}>
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? isDark
                          ? 'bg-[#1e2026] border border-[#2a2d36] text-[#EDEDED]'
                          : 'bg-blue-600 text-white'
                        : isDark
                        ? 'bg-[#16181d] border border-[#262930] text-[#EDEDED]'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="prose prose-invert max-w-none text-xs sm:text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            return !inline ? (
                              <div className="relative group/code my-3 rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0c]">
                                <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/5 border-b border-white/5 text-[11px] font-mono text-[#8F95A0]">
                                  <span>{match ? match[1] : 'code'}</span>
                                  <button
                                    onClick={() => copyText(codeString, codeString)}
                                    className="flex items-center gap-1 hover:text-white transition-colors"
                                  >
                                    {copiedId === codeString ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedId === codeString ? 'تم النسخ' : 'نسخ'}</span>
                                  </button>
                                </div>
                                <pre className="p-3.5 overflow-x-auto text-[12px] font-mono leading-relaxed text-[#EDEDED]">
                                  <code>{codeString}</code>
                                </pre>
                              </div>
                            ) : (
                              <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-mono text-xs border border-white/5" {...props}>
                                {children}
                              </code>
                            );
                          },
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#8ab4f8] hover:underline inline-flex items-center gap-0.5"
                            >
                              {children}
                              <ExternalLink className="w-3 h-3 inline ms-0.5" />
                            </a>
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  {!isUser && (
                    <div className="flex items-center gap-3 px-1 text-[10px] font-mono text-[#8F95A0]">
                      {m.modelUsed && <span>⚡ {m.modelUsed}</span>}
                      {m.latencyMs !== undefined && <span>• {m.latencyMs}ms</span>}
                      <span>• {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        onClick={() => copyText(m.id, m.content)}
                        className="hover:text-white transition-colors flex items-center gap-1 ms-auto"
                      >
                        {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === m.id ? 'تم النسخ' : 'نسخ الإجابة'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#1e2026] border border-[#2a2d36] flex items-center justify-center text-emerald-400 shadow-sm animate-pulse">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-[#16181d] border border-[#262930] flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-xs text-[#8F95A0] font-mono">
                  {isAr ? 'جاري المعالجة محلياً عبر عتاد الجهاز...' : 'Processing offline on local hardware...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Floating Antigravity Prompt Capsule */}
      <div className="px-4 sm:px-8 pb-5 pt-2 shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Quick Starter Chips */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => setInput(qp.prompt)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                    isDark
                      ? 'bg-[#16181d] hover:bg-[#1e2026] border-[#262930] hover:border-[#8ab4f8]/50 text-[#8F95A0] hover:text-[#EDEDED]'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>{qp.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Capsule Prompt Box */}
          <div
            className={`p-2.5 rounded-3xl border transition-all shadow-xl ${
              isDark
                ? 'bg-[#16181d] border-[#2a2d36] focus-within:border-emerald-500/50 shadow-black/40'
                : 'bg-white border-slate-300 focus-within:border-emerald-600 shadow-slate-200'
            }`}
          >
            <div className="flex items-end gap-2 px-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isAr
                    ? 'اكتب رسالتك للشات بوت المحلي (Enter للإرسال، Shift+Enter لسطر جديد)...'
                    : 'Ask Antigravity Local AI anything offline (Enter to send)...'
                }
                rows={1}
                className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm py-2 px-1 max-h-40 leading-relaxed placeholder:text-[#8F95A0]/60"
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className={`p-2.5 rounded-2xl flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                  input.trim() && !isGenerating
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-[#8F95A0]/40 cursor-not-allowed'
                }`}
                title={isAr ? 'إرسال' : 'Send'}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subtext */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#8F95A0] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isAr
                ? 'معالجة آمنة محلية 100% عبر عتاد حاسوبك • لا يتم إرسال أي بايت عبر الإنترنت'
                : '100% Local On-Device Execution • Zero internet data transfer'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
