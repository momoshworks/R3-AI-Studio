import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  User,
  Copy,
  Check,
  FileCode,
  FileText,
  File,
  Image as ImageIcon,
  Bot,
  Download,
  Printer,
  Volume2,
  VolumeX,
  FileDown,
  Sparkles,
  Maximize2,
  Save,
  ExternalLink,
  X,
  MoreHorizontal,
  Key,
  ClipboardPaste,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { AttachedFile, ChatMessage } from '../types';
import { exportTextOrHtmlToPDF, downloadPDFDirectly } from '../utils/pdfExport';
import { Translations, Theme, Language } from '../utils/translations';
import { MermaidChart } from './MermaidChart';

interface ChatCanvasProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  selectedModel?: string;
  onOpenSettings?: () => void;
  onSwitchModel?: (modelId: string) => void;
  onPromptSelect?: (prompt: string) => void;
  t: Translations;
  theme: Theme;
  lang: Language;
}

// Helpers for Bi-directional (RTL/LTR) auto detection
const hasArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text);

const getTextFromChildren = (children: any): string => {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getTextFromChildren).join('');
  if (typeof children === 'object' && children.props && children.props.children) {
    return getTextFromChildren(children.props.children);
  }
  return '';
};


const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const cleanFileName = (name: string): string => {
  if (!name) return '';
  return name.replace(/\.pdf\.pdf$/i, '.pdf').replace(/(\.\w{2,5})\1$/i, '$1');
};

export const ChatCanvas: React.FC<ChatCanvasProps> = ({
  messages,
  selectedModel = 'Google Gemini (gemini-2.5-flash)',
  onSwitchModel,
  onPromptSelect,
  t,
  theme,
  lang,
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [openMenuMsgId, setOpenMenuMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [savingMediaUrl, setSavingMediaUrl] = useState<string | null>(null);
  const [savedMediaUrls, setSavedMediaUrls] = useState<string[]>([]);
  const [inlineKey, setInlineKey] = useState('');
  const [isSavingInlineKey, setIsSavingInlineKey] = useState(false);
  const [inlineKeyStatus, setInlineKeyStatus] = useState<string | null>(null);

  const handlePasteInlineKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInlineKey(text.trim());
    } catch {
      // Fallback
    }
  };

  const handleSaveInlineKey = async () => {
    if (!inlineKey.trim()) return;
    setIsSavingInlineKey(true);
    setInlineKeyStatus(null);
    try {
      const res = await api.verifyApiKey(inlineKey.trim());
      if (res.valid) {
        setInlineKeyStatus('success');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setInlineKeyStatus(res.message || (lang === 'ar' ? 'المفتاح غير صالح أو لم يتم تفعيل Gemini API له' : 'Invalid API key or Gemini API not enabled'));
      }
    } catch (e: any) {
      setInlineKeyStatus(e.message || (lang === 'ar' ? 'تعذر التحقق من المفتاح' : 'Failed to verify key'));
    } finally {
      setIsSavingInlineKey(false);
    }
  };

  const handleSaveToVault = async (url: string, title?: string) => {
    setSavingMediaUrl(url);
    try {
      await api.saveMediaFromUrl(url, title || 'Gemini_Media');
      setSavedMediaUrls((prev) => [...prev, url]);
    } catch (err) {
      console.error('Failed to save to vault:', err);
    } finally {
      setSavingMediaUrl(null);
    }
  };

  const isDark = theme === 'dark';
  const isChatGpt = selectedModel.toLowerCase().includes('gpt') || selectedModel.toLowerCase().includes('o3');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const copyMessageContent = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const toggleSpeech = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'ar' ? 'المتصفح لا يدعم القراءة الصوتية' : 'Speech synthesis not supported in this browser');
      return;
    }

    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`~>\[\]]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = hasArabic(cleanText) ? 'ar-SA' : 'en-US';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  const exportAsFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDirectPdfDownload = async (content: string, id: string, title?: string) => {
    setDownloadingPdfId(id);
    try {
      await downloadPDFDirectly(content, {
        title: title || 'Nerdo AI Report',
        modelName: selectedModel,
      });
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const renderAttachmentIcon = (att: AttachedFile) => {
    if (att.is_image) return <ImageIcon className="w-3.5 h-3.5 text-pink-400" />;
    if (att.type.includes('json') || att.name.endsWith('.py') || att.name.endsWith('.js') || att.name.endsWith('.ts')) {
      return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
    }
    if (att.type.includes('pdf') || att.type.includes('text') || att.name.endsWith('.csv')) {
      return <FileText className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <File className="w-3.5 h-3.5 text-gray-400" />;
  };

  const getFullChatHtml = () => {
    return messages
      .map((m) => {
        const isU = m.role === 'user';
        const sender = isU
          ? lang === 'ar'
            ? 'المستخدم'
            : 'User'
          : `R3 AI (${selectedModel})`;
        return `
          <div style="margin-bottom: 20px; padding: 14px; border-radius: 8px; background: ${isU ? '#f8fafc' : '#ffffff'}; border: 1px solid #e2e8f0;">
            <div style="font-weight: bold; font-size: 12px; color: ${isU ? '#2563eb' : '#d97706'}; margin-bottom: 8px;">
              ${sender}
            </div>
            <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.6;">
              ${m.content}
            </div>
          </div>
        `;
      })
      .join('');
  };

  const exportFullChatPDF = () => {
    if (messages.length === 0) return;
    exportTextOrHtmlToPDF(getFullChatHtml(), {
      title: lang === 'ar' ? 'تقرير محادثة R3 AI الكامل' : 'R3 AI Full Session Report',
      modelName: selectedModel,
    });
  };

  const downloadFullChatPDF = async () => {
    if (messages.length === 0) return;
    await handleDirectPdfDownload(
      getFullChatHtml(),
      'full-chat',
      lang === 'ar' ? 'سجل محادثة R3 AI' : 'R3 AI Chat Log'
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-2.5 sm:px-6 md:px-12 py-3 sm:py-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
      {/* Top Action Bar when messages exist (Responsive Single-Line) */}
      {messages.length > 0 && (
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-white/10 select-none text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="hidden sm:inline text-gray-400 font-medium">
              {lang === 'ar' ? 'جلسة المحادثة الحالية' : 'Current Chat Session'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-blue-400 truncate max-w-[130px] sm:max-w-[200px]">
              {selectedModel.replace(/^Google\s+/i, '').replace(/^OpenAI\s+/i, '').replace(/\(.*\)/, '').trim()}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={downloadFullChatPDF}
              title={lang === 'ar' ? 'تحميل سجل الجلسة بالكامل PDF' : 'Download full chat PDF'}
              className="px-2 py-1 rounded-lg text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors text-[11px] flex items-center gap-1 border border-white/10"
            >
              <Download className="w-3 h-3 text-blue-400" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'تحميل الجلسة PDF' : 'Export PDF'}</span>
              <span className="sm:hidden font-mono text-[10px]">PDF</span>
            </button>
            <button
              onClick={exportFullChatPDF}
              title={lang === 'ar' ? 'طباعة / تصدير الجلسة' : 'Print / Export Session'}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
            >
              <Printer className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Welcome Screen when Empty */}
      {messages.length === 0 && (
        <div className="min-h-[58vh] flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden select-none py-8">
          {/* Claude AI Inspired Warm Refined Ambient Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0">
            <div className="w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-blue-500/10 blur-3xl animate-claude-ambient" />
          </div>

          {/* App Logo Badge with Refined Glow */}
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-purple-900/20 ring-1 ring-white/20 relative z-10 transition-transform hover:scale-105 duration-300">
            <img src="/app-icon.png" alt="R3" className="w-full h-full object-cover" />
          </div>

          {/* Claude AI Editorial Greeting Title */}
          <div className="relative z-10 space-y-1">
            <h2 className="flex flex-col items-center justify-center">
              <span
                className="text-lg md:text-xl font-medium tracking-wide text-amber-200/90 font-serif"
              >
                {lang === 'ar' ? 'مرحباً بك في' : 'Welcome to'}
              </span>
              <span
                className="text-4xl md:text-6xl font-semibold font-claude-serif text-claude-gradient tracking-tight mt-1 select-none"
              >
                Nerdo AI Studio
              </span>
            </h2>
            <p
              className={`mt-2 max-w-md text-xs md:text-sm leading-relaxed ${
                isDark ? 'text-gray-400' : 'text-slate-600'
              }`}
              dir="auto"
            >
              {t.welcomeDesc}
            </p>
          </div>

          {/* Interactive Quick Prompts Section */}
          <div className="w-full max-w-xl space-y-2 pt-2">
            <div
              className={`text-[11px] font-semibold opacity-60 uppercase tracking-wider ${
                lang === 'ar' ? 'text-right' : 'text-left'
              }`}
            >
              {t.quickPromptsTitle}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  text: t.chipReport,
                  icon: '📝',
                  prompt:
                    lang === 'ar'
                      ? 'اكتب تقريراً تحليلياً مفصلاً ومنسقاً بصيغة تقرير احترافي جاهز للتحميل كـ PDF عن: '
                      : 'Write a comprehensive analytical report formatted for PDF export about: ',
                },
                {
                  text: t.chipCode,
                  icon: '💻',
                  prompt:
                    lang === 'ar'
                      ? 'قم بفحص وتحسين الكود البرمجي التالي وشرح أفضل الممارسات: '
                      : 'Review and optimize this code snippet with best practices: ',
                },
                {
                  text: t.chipDesign,
                  icon: '🎨',
                  prompt:
                    lang === 'ar'
                      ? 'اقترح تخطيطاً وتوزيع عناصر لواجهة مستخدم (UI/UX) حديثة مع ألوان عصرية: '
                      : 'Suggest a modern UI/UX layout concept with color palettes for: ',
                },
                {
                  text: t.chipPdf,
                  icon: '📊',
                  prompt:
                    lang === 'ar'
                      ? 'لخص النقاط الجوهرية والقرارات الأساسية في موضوع: '
                      : 'Summarize the core takeaways and action items regarding: ',
                },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onPromptSelect && onPromptSelect(chip.prompt)}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 shadow-sm hover:scale-[1.01] active:scale-[0.99] ${
                    isDark
                      ? 'bg-[#18191c]/80 hover:bg-[#222428] border-gemini-border/70 hover:border-blue-500/40 text-gray-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-800'
                  }`}
                >
                  <span className="text-base shrink-0">{chip.icon}</span>
                  <span className="text-xs font-medium leading-relaxed">{chip.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const msgArabic = hasArabic(msg.content);

        return (
          <div key={msg.id || index} className="space-y-3">
            <div className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              {isUser ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <User className="w-4 h-4" />
                </div>
              ) : (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                    isChatGpt
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-emerald-600/20'
                      : 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-blue-500/20'
                  }`}
                >
                  {isChatGpt ? <Bot className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
              )}

              {/* Message Content Bubble */}
              <div
                className={`flex-1 min-w-0 ${
                  isUser
                    ? 'flex justify-end'
                    : 'flex justify-start'
                }`}
              >
                {isUser ? (
                  <div
                    className={`max-w-[85%] rounded-3xl px-5 py-3.5 text-sm md:text-base leading-relaxed shadow-sm font-sans ${
                      isDark ? 'bg-[#282a2c] text-white' : 'bg-blue-600 text-white'
                    }`}
                    dir={msgArabic ? 'rtl' : 'ltr'}
                    style={{ unicodeBidi: 'plaintext' }}
                  >
                    {/* Render Attached Files with details and status */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 mb-3 pb-2.5 border-b border-white/15">
                        {msg.attachments.map((att) => {
                          const isPdf = att.type.includes('pdf') || att.name.toLowerCase().endsWith('.pdf');
                          return (
                            <div
                              key={att.id}
                              className="flex items-center gap-2.5 p-2 px-3 rounded-2xl bg-black/35 border border-white/10 shadow-sm backdrop-blur-md"
                            >
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isPdf
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {renderAttachmentIcon(att)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-gray-100 truncate max-w-[180px]">
                                  {cleanFileName(att.name)}
                                </div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1.5 font-mono mt-0.5">
                                  <span>{formatBytes(att.size)}</span>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-medium">
                                    {lang === 'ar' ? 'تمت القراءة بنجاح ✓' : 'Indexed ✓'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ) : (
                  <div className="w-full space-y-3">
                    <div
                      className={`text-[13px] md:text-[14px] leading-relaxed select-text ${
                        isDark ? 'text-gray-100' : 'text-slate-800'
                      }`}
                      dir={msgArabic ? 'rtl' : 'ltr'}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            return (
                              <p
                                dir={isAr ? 'rtl' : 'ltr'}
                                className={`my-2 leading-[1.68] font-normal text-[13px] md:text-[14px] ${
                                  isDark ? 'text-slate-200' : 'text-slate-800'
                                } ${isAr ? 'text-right' : 'text-left'}`}
                                style={{ unicodeBidi: 'plaintext' }}
                              >
                                {children}
                              </p>
                            );
                          },
                          strong({ children }) {
                            const text = getTextFromChildren(children);
                            const isEnglishOnly = /^[A-Za-z0-9_\-\.\s\(\)]+$/.test(text.trim());
                            return (
                              <strong
                                dir={isEnglishOnly ? 'ltr' : undefined}
                                className={`font-bold px-1.5 py-0.5 rounded shadow-sm inline-block my-0.5 ${
                                  isDark
                                    ? 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
                                    : 'text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A]'
                                }`}
                                style={{ unicodeBidi: 'isolate' }}
                              >
                                {children}
                              </strong>
                            );
                          },
                          h1({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            return (
                              <h1
                                dir={isAr ? 'rtl' : 'ltr'}
                                className={`text-base md:text-lg font-bold mt-4 mb-2 text-sky-400 pb-1.5 border-b border-white/10 ${isAr ? 'text-right' : 'text-left'}`}
                              >
                                {children}
                              </h1>
                            );
                          },
                          h2({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            let icon = '📌';
                            let cardClass = isDark ? 'border-s-4 border-s-blue-500 bg-[#0e131f]/80' : 'border-s-4 border-s-blue-600 bg-blue-50/70 border border-blue-200/60';

                            if (text.includes('الفكرة') || text.toLowerCase().includes('core idea')) {
                              icon = '🎯';
                              cardClass = 'border-s-4 border-s-sky-400 bg-sky-950/20';
                            } else if (text.includes('تشبيه') || text.toLowerCase().includes('analogy')) {
                              icon = '💡';
                              cardClass = 'border-s-4 border-s-amber-400 bg-amber-950/20';
                            } else if (text.includes('لماذا') || text.toLowerCase().includes('the why')) {
                              icon = '🚀';
                              cardClass = 'border-s-4 border-s-purple-400 bg-purple-950/20';
                            } else if (text.includes('مثال') || text.toLowerCase().includes('working example') || text.includes('كود')) {
                              icon = '💻';
                              cardClass = 'border-s-4 border-s-indigo-400 bg-indigo-950/20';
                            } else if (text.includes('خطأ') || text.toLowerCase().includes('pitfall') || text.includes('تحذير')) {
                              icon = '⚠️';
                              cardClass = 'border-s-4 border-s-rose-400 bg-rose-950/20';
                            }

                            return (
                              <div className={`p-2 my-2 rounded-lg border border-white/10 ${cardClass} shadow-md backdrop-blur-md`}>
                                <h2
                                  dir={isAr ? 'rtl' : 'ltr'}
                                  className={`text-[13.5px] md:text-sm font-bold text-gray-100 flex items-center gap-2 ${
                                    isAr ? 'text-right' : 'text-left'
                                  }`}
                                >
                                  <span className="text-base select-none">{icon}</span>
                                  <span className="flex-1">{children}</span>
                                </h2>
                              </div>
                            );
                          },
                          h3({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            let icon = '🔹';
                            let cardClass = 'border-s-4 border-s-blue-400 bg-[#0e131f]/70';

                            if (text.includes('الفكرة') || text.toLowerCase().includes('core idea')) {
                              icon = '🎯';
                              cardClass = 'border-s-4 border-s-sky-400 bg-sky-950/20';
                            } else if (text.includes('تشبيه') || text.toLowerCase().includes('analogy')) {
                              icon = '💡';
                              cardClass = 'border-s-4 border-s-amber-400 bg-amber-950/20';
                            } else if (text.includes('لماذا') || text.toLowerCase().includes('the why')) {
                              icon = '🚀';
                              cardClass = 'border-s-4 border-s-purple-400 bg-purple-950/20';
                            } else if (text.includes('مثال') || text.toLowerCase().includes('working example') || text.includes('كود')) {
                              icon = '💻';
                              cardClass = 'border-s-4 border-s-indigo-400 bg-indigo-950/20';
                            } else if (text.includes('خطأ') || text.toLowerCase().includes('pitfall') || text.includes('تحذير')) {
                              icon = '⚠️';
                              cardClass = 'border-s-4 border-s-rose-400 bg-rose-950/20';
                            }

                            return (
                              <div className={`p-3 my-3 rounded-2xl border border-white/10 ${cardClass} shadow-sm backdrop-blur-md`}>
                                <h3
                                  dir={isAr ? 'rtl' : 'ltr'}
                                  className={`text-sm font-bold text-gray-100 flex items-center gap-2 ${
                                    isAr ? 'text-right' : 'text-left'
                                  }`}
                                >
                                  <span className="text-sm select-none">{icon}</span>
                                  <span className="flex-1">{children}</span>
                                </h3>
                              </div>
                            );
                          },
                          ul({ children }) {
                            return (
                              <ul
                                className={`list-disc ps-5 my-2 space-y-1.5 leading-[1.68] text-[13px] md:text-[14px] ${
                                  isDark ? 'text-slate-200' : 'text-slate-800'
                                }`}
                              >
                                {children}
                              </ul>
                            );
                          },
                          ol({ children }) {
                            return (
                              <ol
                                className={`list-decimal ps-5 my-2 space-y-1.5 leading-[1.68] text-[13px] md:text-[14px] ${
                                  isDark ? 'text-slate-200' : 'text-slate-800'
                                }`}
                              >
                                {children}
                              </ol>
                            );
                          },
                          li({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            return (
                              <li
                                dir={isAr ? 'rtl' : 'ltr'}
                                className={`my-0.5 leading-[1.68] ${
                                  isDark ? 'text-slate-200' : 'text-slate-800'
                                }`}
                                style={{ unicodeBidi: 'plaintext' }}
                              >
                                {children}
                              </li>
                            );
                          },
                          blockquote({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            return (
                              <blockquote
                                dir={isAr ? 'rtl' : 'ltr'}
                                className={`my-2.5 border-s-4 p-3 rounded-e-xl text-xs md:text-[13px] leading-[1.68] shadow-md backdrop-blur-md ${
                                  isDark
                                    ? 'border-amber-400 bg-amber-950/20 text-amber-200'
                                    : 'border-amber-500 bg-amber-50/90 text-amber-950 border border-amber-200/60'
                                }`}
                                style={{ unicodeBidi: 'plaintext' }}
                              >
                                <span
                                  className={`block font-bold text-xs mb-1 ${
                                    isDark ? 'text-amber-400' : 'text-amber-800'
                                  }`}
                                >
                                  💡 فكرة جوهرية:
                                </span>
                                {children}
                              </blockquote>
                            );
                          },
                          code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeContent = String(children).replace(/\n$/, '');
                            const codeId = `${msg.id}-${codeContent.slice(0, 15)}`;

                            if (!inline && match) {
                              const codeLang = match[1].toLowerCase();
                              if (codeLang === 'mermaid') {
                                return (
                                  <MermaidChart
                                    chart={codeContent}
                                    isDark={isDark}
                                    lang={lang}
                                  />
                                );
                              }
                              return (
                                <div
                                  dir="ltr"
                                  className="my-4 rounded-xl overflow-hidden border border-gemini-border bg-[#18191a] shadow-lg text-left code-ltr"
                                >
                                  <div className="px-4 py-2 bg-[#202124] flex items-center justify-between border-b border-gemini-border text-xs text-gray-400 font-mono">
                                    <span className="flex items-center gap-1.5 text-gray-300">
                                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                                      {codeLang}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => copyToClipboard(codeContent, codeId)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/10 text-gray-300 transition-colors text-[11px]"
                                      >
                                        {copiedCodeId === codeId ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400">{t.copied}</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>{t.copy}</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <pre
                                    dir="ltr"
                                    className="p-4 overflow-x-auto text-xs font-mono text-gray-200 leading-normal text-left"
                                  >
                                    <code dir="ltr" className="text-left font-mono">{codeContent}</code>
                                  </pre>
                                </div>
                              );
                            }
                            return (
                              <code
                                dir="ltr"
                                className={`px-1.5 py-0.5 rounded text-xs font-mono inline-block border ${
                                  isDark
                                    ? 'bg-[#2a2b2e] text-blue-300 border-white/10'
                                    : 'bg-slate-100 text-blue-700 border-slate-300'
                                }`}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          img({ src, alt }: any) {
                            if (!src) return null;
                            const isSaved = savedMediaUrls.includes(src);
                            const isSaving = savingMediaUrl === src;
                            return (
                              <div className="my-3 rounded-2xl overflow-hidden border border-gemini-border bg-black/40 group relative shadow-2xl max-w-lg transition-all hover:border-purple-500/40">
                                <img
                                  src={src}
                                  alt={alt || 'Gemini Media'}
                                  className="w-full max-h-[420px] object-contain rounded-xl cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
                                  onClick={() => setLightboxUrl(src)}
                                  loading="lazy"
                                />
                                <div className="absolute top-2.5 end-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-xs shadow-lg">
                                  <button
                                    onClick={() => setLightboxUrl(src)}
                                    className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                                    title={lang === 'ar' ? 'معاينة وتكبير' : 'Full Preview'}
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleSaveToVault(src, alt)}
                                    disabled={isSaving || isSaved}
                                    className={`p-1 rounded-lg transition-colors ${
                                      isSaved
                                        ? 'text-emerald-400 bg-emerald-500/20'
                                        : 'hover:bg-white/20 text-purple-300'
                                    }`}
                                    title={lang === 'ar' ? 'حفظ في استوديو الوسائط' : 'Save to Media Vault'}
                                  >
                                    {isSaving ? (
                                      <span className="text-[10px] animate-pulse">...</span>
                                    ) : isSaved ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : (
                                      <Save className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <a
                                    href={src}
                                    download={alt || 'media'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded-lg hover:bg-white/20 text-blue-400 transition-colors"
                                    title={lang === 'ar' ? 'تحميل مباشر' : 'Download'}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                                {alt && (
                                  <div className="px-3 py-1.5 text-[11px] text-gray-400 font-mono truncate border-t border-white/5 bg-[#17181a]">
                                    {alt}
                                  </div>
                                )}
                              </div>
                            );
                          },
                          a({ href, children }: any) {
                            if (!href) return <span>{children}</span>;
                            const isVideo = /\.(mp4|webm|ogg|mov)($|\?)/i.test(href);
                            const isAudio = /\.(mp3|wav|ogg|m4a|aac)($|\?)/i.test(href);
                            if (isVideo) {
                              return (
                                <div className="my-3 rounded-2xl overflow-hidden border border-gemini-border bg-black/50 p-2 max-w-lg shadow-xl">
                                  <video controls src={href} className="w-full rounded-xl max-h-72" />
                                  <div className="mt-1 px-1 flex items-center justify-between text-[11px] text-gray-400">
                                    <span className="truncate">{children || 'Video'}</span>
                                    <a
                                      href={href}
                                      download
                                      className="text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                      <Download className="w-3 h-3" />
                                      {lang === 'ar' ? 'تحميل' : 'Download'}
                                    </a>
                                  </div>
                                </div>
                              );
                            }
                            if (isAudio) {
                              return (
                                <div className="my-2 p-2.5 rounded-xl border border-gemini-border bg-[#18191a] max-w-md shadow-md">
                                  <audio controls src={href} className="w-full" />
                                </div>
                              );
                            }
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 inline-flex items-center gap-0.5 font-medium transition-colors"
                              >
                                <span>{children}</span>
                                <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-70" />
                              </a>
                            );
                          },
                          table({ children }: any) {
                            return (
                              <div className="my-4 rounded-xl border border-gemini-border overflow-x-auto shadow-md">
                                <table className="w-full text-xs text-left border-collapse">
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          thead({ children }: any) {
                            return (
                              <thead className="bg-[#202124] text-gray-200 border-b border-gemini-border font-semibold">
                                {children}
                              </thead>
                            );
                          },
                          tbody({ children }: any) {
                            return (
                              <tbody className="divide-y divide-gemini-border/60 bg-[#161719] text-gray-300">
                                {children}
                              </tbody>
                            );
                          },
                          tr({ children }: any) {
                            return <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>;
                          },
                          th({ children }: any) {
                            return <th className="px-3.5 py-2 text-left font-medium">{children}</th>;
                          },
                          td({ children }: any) {
                            return <td className="px-3.5 py-2 text-left">{children}</td>;
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Quota Exhaustion Helper Card */}
                    {onSwitchModel &&
                      (msg.content.includes('رصيد حساب OpenAI منتهي') ||
                        msg.content.includes('credits remaining') ||
                        msg.content.includes('Insufficient Quota') ||
                        msg.content.includes('نفاد رصيد')) && (
                        <div
                          className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-right"
                          dir="rtl"
                        >
                          <div className="text-xs text-blue-200">
                            💡 <strong>نصيحة:</strong> رصيد ChatGPT منتهٍ، يمكنك المتابعة فوراً مع <strong>Google Gemini</strong> مجاناً وبأعلى سرعة.
                          </div>
                          <button
                            onClick={() => onSwitchModel('Google Gemini (gemini-3.5-flash)')}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all shrink-0 active:scale-95"
                          >
                            التبديل إلى Google Gemini الآن
                          </button>
                        </div>
                      )}

                    {/* Inline API Key Activator when Gemini key is missing */}
                    {msg.content.includes('Google Gemini API') && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/30 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                              <Key className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-xs text-purple-300">
                                {lang === 'ar' ? 'تفعيل مفتاح Google Gemini في 10 ثوانٍ' : 'Activate Google Gemini API in 10 Seconds'}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {lang === 'ar' ? 'مجاني 100% وبدون أي بطاقة بنكية' : '100% Free, no credit card required'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>{lang === 'ar' ? 'محفوظ على جهازك فقط' : 'Local Storage Only'}</span>
                          </span>
                        </div>

                        {/* Privacy Guarantee Note */}
                        <div className="text-[11px] text-gray-300 bg-white/5 p-2 rounded-xl border border-white/5 leading-relaxed">
                          🛡️ <strong>{lang === 'ar' ? 'حماية وأمان كامل:' : 'Complete Privacy:'}</strong> {lang === 'ar' ? 'مفتاحك يتم حفظه محلياً على جهازك الحالي فقط داخل الـ Local Storage ولا يمكن لأي خادم أو أي شخص آخر رؤيته أو استخدامه.' : 'Your key is saved locally in your browser/device storage only and is never shared.'}
                        </div>

                        {/* Step 1: Link to Google AI Studio */}
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 flex items-center justify-between transition-all text-xs font-medium group"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>1. {lang === 'ar' ? 'اضغط هنا لفتح صفحة إنشاء المفتاح المجاني (Google AI Studio)' : 'Open Free Google AI Studio API Keys'}</span>
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </a>

                        {/* Step 2: Paste and Activate */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] text-gray-400 font-medium">
                            2. {lang === 'ar' ? 'انسخ المفتاح والصقه هنا لتفعيله فوراً:' : 'Paste your key here and activate:'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="password"
                              dir="ltr"
                              placeholder="AIzaSy..."
                              value={inlineKey}
                              onChange={(e) => {
                                setInlineKey(e.target.value);
                                setInlineKeyStatus(null);
                              }}
                              className="flex-1 bg-[#131314] border border-gemini-border rounded-xl px-3 py-2 text-xs font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-purple-500 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={handlePasteInlineKey}
                              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10 text-xs flex items-center gap-1 transition-colors shrink-0"
                              title={lang === 'ar' ? 'لصق من الحافظة' : 'Paste from clipboard'}
                            >
                              <ClipboardPaste className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'لصق' : 'Paste'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveInlineKey}
                              disabled={isSavingInlineKey || !inlineKey.trim()}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-purple-600/25 transition-all shrink-0 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isSavingInlineKey ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                              )}
                              <span>{lang === 'ar' ? 'تفعيل فوراً' : 'Activate'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Status feedback */}
                        {inlineKeyStatus && (
                          <div
                            className={`p-2 rounded-xl text-xs flex items-center gap-2 ${
                              inlineKeyStatus === 'success'
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                : 'bg-red-500/15 border border-red-500/30 text-red-300'
                            }`}
                          >
                            {inlineKeyStatus === 'success' ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{lang === 'ar' ? 'تم التحقق وتفعيل المفتاح بنجاح! جاري التحديث...' : 'Key verified & saved! Reloading...'}</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                <span>{inlineKeyStatus}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar for Assistant Message: Copy, TTS, Markdown, PDF */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gemini-border/30 text-xs relative">
                      {/* Copy Text */}
                      <button
                        onClick={() => copyMessageContent(msg.content, msg.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-all text-[11px] bg-white/[0.04] border border-white/10 shadow-sm active:scale-95"
                        title={t.copy}
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">{t.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{t.copy}</span>
                          </>
                        )}
                      </button>

                      {/* Explain Like I'm 10 / بسّطهالي */}
                      <button
                        onClick={() => {
                          onPromptSelect?.(
                            lang === 'ar'
                              ? 'أعد شرح الرد السابق بأسلوب مبسط جداً لشخص ليس لديه أي خلفية تقنية، واستخدم تشبيهاً من الحياة اليومية ومثالاً بسيطاً من سطرين فقط.'
                              : 'Please re-explain the previous response in very simple terms for someone with no technical background, using a daily-life analogy and a minimal 2-line example.'
                          );
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all text-[11px] font-medium shadow-sm active:scale-95"
                        title={lang === 'ar' ? 'شرح مبسط للأطفال والمبتدئين بمثال واقعي' : "Explain Like I'm 10"}
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{lang === 'ar' ? 'بسّطهالي' : 'ELI5'}</span>
                      </button>

                      {/* Text-to-Speech (TTS Read Aloud) */}
                      <button
                        onClick={() => toggleSpeech(msg.content, msg.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-[11px] border shadow-sm active:scale-95 ${
                          speakingMsgId === msg.id
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse'
                            : 'hover:bg-white/5 text-gray-300 hover:text-white bg-white/[0.03] border-white/5'
                        }`}
                        title={speakingMsgId === msg.id ? t.stopReading : t.readAloud}
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="w-3 h-3 text-purple-400" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                        <span className="hidden sm:inline">{speakingMsgId === msg.id ? t.stopReading : t.readAloud}</span>
                      </button>

                      {/* Direct PDF Download */}
                      <button
                        onClick={() => handleDirectPdfDownload(msg.content, msg.id, 'Nerdo AI Report')}
                        disabled={downloadingPdfId === msg.id}
                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-all text-[11px] font-medium disabled:opacity-50 shadow-sm active:scale-95"
                        title={t.downloadPdf}
                      >
                        <Download className="w-3 h-3 text-red-400" />
                        <span>{downloadingPdfId === msg.id ? '...' : 'PDF'}</span>
                      </button>

                      {/* More Actions Dropdown Menu (...) */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuMsgId(openMenuMsgId === msg.id ? null : msg.id)}
                          className="p-1.5 rounded-xl hover:bg-white/15 text-gray-400 hover:text-gray-100 transition-all text-[11px] border border-white/10 bg-white/[0.04] shadow-sm active:scale-95"
                          title={lang === 'ar' ? 'المزيد من الخيارات' : 'More Options'}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {openMenuMsgId === msg.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenMenuMsgId(null)} />
                            <div
                              dir={lang === 'ar' ? 'rtl' : 'ltr'}
                              className={`absolute bottom-full mb-1.5 end-0 z-40 w-48 rounded-2xl shadow-2xl p-1.5 text-xs space-y-1 border animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${
                                isDark
                                  ? 'bg-[#1e1f20] border-gemini-border text-gray-200 shadow-black/80'
                                  : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/80'
                              }`}
                            >
                              {/* Direct PDF Download (Mobile only) */}
                              <button
                                onClick={() => {
                                  handleDirectPdfDownload(msg.content, msg.id, 'Nerdo AI Report');
                                  setOpenMenuMsgId(null);
                                }}
                                disabled={downloadingPdfId === msg.id}
                                className="sm:hidden w-full flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all active:scale-[0.98] hover:bg-white/10 text-left transition-colors text-[11px]"
                              >
                                <Download className="w-3.5 h-3.5 text-red-400" />
                                <span>{lang === 'ar' ? 'تحميل كملف PDF' : 'Download PDF'}</span>
                              </button>

                              {/* Export Markdown (.md) */}
                              <button
                                onClick={() => {
                                  exportAsFile(msg.content, `Nerdo_Response_${Date.now()}.md`, 'text/markdown');
                                  setOpenMenuMsgId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all active:scale-[0.98] hover:bg-white/10 text-left transition-colors text-[11px]"
                              >
                                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                                <span>{t.exportMarkdown} (.md)</span>
                              </button>

                              {/* Print PDF Preview */}
                              <button
                                onClick={() => {
                                  exportTextOrHtmlToPDF(msg.content, {
                                    title: 'Nerdo AI Report',
                                    modelName: selectedModel,
                                  });
                                  setOpenMenuMsgId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all active:scale-[0.98] hover:bg-white/10 text-left transition-colors text-[11px]"
                              >
                                <Printer className="w-3.5 h-3.5 text-purple-400" />
                                <span>{t.printPdf}</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {/* Media Lightbox Full-Screen Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-12 end-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
