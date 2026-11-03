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

export const ChatCanvas: React.FC<ChatCanvasProps> = ({
  messages,
  selectedModel = 'Google Gemini (gemini-3.5-flash)',
  onSwitchModel,
  onPromptSelect,
  t,
  theme,
  lang,
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [savingMediaUrl, setSavingMediaUrl] = useState<string | null>(null);
  const [savedMediaUrls, setSavedMediaUrls] = useState<string[]>([]);

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
        title: title || 'R3 AI Report',
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
    <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-8 max-w-4xl mx-auto w-full">
      {/* Top Action Bar when messages exist */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between pb-2 border-b border-gemini-border/40 select-none">
          <div className="text-xs text-gray-400 font-medium flex items-center gap-2">
            <span>{lang === 'ar' ? 'جلسة المحادثة الحالية' : 'Current Chat Session'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono">
              {selectedModel}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={downloadFullChatPDF}
              disabled={downloadingPdfId === 'full-chat'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title={t.downloadPdf}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPdfId === 'full-chat' ? '...' : t.downloadPdf}</span>
            </button>

            <button
              onClick={exportFullChatPDF}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs transition-colors"
              title={t.printPdf}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printPdf}</span>
            </button>
          </div>
        </div>
      )}

      {/* Welcome Screen when Empty */}
      {messages.length === 0 && (
        <div className="min-h-[58vh] flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden select-none py-8">
          {/* Faint Mystical Horror Skull Watermark in Background (مش واضحة وشبه شفافة) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0">
            {/* Ambient Crimson Fog Aura */}
            <div className="w-[420px] h-[420px] rounded-full bg-red-950/25 blur-3xl" />
            <svg
              className="w-80 h-80 text-red-900 animate-skull-pulse opacity-15"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.5"
            >
              {/* Stylized Sinister Skull Path */}
              <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.41 3.12 7.23.35.33.6.76.71 1.23l.42 1.8c.18.78.88 1.34 1.68 1.34h8.14c.8 0 1.5-.56 1.68-1.34l.42-1.8c.11-.47.36-.9.71-1.23C20.8 17.41 22 14.85 22 12c0-5.52-4.48-10-10-10zm-3.5 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.5 4c-.83 0-1.5-.67-1.5-1.5S11.17 14 12 14s1.5.67 1.5 1.5S12.83 17 12 17zm3.5-4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
              {/* Hollow Glowing Eye Sockets */}
              <circle cx="8.5" cy="11" r="1.8" fill="#131314" stroke="#8b0000" strokeWidth="0.8" />
              <circle cx="15.5" cy="11" r="1.8" fill="#131314" stroke="#8b0000" strokeWidth="0.8" />
              {/* Nasal Cavity */}
              <path d="M12 13.5l-.8 1.5h1.6z" fill="#8b0000" />
              {/* Teeth Gaps */}
              <path d="M8.5 20v2.5M10.5 20v2.5M12 20v2.5M13.5 20v2.5M15.5 20v2.5" stroke="#131314" strokeWidth="0.75" />
            </svg>
          </div>

          {/* App Logo Badge with Dark Crimson Rim Glow */}
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl shadow-red-900/40 ring-2 ring-red-700/30 relative z-10 transition-transform hover:scale-105 duration-300">
            <img src="/app-icon.png" alt="R3" className="w-full h-full object-cover" />
          </div>

          {/* Horror Bloody Greeting Title */}
          <div className="relative z-10 space-y-1.5">
            <h2 className="flex flex-col items-center justify-center">
              <span
                className="text-xl md:text-2xl font-bold tracking-widest text-red-400 font-serif"
                style={{
                  textShadow: '0 0 12px rgba(220, 20, 60, 0.7), 0 2px 4px rgba(0, 0, 0, 0.9)'
                }}
              >
                {lang === 'ar' ? 'مرحباً بك في' : 'Welcome to'}
              </span>
              <span
                className="text-4xl md:text-6xl font-black font-horror text-bloody tracking-wider mt-1 select-none"
                style={{
                  fontFamily: "'Nosifer', 'Creepster', 'Cairo', cursive"
                }}
              >
                R3 AI Studio
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
                    {/* Render Attached Files if any */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-white/20">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center space-x-1.5 px-2 py-1 rounded bg-black/20 text-xs text-white/90"
                          >
                            {renderAttachmentIcon(att)}
                            <span className="truncate max-w-[140px] font-mono text-[11px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ) : (
                  <div className="w-full space-y-3">
                    <div
                      className={`text-sm md:text-base leading-relaxed select-text ${
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
                                className={isAr ? 'text-right my-2 leading-relaxed' : 'text-left my-2 leading-relaxed'}
                              >
                                {children}
                              </p>
                            );
                          },
                          h1({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            return (
                              <h1
                                dir={isAr ? 'rtl' : 'ltr'}
                                className={`text-xl font-bold mt-4 mb-2 ${isAr ? 'text-right' : 'text-left'}`}
                              >
                                {children}
                              </h1>
                            );
                          },
                          h2({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            return (
                              <h2
                                dir={isAr ? 'rtl' : 'ltr'}
                                className={`text-lg font-bold mt-3 mb-1.5 ${isAr ? 'text-right' : 'text-left'}`}
                              >
                                {children}
                              </h2>
                            );
                          },
                          h3({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            return (
                              <h3
                                dir={isAr ? 'rtl' : 'ltr'}
                                className={`text-base font-bold mt-2 mb-1 ${isAr ? 'text-right' : 'text-left'}`}
                              >
                                {children}
                              </h3>
                            );
                          },
                          ul({ children }) {
                            return <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>;
                          },
                          ol({ children }) {
                            return <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>;
                          },
                          li({ children }) {
                            const text = getTextFromChildren(children);
                            const isAr = hasArabic(text);
                            return (
                              <li
                                dir={isAr ? 'rtl' : 'ltr'}
                                className={isAr ? 'text-right my-1' : 'text-left my-1'}
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
                                className={`my-3 p-3 bg-white/5 rounded-xl ${
                                  isAr
                                    ? 'border-r-4 border-blue-500 text-right'
                                    : 'border-l-4 border-blue-500 text-left'
                                }`}
                              >
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
                                className="bg-[#2a2b2e] px-1.5 py-0.5 rounded text-blue-300 text-xs font-mono inline-block"
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

                    {/* Action Bar for Assistant Message: Copy, TTS, Markdown, PDF */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gemini-border/30 text-xs">
                      {/* Copy Text */}
                      <button
                        onClick={() => copyMessageContent(msg.content, msg.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-[11px]"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{t.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t.copy}</span>
                          </>
                        )}
                      </button>

                      {/* Explain Like I'm 10 / بسّطهالي أكتر */}
                      <button
                        onClick={() => {
                          onPromptSelect?.(
                            lang === 'ar'
                              ? 'أعد شرح الرد السابق بأسلوب مبسط جداً لشخص ليس لديه أي خلفية تقنية، واستخدم تشبيهاً من الحياة اليومية ومثالاً بسيطاً من سطرين فقط.'
                              : 'Please re-explain the previous response in very simple terms for someone with no technical background, using a daily-life analogy and a minimal 2-line example.'
                          );
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 transition-all text-[11px] font-medium shadow-sm hover:scale-[1.02] active:scale-95"
                        title={lang === 'ar' ? 'شرح مبسط للأطفال والمبتدئين بمثال واقعي' : "Explain Like I'm 10"}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>{lang === 'ar' ? '👶 بسّطهالي أكتر' : 'ELI5 (Simplify)'}</span>
                      </button>

                      {/* Text-to-Speech (TTS Read Aloud) */}
                      <button
                        onClick={() => toggleSpeech(msg.content, msg.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                          speakingMsgId === msg.id
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse'
                            : 'hover:bg-white/5 text-gray-400 hover:text-gray-200'
                        }`}
                        title={speakingMsgId === msg.id ? t.stopReading : t.readAloud}
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>{speakingMsgId === msg.id ? t.stopReading : t.readAloud}</span>
                      </button>

                      {/* Export Markdown (.md) */}
                      <button
                        onClick={() =>
                          exportAsFile(msg.content, `R3_Response_${Date.now()}.md`, 'text/markdown')
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-[11px]"
                        title={t.exportMarkdown}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>.MD</span>
                      </button>

                      {/* Export Direct PDF */}
                      <button
                        onClick={() => handleDirectPdfDownload(msg.content, msg.id, 'R3 AI Report')}
                        disabled={downloadingPdfId === msg.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition-colors text-[11px] font-medium disabled:opacity-50"
                        title={t.downloadPdf}
                      >
                        <Download className="w-3.5 h-3.5 text-red-400" />
                        <span>{downloadingPdfId === msg.id ? '...' : t.downloadPdf}</span>
                      </button>

                      {/* Print PDF Preview */}
                      <button
                        onClick={() =>
                          exportTextOrHtmlToPDF(msg.content, {
                            title: 'R3 AI Report',
                            modelName: selectedModel,
                          })
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-[11px]"
                        title={t.printPdf}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t.printPdf}</span>
                      </button>
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
