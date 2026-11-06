import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Paperclip,
  ArrowUp,
  Square,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Mic,
  MicOff,
  X,
  FileText,
  Image as ImageIcon,
  Code2,
} from 'lucide-react';

// ==========================================
// Types & Interfaces
// ==========================================
export interface ChatAttachment {
  id: string;
  name: string;
  size?: number;
  type?: string;
  url?: string;
  file?: File;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  attachments?: ChatAttachment[];
}

export interface GeminiChatInterfaceProps {
  messages?: ChatMessage[];
  onSendMessage?: (content: string, attachments?: ChatAttachment[]) => void | Promise<void>;
  onRegenerate?: (messageId: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  userName?: string;
  placeholder?: string;
  disclaimer?: string;
  className?: string;
}

// Helper: Auto-detect Arabic text for seamless RTL typography
const isArabicText = (text: string): boolean => {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
};

// ==========================================
// Official Gemini 4-Point Sparkle Icon
// ==========================================
export const GeminiSparkleIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-6 h-6',
  size = 24,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Gemini Sparkle"
  >
    <defs>
      <linearGradient id="geminiSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ea8de" />
        <stop offset="30%" stopColor="#48cae4" />
        <stop offset="65%" stopColor="#9b72cf" />
        <stop offset="100%" stopColor="#8ab4f8" />
      </linearGradient>
    </defs>
    <path
      d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
      fill="url(#geminiSparkleGrad)"
    />
  </svg>
);

// ==========================================
// Code Block with Copy Button
// ==========================================
const MarkdownCodeBlock: React.FC<{ language?: string; code: string }> = ({
  language,
  code,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-[#3c4043]/60 bg-[#1e1f20] shadow-md font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c4043]/50 bg-[#18191a] text-[#8E918F] select-none">
        <span className="flex items-center gap-1.5 uppercase font-medium text-[11px] tracking-wider text-[#E3E3E3]">
          <Code2 className="w-3.5 h-3.5 text-[#8ab4f8]" />
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 hover:text-[#E3E3E3] transition-colors text-[11px]"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#8ab4f8]" />
              <span className="text-[#8ab4f8]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[#E3E3E3] leading-relaxed">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

// ==========================================
// Main Gemini Chat Interface Component
// ==========================================
export const GeminiChatInterface: React.FC<GeminiChatInterfaceProps> = ({
  messages: externalMessages,
  onSendMessage,
  onRegenerate,
  onStop,
  isGenerating = false,
  userName = 'Explorer',
  placeholder = 'Ask Nerdo anything...',
  disclaimer = 'Nerdo may display inaccurate info, so double-check its responses.',
  className = '',
}) => {
  // Local state if uncontrolled
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I'm **Nerdo**, your Gemini-powered workstation assistant.\n\nYou can ask me to write code, brainstorm ideas, analyze research documents, or explain complex technical concepts simply. How can I help you today?`,
      timestamp: Date.now() - 60000,
    },
  ]);

  const messages = externalMessages || internalMessages;

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, 'up' | 'down'>>({});
  const [isListening, setIsListening] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isGenerating]);

  // Auto-resize textarea to fit content up to 160px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = true;

      recognizer.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognizer.onerror = () => setIsListening(false);
      recognizer.onend = () => setIsListening(false);
      recognitionRef.current = recognizer;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = isArabicText(input) ? 'ar-SA' : 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Text-To-Speech Handlers
  const handleToggleSpeech = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isArabicText(text) ? 'ar-SA' : 'en-US';

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Copy Message Handler
  const handleCopyMessage = async (text: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {}
  };

  // Toggle Reactions
  const handleToggleReaction = (msgId: string, type: 'up' | 'down') => {
    setReactions((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? (undefined as any) : type,
    }));
  };

  // File Attachments
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newAttachments: ChatAttachment[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      file,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Send Submission
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    if (onSendMessage) {
      onSendMessage(trimmed, attachments);
    } else {
      // Uncontrolled mode fallback
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
        attachments: [...attachments],
      };
      setInternalMessages((prev) => [...prev, userMsg]);
    }

    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContentToSubmit = input.trim().length > 0 || attachments.length > 0;

  return (
    <div
      className={`relative flex flex-col h-full w-full bg-[#131314] text-[#E3E3E3] font-sans overflow-hidden select-text ${className}`}
    >
      {/* ========================================================= */}
      {/* 1. Main Chat Stream Container (max-w-3xl, centered)       */}
      {/* ========================================================= */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pt-6 pb-40 space-y-7"
      >
        <div className="max-w-3xl mx-auto w-full space-y-7">
          {/* Empty State / Welcome Greeting */}
          {messages.length === 0 && (
            <div className="min-h-[50vh] flex flex-col items-start justify-center py-10 space-y-4 animate-in fade-in duration-300">
              <GeminiSparkleIcon size={36} className="mb-2" />
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#4ea8de] via-[#9b72cf] to-[#d96570]">
                Hello, {userName}
              </h1>
              <p className="text-xl sm:text-2xl text-[#8E918F] font-normal">
                How can I help you today?
              </p>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-6">
                {[
                  {
                    title: 'Explain quantum computing',
                    desc: 'in simple terms with real-world analogies',
                  },
                  {
                    title: 'Debug a React component',
                    desc: 'and recommend performance optimizations',
                  },
                  {
                    title: 'Design an interactive UI',
                    desc: 'using Tailwind CSS and modern aesthetics',
                  },
                  {
                    title: 'Analyze document data',
                    desc: 'summarize key takeaways into action items',
                  },
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(`${card.title} ${card.desc}`);
                      textareaRef.current?.focus();
                    }}
                    className="p-4 rounded-2xl bg-[#1e1f20] hover:bg-[#282a2c] border border-[#3c4043]/40 text-left transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-sm"
                  >
                    <div className="text-sm font-medium text-[#E3E3E3] group-hover:text-[#8ab4f8] transition-colors">
                      {card.title}
                    </div>
                    <div className="text-xs text-[#8E918F] mt-1">{card.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Feed */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isArabic = isArabicText(msg.content);

            return (
              <div
                key={msg.id}
                className={`w-full flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-opacity`}
              >
                {/* ---------------- User Message Bubble ---------------- */}
                {isUser ? (
                  <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%]">
                    {/* Render User Attachments Chips */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 justify-end">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#282a2c] border border-[#3c4043]/60 text-xs text-[#E3E3E3] shadow-sm"
                          >
                            {att.type?.startsWith('image/') ? (
                              <ImageIcon className="w-3.5 h-3.5 text-[#8ab4f8]" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" />
                            )}
                            <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bubble Container: #282a2c with fully rounded corners (rounded-3xl / 24px) */}
                    <div
                      dir={isArabic ? 'rtl' : 'ltr'}
                      style={{ unicodeBidi: 'plaintext' }}
                      className="px-5 py-3.5 sm:px-6 sm:py-4 rounded-3xl bg-[#282a2c] text-[#E3E3E3] text-sm sm:text-base leading-relaxed break-words shadow-sm font-normal"
                    >
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* ---------------- Assistant Clean Response Area ---------------- */
                  <div className="w-full flex items-start gap-3 sm:gap-4">
                    {/* Gemini Sparkle Gradient Icon on the left */}
                    <div className="pt-0.5 shrink-0 select-none">
                      <GeminiSparkleIcon size={24} className="w-6 h-6" />
                    </div>

                    {/* Transparent Canvas - Text rendered directly without cards/borders */}
                    <div
                      dir={isArabic ? 'rtl' : 'ltr'}
                      style={{ unicodeBidi: 'plaintext' }}
                      className="flex-1 min-w-0 text-sm sm:text-base leading-relaxed text-[#E3E3E3] select-text"
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1({ children }) {
                            return (
                              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#E3E3E3] mt-5 mb-2.5 pb-1 border-b border-[#3c4043]/30">
                                {children}
                              </h1>
                            );
                          },
                          h2({ children }) {
                            return (
                              <h2 className="text-lg sm:text-xl font-semibold text-[#E3E3E3] mt-4 mb-2">
                                {children}
                              </h2>
                            );
                          },
                          h3({ children }) {
                            return (
                              <h3 className="text-base sm:text-lg font-semibold text-[#E3E3E3] mt-3 mb-1.5">
                                {children}
                              </h3>
                            );
                          },
                          p({ children }) {
                            return <p className="mb-3.5 leading-relaxed text-[#E3E3E3]">{children}</p>;
                          },
                          strong({ children }) {
                            return <strong className="font-semibold text-white">{children}</strong>;
                          },
                          ul({ children }) {
                            return <ul className="list-disc ps-5 sm:ps-6 space-y-1.5 mb-3.5">{children}</ul>;
                          },
                          ol({ children }) {
                            return <ol className="list-decimal ps-5 sm:ps-6 space-y-1.5 mb-3.5">{children}</ol>;
                          },
                          li({ children }) {
                            return <li className="leading-relaxed">{children}</li>;
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="border-s-2 border-[#8ab4f8] bg-[#1e1f20]/40 px-4 py-2.5 my-3.5 rounded-e-xl text-[#8E918F] italic">
                                {children}
                              </blockquote>
                            );
                          },
                          a({ href, children }) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#8ab4f8] hover:underline underline-offset-2 transition-colors font-medium"
                              >
                                {children}
                              </a>
                            );
                          },
                          code({ inline, className: codeClass, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(codeClass || '');
                            const codeString = String(children).replace(/\n$/, '');
                            if (!inline && match) {
                              return (
                                <MarkdownCodeBlock
                                  language={match[1]}
                                  code={codeString}
                                />
                              );
                            }
                            if (!inline && codeString.includes('\n')) {
                              return <MarkdownCodeBlock code={codeString} />;
                            }
                            return (
                              <code
                                className="px-1.5 py-0.5 rounded-md bg-[#1e1f20] border border-[#3c4043]/60 text-[#8ab4f8] font-mono text-[13px]"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* Assistant Action Toolbar (Ghost/Subtle Icons) */}
                      <div className="flex items-center gap-1 mt-2 -ms-1.5 text-[#8E918F] select-none">
                        {/* Copy Action */}
                        <button
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="relative p-2 rounded-full hover:bg-white/5 hover:text-[#E3E3E3] transition-colors"
                          title="Copy text"
                          aria-label="Copy message"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="w-4 h-4 text-[#8ab4f8]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copiedMsgId === msg.id && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#1e1f20] border border-[#3c4043] text-[10px] text-[#8ab4f8] shadow-md pointer-events-none whitespace-nowrap animate-in fade-in">
                              Copied!
                            </span>
                          )}
                        </button>

                        {/* Read Aloud (TTS) */}
                        <button
                          onClick={() => handleToggleSpeech(msg.content, msg.id)}
                          className={`p-2 rounded-full hover:bg-white/5 transition-colors ${
                            speakingMsgId === msg.id
                              ? 'text-[#8ab4f8] bg-[#8ab4f8]/10 animate-pulse'
                              : 'hover:text-[#E3E3E3]'
                          }`}
                          title={speakingMsgId === msg.id ? 'Stop reading' : 'Read aloud'}
                          aria-label="Read aloud"
                        >
                          {speakingMsgId === msg.id ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>

                        {/* Thumbs Up */}
                        <button
                          onClick={() => handleToggleReaction(msg.id, 'up')}
                          className={`p-2 rounded-full hover:bg-white/5 transition-colors ${
                            reactions[msg.id] === 'up'
                              ? 'text-[#8ab4f8] bg-[#8ab4f8]/10'
                              : 'hover:text-[#E3E3E3]'
                          }`}
                          title="Good response"
                          aria-label="Thumbs up"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>

                        {/* Thumbs Down */}
                        <button
                          onClick={() => handleToggleReaction(msg.id, 'down')}
                          className={`p-2 rounded-full hover:bg-white/5 transition-colors ${
                            reactions[msg.id] === 'down'
                              ? 'text-[#8ab4f8] bg-[#8ab4f8]/10'
                              : 'hover:text-[#E3E3E3]'
                          }`}
                          title="Bad response"
                          aria-label="Thumbs down"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>

                        {/* Regenerate Action */}
                        {onRegenerate && (
                          <button
                            onClick={() => onRegenerate(msg.id)}
                            className="p-2 rounded-full hover:bg-white/5 hover:text-[#E3E3E3] transition-colors"
                            title="Regenerate response"
                            aria-label="Regenerate"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Assistant Streaming Indicator */}
          {isGenerating && (
            <div className="flex items-start gap-3 sm:gap-4 animate-in fade-in duration-200">
              <div className="pt-0.5 shrink-0 animate-pulse">
                <GeminiSparkleIcon size={24} className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 pt-1 text-sm text-[#8E918F]">
                <div className="w-2 h-2 rounded-full bg-[#8ab4f8] animate-ping" />
                <span>Nerdo is thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Floating Gemini-Style Input Area (Sticky Bottom)       */}
      {/* ========================================================= */}
      <div className="sticky bottom-0 inset-x-0 z-20 pointer-events-none pb-3 sm:pb-5 px-3 sm:px-6">
        {/* Soft gradient backdrop fading upward to #131314 */}
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#131314] via-[#131314]/90 to-transparent pointer-events-none -z-10" />

        <div className="max-w-3xl mx-auto w-full pointer-events-auto">
          {/* Attached Files Preview Strip */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 px-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1f20] border border-[#3c4043] text-xs text-[#E3E3E3] shadow-md animate-in fade-in zoom-in-95"
                >
                  {att.type?.startsWith('image/') ? (
                    <ImageIcon className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  )}
                  <span className="truncate max-w-[120px] font-medium">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 rounded-full hover:bg-white/10 text-[#8E918F] hover:text-[#E3E3E3] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Capsule-Shaped Input Pill: #1e1f20 with border #3c4043 */}
          <div className="relative rounded-[28px] bg-[#1e1f20] border border-[#3c4043] shadow-xl p-2 sm:p-2.5 transition-all focus-within:border-[#8ab4f8]/80 focus-within:ring-1 focus-within:ring-[#8ab4f8]/30">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex items-end gap-1.5 sm:gap-2">
              {/* Attachment / Paperclip button on the left */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 sm:p-2.5 rounded-full text-[#8E918F] hover:text-[#E3E3E3] hover:bg-white/5 transition-colors shrink-0"
                title="Attach files or images"
                aria-label="Attach files"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Flexible auto-expanding textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                dir={isArabicText(input) ? 'rtl' : 'ltr'}
                style={{ unicodeBidi: 'plaintext' }}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-[#E3E3E3] placeholder-[#8E918F] text-sm sm:text-base outline-none resize-none py-2 px-1 max-h-40 leading-relaxed font-sans min-h-[38px]"
              />

              {/* Voice Input (Speech-to-Text) Button */}
              {recognitionRef.current && (
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`p-2 sm:p-2.5 rounded-full transition-all shrink-0 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                      : 'text-[#8E918F] hover:text-[#E3E3E3] hover:bg-white/5'
                  }`}
                  title={isListening ? 'Stop listening' : 'Use microphone'}
                  aria-label="Microphone"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              {/* Circular Submit / Stop Button on the right */}
              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
                  title="Stop generating"
                  aria-label="Stop generating"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!hasContentToSubmit}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    hasContentToSubmit
                      ? 'bg-[#8ab4f8] text-[#131314] hover:bg-[#a6c8ff] shadow-md shadow-[#8ab4f8]/20 cursor-pointer active:scale-95'
                      : 'bg-transparent text-[#8E918F] opacity-40 cursor-not-allowed'
                  }`}
                  title="Send message"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Small Disclaimer Text Centered Underneath */}
          <p className="text-[11px] sm:text-xs text-[#8E918F] text-center mt-2.5 px-4 select-none leading-normal font-normal">
            {disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GeminiChatInterface;
