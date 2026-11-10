import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Cpu,
  ShieldCheck,
  Send,
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
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ANTIGRAVITY_LOCAL_MODEL');
      if (saved && !saved.includes('rust-core')) return saved;
    } catch {}
    return 'momo1:latest';
  });

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem('ANTIGRAVITY_LOCAL_MODEL', modelId);
    } catch {}
  };
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
          ? '### مرحباً بك! أنا MOMO1، المساعد الذكي المحلي على جهازك\n\nأعمل بالكامل **على عتاد جهازك محلياً أوفلاين** بخصوصية تامة 100% وبدون الحاجة لأي اتصال بالإنترنت.\n\n* **خصوصية مطلقة:** لا يتم إرسال أي بايت أو كود خارج حاسوبك.\n* **سرعة فائقة:** استجابة سريعة ومعالجة للأكواد واستفسارات البرمجة مباشرة.\n* **النموذج النشط:** MOMO1 (يعمل بتقنيات Ollama و Rust محلياً).'
          : '### Welcome! I am MOMO1, your local AI assistant\n\nI run completely **on your local machine hardware offline** with 100% privacy and zero internet requirement.\n\n* **100% Private:** No telemetry or data leaves your device.\n* **Fast & Offline:** Instant responses and local code analysis.\n* **Active Model:** MOMO1 (Powered locally via Ollama & Rust).',
        timestamp: Date.now(),
        modelUsed: 'MOMO1',
        source: 'ollama',
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

  // Listen to Global Top Bar Actions for MOMO1
  useEffect(() => {
    const handleClear = () => clearChat();
    const handleExport = () => exportChat();
    const handleRefresh = () => refreshStatus();
    const handleModelChange = (e: any) => {
      if (e.detail) {
        handleSelectModel(e.detail);
      }
    };

    window.addEventListener('momo1:clear_chat', handleClear);
    window.addEventListener('momo1:export_chat', handleExport);
    window.addEventListener('momo1:refresh_status', handleRefresh);
    window.addEventListener('momo1:model_changed', handleModelChange);

    return () => {
      window.removeEventListener('momo1:clear_chat', handleClear);
      window.removeEventListener('momo1:export_chat', handleExport);
      window.removeEventListener('momo1:refresh_status', handleRefresh);
      window.removeEventListener('momo1:model_changed', handleModelChange);
    };
  }, [messages, selectedModel]);

  // Check Local LLM Status
  const refreshStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const s = await api.checkLocalLLMStatus();
      if (s) {
        setStatus(s);
        const saved = localStorage.getItem('ANTIGRAVITY_LOCAL_MODEL');
        const momoModel = s.models?.find((m: any) => m.id.toLowerCase().includes('momo') || m.id.toLowerCase().includes('qwen2.5:3b'));
        if (saved && !saved.includes('rust-core') && s.models?.some((m: any) => m.id === saved)) {
          setSelectedModel(saved);
        } else if (momoModel) {
          setSelectedModel(momoModel.id);
          try {
            localStorage.setItem('ANTIGRAVITY_LOCAL_MODEL', momoModel.id);
          } catch {}
        } else if (s.active_model) {
          setSelectedModel(s.active_model);
          try {
            localStorage.setItem('ANTIGRAVITY_LOCAL_MODEL', s.active_model);
          } catch {}
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
      className={`flex-1 flex flex-col h-full overflow-hidden select-text relative backdrop-blur-2xl ${
        isDark ? 'bg-transparent text-[#EDEDED]' : 'bg-transparent text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Messages Canvas - Edge-to-Edge Frosted Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-5">
        <div className="max-w-4xl mx-auto space-y-5">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${
                  isUser ? (isAr ? 'justify-start' : 'justify-end') : 'justify-start'
                }`}
              >
                {/* Assistant Avatar Only - User Avatar ('U') Removed Completely */}
                {!isUser && (
                  <div className="shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm backdrop-blur-md">
                      <Cpu className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Content Box */}
                <div className={`space-y-1.5 ${isUser ? 'max-w-[82%]' : 'flex-1 max-w-[88%]'}`}>
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? isDark
                          ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg shadow-blue-500/15 border border-white/15 backdrop-blur-md'
                          : 'bg-blue-600 text-white shadow-md'
                        : isDark
                        ? 'bg-[#121622]/80 border border-white/[0.08] text-[#EDEDED] shadow-xl backdrop-blur-md'
                        : 'bg-white/80 border border-slate-200 text-slate-800 shadow-sm backdrop-blur-md'
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

          {/* Capsule Prompt Box with Frosted Blur */}
          <div
            className={`p-2.5 rounded-3xl border transition-all shadow-2xl backdrop-blur-2xl ${
              isDark
                ? 'bg-[#121622]/80 border-white/[0.12] focus-within:border-emerald-500/50 shadow-black/40'
                : 'bg-white/80 border-slate-300 focus-within:border-emerald-600 shadow-slate-200'
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
                    ? 'اكتب رسالتك لـ MOMO1 (Enter للإرسال، Shift+Enter لسطر جديد)...'
                    : 'Ask MOMO1 anything offline (Enter to send)...'
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
                ? `MOMO1 يعمل محلياً 100% (${status?.active_model || selectedModel}) • ${isCheckingStatus ? 'جاري التحقق...' : 'معزول تماماً أوفلاين'}`
                : `MOMO1 On-Device 100% (${status?.active_model || selectedModel}) • ${isCheckingStatus ? 'Probing...' : 'Zero internet transfer'}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
