import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare,
  Globe,
  Film,
  Cloud,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Menu,
  X,
  Settings as SettingsIcon,
  ChevronDown,
  Sun,
  Moon,
  Paperclip,
  ArrowUp,
  Square,
  Mic,
  MicOff,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  FileText,
  Code2,
  Palette,
  ExternalLink,
} from 'lucide-react';

// ==========================================
// Types & Interfaces
// ==========================================
export type TabType = 'chat' | 'tools' | 'media' | 'drive' | 'notebook';

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

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'Gemini' | 'OpenAI';
  tag: string;
  desc: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  ramUsagePercent: number;
  diskFreeGb: number;
}

export interface NerdoWorkstationProps {
  initialSessions?: ChatSession[];
  activeModelId?: string;
  onModelChange?: (modelId: string) => void;
  onSendMessage?: (text: string, attachments?: ChatAttachment[]) => void | Promise<void>;
  isGenerating?: boolean;
  onStop?: () => void;
  systemMetrics?: SystemMetrics;
  userName?: string;
  userAvatar?: string;
  className?: string;
}

// Check for Arabic characters
const isArabicText = (text: string): boolean => {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
};

// ==========================================
// Gemini 4-Point Sparkle Icon
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
    aria-label="Sparkle"
  >
    <defs>
      <linearGradient id="geminiLinearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ea8de" />
        <stop offset="35%" stopColor="#48cae4" />
        <stop offset="70%" stopColor="#9b72cf" />
        <stop offset="100%" stopColor="#8ab4f8" />
      </linearGradient>
    </defs>
    <path
      d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
      fill="url(#geminiLinearGrad)"
    />
  </svg>
);

// Available Models List
const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'Gemini',
    tag: 'Default',
    desc: 'Ultra-fast intelligence, deep reasoning and instant streaming',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'Gemini',
    tag: 'Latest',
    desc: 'Next-gen frontier reasoning model with expanded context',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini Flash Lite',
    provider: 'Gemini',
    tag: 'Light',
    desc: 'Lightweight, rapid response for everyday queries',
  },
  {
    id: 'gpt-4o',
    name: 'ChatGPT 4o',
    provider: 'OpenAI',
    tag: 'Omni',
    desc: 'High-capability multimodal intelligence model',
  },
  {
    id: 'gpt-4o-mini',
    name: 'ChatGPT 4o-mini',
    provider: 'OpenAI',
    tag: 'Fast',
    desc: 'Cost-efficient and fast generalist model',
  },
];

// ==========================================
// Code Block with Copy Button
// ==========================================
const CodeSnippetBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-[#262930] bg-[#16181d] shadow-sm font-mono text-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[#262930] bg-[#121316] text-[#8F95A0] select-none">
        <span className="flex items-center gap-1.5 uppercase font-medium text-[11px] tracking-wider text-[#EDEDED]">
          <Code2 className="w-3.5 h-3.5 text-[#8ab4f8]" />
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-white/5 hover:text-[#EDEDED] transition-colors text-[11px]"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#8ab4f8]" />
              <span className="text-[#8ab4f8]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-[#EDEDED] leading-relaxed">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

// ==========================================
// Main Nerdo Workstation Component
// ==========================================
export const NerdoWorkstation: React.FC<NerdoWorkstationProps> = ({
  initialSessions,
  activeModelId = 'gemini-3.5-flash',
  onModelChange,
  onSendMessage,
  isGenerating = false,
  onStop,
  systemMetrics = { cpuUsage: 8, ramUsagePercent: 38, diskFreeGb: 74 },
  userName = 'Explorer',
  userAvatar = '/app-icon.png',
  className = '',
}) => {
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Sidebar Collapse State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Model Selector State
  const [selectedModel, setSelectedModel] = useState<string>(activeModelId);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Language & Theme State
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isDark, setIsDark] = useState(true);

  // Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (initialSessions && initialSessions.length > 0) return initialSessions;
    return [
      {
        id: 'session-1',
        title: 'Project Architecture & Roadmap',
        timestamp: Date.now() - 3600000,
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'How can we structure a high-performance, ultra-clean web workstation?',
            timestamp: Date.now() - 3500000,
          },
          {
            id: 'm2',
            role: 'assistant',
            content: `### High-Performance Workstation Architecture\n\nTo build a premier workstation experience inspired by **Linear** and **Google Gemini**, focus on these core pillars:\n\n1. **Deep Matte Aesthetics**: Use pure background surfaces (\`#0e0f12\`) with subtle secondary cards (\`#16181d\`) and 1px borders (\`#262930\`).\n2. **Zero Visual Clutter**: Strip away live meters, excessive badges, and distracting nested containers.\n3. **Keyboard-First Ergonomics**: Instant shortcuts, auto-resizing input capsule, and lightning-fast state transitions.\n4. **Typography Contrast**: Crisp primary text (\`#EDEDED\`) paired with calm secondary text (\`#8F95A0\`).`,
            timestamp: Date.now() - 3400000,
          },
        ],
      },
      {
        id: 'session-2',
        title: 'TypeScript Performance Tuning',
        timestamp: Date.now() - 86400000,
        messages: [],
      },
      {
        id: 'session-3',
        title: 'Linear UI Theme & Design Tokens',
        timestamp: Date.now() - 172800000,
        messages: [],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>('session-1');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionEditTitle, setSessionEditTitle] = useState('');
  const [recentCollapsed, setRecentCollapsed] = useState(false);

  // Active Session helper
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Input & Message State
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, 'up' | 'down'>>({});
  const [isListening, setIsListening] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isGenerating]);

  // Auto-resize textarea up to 160px
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
      recognizer.onresult = (e: any) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
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

  const toggleVoice = () => {
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

  // TTS Handler
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

  // Create New Chat
  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: lang === 'ar' ? 'محادثة جديدة' : 'New chat',
      timestamp: Date.now(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setActiveTab('chat');
    setIsMobileSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // Delete Session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fallbackId = `session-${Date.now()}`;
        return [
          {
            id: fallbackId,
            title: 'New chat',
            timestamp: Date.now(),
            messages: [],
          },
        ];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Rename Session
  const handleSaveRename = (id: string, e: React.KeyboardEvent | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (!sessionEditTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: sessionEditTitle.trim() } : s))
    );
    setEditingSessionId(null);
  };

  // Submit User Message
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      attachments: [...attachments],
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const isFirstMessage = s.messages.length === 0;
          const newTitle = isFirstMessage
            ? trimmed.slice(0, 32) + (trimmed.length > 32 ? '...' : '')
            : s.title;
          return {
            ...s,
            title: newTitle,
            messages: [...s.messages, userMsg],
          };
        }
        return s;
      })
    );

    if (onSendMessage) {
      onSendMessage(trimmed, attachments);
    }

    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newAtts: ChatAttachment[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    setAttachments((prev) => [...prev, ...newAtts]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasContent = input.trim().length > 0 || attachments.length > 0;
  const currentModelObj = DEFAULT_MODELS.find((m) => m.id === selectedModel) || DEFAULT_MODELS[0];

  return (
    <div
      className={`flex h-screen w-full bg-[#0e0f12] text-[#EDEDED] font-sans overflow-hidden antialiased select-none ${className}`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* ========================================================= */}
      {/* 1. Mobile Backdrop                                        */}
      {/* ========================================================= */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* 2. Sidebar (Left - Sleek & Structured)                   */}
      {/* ========================================================= */}
      <aside
        className={`fixed md:static inset-y-0 start-0 z-50 flex flex-col h-full bg-[#16181d] border-e border-[#262930] transition-all duration-300 ease-in-out ${
          isMobileSidebarOpen
            ? 'w-72 shadow-2xl translate-x-0'
            : isSidebarOpen
            ? 'w-64 -translate-x-full md:translate-x-0'
            : 'w-0 -translate-x-full md:w-0 overflow-hidden border-e-0'
        }`}
      >
        {/* Brand & Workspace Title */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#262930]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#4ea8de] to-[#8ab4f8] p-0.5 flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#0e0f12]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-[#EDEDED]">Nerdo</span>
              <span className="text-[10px] font-mono text-[#8F95A0] uppercase tracking-wider">
                Studio
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsSidebarOpen(false);
              setIsMobileSidebarOpen(false);
            }}
            className="p-1.5 rounded-lg text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5 transition-colors md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Action: Sleek "+ New chat" pill button */}
        <div className="p-3 shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full bg-[#1e2026] hover:bg-[#252830] border border-[#2a2d36] hover:border-[#8ab4f8]/40 text-[#EDEDED] text-xs font-medium transition-all shadow-sm group active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#8ab4f8] group-hover:rotate-90 transition-transform duration-200" />
              <span>{lang === 'ar' ? 'محادثة جديدة' : 'New chat'}</span>
            </div>
            <kbd className="text-[10px] font-mono text-[#8F95A0] px-1.5 py-0.5 rounded bg-black/30 border border-white/5">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Clean Navigation List (Simple icon + label, no heavy boxed tiles) */}
        <div className="px-3 py-1 space-y-0.5 border-b border-[#262930]/50 shrink-0">
          {[
            { id: 'chat', label: lang === 'ar' ? 'المحادثة الذكية' : 'Smart Chat', icon: MessageSquare },
            { id: 'tools', label: lang === 'ar' ? 'الأدوات والمواقع' : 'Tools & Hub', icon: Globe },
            { id: 'media', label: lang === 'ar' ? 'مخزن الوسائط' : 'Media Vault', icon: Film },
            { id: 'drive', label: lang === 'ar' ? 'جوجل درايف' : 'Google Drive', icon: Cloud },
            {
              id: 'notebook',
              label: 'NotebookLM',
              icon: BookOpen,
              badge: 'Google',
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1e2026] text-[#EDEDED] font-semibold'
                    : 'text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#8ab4f8]' : 'text-[#8F95A0] group-hover:text-[#EDEDED]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Middle Section: Clean Collapsible List of Chat History */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <button
            onClick={() => setRecentCollapsed(!recentCollapsed)}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[#8F95A0] uppercase tracking-wider hover:text-[#EDEDED] transition-colors"
          >
            <span>{lang === 'ar' ? 'المحادثات الأخيرة' : 'Recent'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                recentCollapsed ? '-rotate-90' : 'rotate-0'
              }`}
            />
          </button>

          {!recentCollapsed && (
            <div className="space-y-0.5 pt-1">
              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId && activeTab === 'chat';
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      setActiveTab('chat');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#1e2026] text-[#EDEDED] font-medium'
                        : 'text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/[0.03]'
                    }`}
                  >
                    {editingSessionId === sess.id ? (
                      <input
                        type="text"
                        value={sessionEditTitle}
                        onChange={(e) => setSessionEditTitle(e.target.value)}
                        onBlur={(e) => handleSaveRename(sess.id, e)}
                        onKeyDown={(e) => handleSaveRename(sess.id, e)}
                        autoFocus
                        className="w-full bg-black/40 text-[#EDEDED] px-1.5 py-0.5 rounded outline-none border border-[#8ab4f8]/50 text-xs"
                      />
                    ) : (
                      <span className="truncate pe-2 flex-1">{sess.title}</span>
                    )}

                    {/* Subtle Hover Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(sess.id);
                          setSessionEditTitle(sess.title);
                        }}
                        className="p-1 rounded hover:bg-white/10 text-[#8F95A0] hover:text-[#EDEDED]"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="p-1 rounded hover:bg-red-500/20 text-[#8F95A0] hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Pinned: System Pulse + Settings Gear */}
        <div className="p-3 border-t border-[#262930] shrink-0 space-y-2 bg-[#141519]">
          {/* Compact System Metrics Status Indicator */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#1a1b20] border border-[#262930] text-[11px] font-mono text-[#8F95A0] select-none">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  systemMetrics.cpuUsage > 80
                    ? 'bg-rose-500 animate-ping'
                    : systemMetrics.cpuUsage > 50
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span>CPU {systemMetrics.cpuUsage}%</span>
            </div>
            <span>RAM {systemMetrics.ramUsagePercent}%</span>
            <span>{systemMetrics.diskFreeGb}GB</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-medium text-[#EDEDED] truncate max-w-[100px]">
                {userName}
              </span>
            </div>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[#8F95A0] hover:text-[#EDEDED] transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 3. Main Workspace                                         */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0e0f12]">
        {/* Top Navbar */}
        <header className="h-14 px-4 sm:px-6 border-b border-[#262930] flex items-center justify-between shrink-0 bg-[#0e0f12]/80 backdrop-blur-md z-30 select-none">
          {/* Left: Compact toggle sidebar icon + Minimalist branding */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileSidebarOpen(true);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              className="p-2 rounded-xl text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5 transition-colors"
              title="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-semibold text-sm text-[#EDEDED] tracking-tight">Nerdo</span>
          </div>

          {/* Center: Clean, pill-shaped Model Selector */}
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e2026] hover:bg-[#252830] border border-[#2a2d36] text-xs font-medium text-[#EDEDED] transition-all shadow-sm active:scale-95"
            >
              <GeminiSparkleIcon size={14} className="w-3.5 h-3.5" />
              <span className="font-semibold tracking-tight">{currentModelObj.name}</span>
              <ChevronDown className="w-3 h-3 text-[#8F95A0]" />
            </button>

            {isModelDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsModelDropdownOpen(false)}
                />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72 rounded-2xl bg-[#16181d] border border-[#262930] p-1.5 shadow-2xl text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-[#8F95A0] uppercase tracking-wider">
                    Available Models
                  </div>
                  {DEFAULT_MODELS.map((m) => {
                    const isSel = m.id === selectedModel;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          onModelChange?.(m.id);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-start transition-all flex items-start justify-between ${
                          isSel ? 'bg-[#1e2026] text-[#EDEDED]' : 'hover:bg-white/[0.03] text-[#8F95A0]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-medium text-xs text-[#EDEDED]">
                            <span>{m.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-black/40 text-[#8F95A0]">
                              {m.tag}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#8F95A0] mt-0.5 line-clamp-1">
                            {m.desc}
                          </div>
                        </div>
                        {isSel && <Check className="w-3.5 h-3.5 text-[#8ab4f8] shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right: Minimal quick-actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5 transition-colors"
              title="Toggle Language"
            >
              {lang === 'en' ? 'العربية' : 'EN'}
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Refined User Avatar */}
            <div className="w-7 h-7 rounded-full overflow-hidden border border-[#262930] shrink-0 ml-1">
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Central Workspace Canvas */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-44 select-text">
          <div className="max-w-3xl mx-auto w-full pt-6">
            {/* 4. Central Hero Area (Empty / New Chat State) */}
            {activeSession.messages.length === 0 ? (
              <div className="min-h-[58vh] flex flex-col items-center justify-center text-center py-10 space-y-6 animate-in fade-in duration-300 select-none">
                {/* Centered Greeting */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-2xl bg-[#16181d] border border-[#262930] shadow-sm">
                    <GeminiSparkleIcon size={32} />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#EDEDED]">
                    {lang === 'ar' ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#8F95A0] max-w-md">
                    {lang === 'ar'
                      ? 'مساعدك الذكي لإجراء أبحاث متقدمة، كتابة وتصحيح الأكواد، وتحليل البيانات'
                      : 'Ask questions, review complex code, analyze reports, or brainstorm high-level concepts.'}
                  </p>
                </div>

                {/* Quick Prompt Chips (4 compact, horizontal pill-shaped chips) */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 max-w-xl">
                  {[
                    {
                      label: lang === 'ar' ? 'تحليل التقرير' : 'Analyze Report',
                      icon: FileText,
                      prompt: 'Analyze this report and summarize the critical action items:',
                    },
                    {
                      label: lang === 'ar' ? 'مراجعة الكود' : 'Code Review',
                      icon: Code2,
                      prompt: 'Review this TypeScript function for performance, memory, and best practices:',
                    },
                    {
                      label: lang === 'ar' ? 'تصميم UI/UX' : 'UI/UX Design',
                      icon: Palette,
                      prompt: 'Outline a clean, minimalist UI layout inspired by Linear design system:',
                    },
                    {
                      label: lang === 'ar' ? 'تلخيص المستند' : 'Summarize Doc',
                      icon: Sparkles,
                      prompt: 'Summarize the core takeaways into bullet points with practical examples:',
                    },
                  ].map((chip, idx) => {
                    const ChipIcon = chip.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(chip.prompt);
                          textareaRef.current?.focus();
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#16181d] hover:bg-[#1e2026] border border-[#262930] hover:border-[#8ab4f8]/50 text-[#8F95A0] hover:text-[#EDEDED] text-xs font-medium transition-all shadow-sm active:scale-95"
                      >
                        <ChipIcon className="w-3.5 h-3.5 text-[#8ab4f8]" />
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Message Stream Feed */
              <div className="space-y-6 pt-2">
                {activeSession.messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isAr = isArabicText(msg.content);

                  return (
                    <div
                      key={msg.id}
                      className={`w-full flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      {isUser ? (
                        /* User Message Bubble */
                        <div className="max-w-[85%] sm:max-w-[78%] flex flex-col items-end">
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2 justify-end">
                              {msg.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16181d] border border-[#262930] text-xs text-[#EDEDED]"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" />
                                  <span className="truncate max-w-[120px]">{att.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div
                            dir={isAr ? 'rtl' : 'ltr'}
                            style={{ unicodeBidi: 'plaintext' }}
                            className="px-5 py-3.5 rounded-3xl bg-[#1e2026] text-[#EDEDED] text-sm sm:text-base leading-relaxed break-words shadow-sm"
                          >
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        /* Assistant Response (Clean canvas, transparent, no heavy card) */
                        <div className="w-full flex items-start gap-3.5">
                          <div className="pt-0.5 shrink-0 select-none">
                            <GeminiSparkleIcon size={22} className="w-5 h-5" />
                          </div>

                          <div
                            dir={isAr ? 'rtl' : 'ltr'}
                            style={{ unicodeBidi: 'plaintext' }}
                            className="flex-1 min-w-0 text-sm sm:text-base leading-relaxed text-[#EDEDED]"
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1({ children }) {
                                  return (
                                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EDEDED] mt-4 mb-2 pb-1 border-b border-[#262930]">
                                      {children}
                                    </h1>
                                  );
                                },
                                h2({ children }) {
                                  return (
                                    <h2 className="text-lg sm:text-xl font-semibold text-[#EDEDED] mt-3.5 mb-1.5">
                                      {children}
                                    </h2>
                                  );
                                },
                                h3({ children }) {
                                  return (
                                    <h3 className="text-base sm:text-lg font-semibold text-[#EDEDED] mt-3 mb-1">
                                      {children}
                                    </h3>
                                  );
                                },
                                p({ children }) {
                                  return <p className="mb-3 leading-relaxed">{children}</p>;
                                },
                                ul({ children }) {
                                  return <ul className="list-disc ps-5 space-y-1 mb-3">{children}</ul>;
                                },
                                ol({ children }) {
                                  return <ol className="list-decimal ps-5 space-y-1 mb-3">{children}</ol>;
                                },
                                a({ href, children }) {
                                  return (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#8ab4f8] hover:underline inline-flex items-center gap-1 font-medium"
                                    >
                                      <span>{children}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  );
                                },
                                code({ inline, className: cClass, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(cClass || '');
                                  const codeStr = String(children).replace(/\n$/, '');
                                  if (!inline && match) {
                                    return <CodeSnippetBlock language={match[1]} code={codeStr} />;
                                  }
                                  if (!inline && codeStr.includes('\n')) {
                                    return <CodeSnippetBlock code={codeStr} />;
                                  }
                                  return (
                                    <code
                                      className="px-1.5 py-0.5 rounded bg-[#1e2026] text-[#8ab4f8] font-mono text-[13px] border border-[#262930]"
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

                            {/* Assistant Action Toolbar */}
                            <div className="flex items-center gap-1 mt-2 text-[#8F95A0] select-none -ms-1">
                              <button
                                onClick={() => handleCopyMessage(msg.content, msg.id)}
                                className="relative p-1.5 rounded-lg hover:bg-white/5 hover:text-[#EDEDED] transition-colors"
                                title="Copy"
                              >
                                {copiedMsgId === msg.id ? (
                                  <Check className="w-4 h-4 text-[#8ab4f8]" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() => handleToggleSpeech(msg.content, msg.id)}
                                className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                                  speakingMsgId === msg.id
                                    ? 'text-[#8ab4f8] bg-[#8ab4f8]/10'
                                    : 'hover:text-[#EDEDED]'
                                }`}
                                title="Read aloud"
                              >
                                {speakingMsgId === msg.id ? (
                                  <VolumeX className="w-4 h-4" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() =>
                                  setReactions((prev) => ({
                                    ...prev,
                                    [msg.id]: prev[msg.id] === 'up' ? (undefined as any) : 'up',
                                  }))
                                }
                                className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                                  reactions[msg.id] === 'up'
                                    ? 'text-[#8ab4f8] bg-[#8ab4f8]/10'
                                    : 'hover:text-[#EDEDED]'
                                }`}
                                title="Good response"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() =>
                                  setReactions((prev) => ({
                                    ...prev,
                                    [msg.id]: prev[msg.id] === 'down' ? (undefined as any) : 'down',
                                  }))
                                }
                                className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                                  reactions[msg.id] === 'down'
                                    ? 'text-[#8ab4f8] bg-[#8ab4f8]/10'
                                    : 'hover:text-[#EDEDED]'
                                }`}
                                title="Bad response"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Streaming Indicator */}
                {isGenerating && (
                  <div className="flex items-center gap-3 pt-2 text-[#8F95A0] text-xs">
                    <GeminiSparkleIcon size={18} className="animate-spin" />
                    <span>Nerdo is generating...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. Premium Input Box (Floating Capsule)                   */}
        {/* ========================================================= */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none pb-4 sm:pb-6 px-4 sm:px-6">
          {/* Subtle gradient upward fade */}
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0e0f12] via-[#0e0f12]/90 to-transparent pointer-events-none -z-10" />

          <div className="max-w-3xl mx-auto w-full pointer-events-auto">
            {/* Attached file chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-3">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#16181d] border border-[#262930] text-xs text-[#EDEDED]"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" />
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      className="p-0.5 rounded-full hover:bg-white/10 text-[#8F95A0]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Capsule Bar: rounded-3xl with border #2a2d36 */}
            <div className="relative rounded-3xl bg-[#16181d] border border-[#2a2d36] shadow-2xl p-2 sm:p-2.5 transition-all focus-within:border-[#8ab4f8]/60 focus-within:ring-1 focus-within:ring-[#8ab4f8]/20">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-end gap-1.5 sm:gap-2">
                {/* Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 sm:p-2.5 rounded-full text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5 transition-colors shrink-0"
                  title="Attach files"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Voice Input Button */}
                {recognitionRef.current && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`p-2 sm:p-2.5 rounded-full transition-all shrink-0 ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5'
                    }`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}

                {/* Seamless Auto-resizing Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  dir={isArabicText(input) ? 'rtl' : 'ltr'}
                  style={{ unicodeBidi: 'plaintext' }}
                  placeholder={lang === 'ar' ? 'اسأل Nerdo أي شيء...' : 'Ask Nerdo anything...'}
                  className="flex-1 bg-transparent text-[#EDEDED] placeholder-[#8F95A0] text-sm sm:text-base outline-none resize-none py-2 px-1 max-h-40 leading-relaxed min-h-[38px]"
                />

                {/* Minimalist Circular Send Button */}
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={onStop}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
                    title="Stop"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!hasContent}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      hasContent
                        ? 'bg-[#8ab4f8] text-[#0e0f12] hover:bg-[#a6c8ff] shadow-md shadow-[#8ab4f8]/25 cursor-pointer active:scale-95'
                        : 'bg-transparent text-[#8F95A0] opacity-40 cursor-not-allowed'
                    }`}
                    title="Send message"
                  >
                    <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* Small Centered Subtext */}
            <p className="text-[11px] text-[#8F95A0] text-center mt-2.5 select-none font-normal">
              {lang === 'ar'
                ? 'Nerdo AI Workstation • يتم الحفظ محلياً على جهازك'
                : 'Nerdo AI Workstation • Auto-saved locally'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NerdoWorkstation;
