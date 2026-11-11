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
  Paperclip,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Image as ImageIcon,
  BookOpen,
  Trash2,
  X,
  CheckCircle2,
  Database,
  Search,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { LocalLLMStatus } from '../types';
import { Language, Theme } from '../utils/translations';

interface StagedAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
  previewText?: string;
  docId?: string;
}

interface VaultDocument {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  upload_time: number;
  char_count: number;
  chunks_count: number;
  preview: string;
}

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
  latencyMs?: number;
  source?: string;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
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
          ? '### مرحباً بك! أنا MOMO1، المساعد الذكي الخارق والمحلي على جهازك\n\nأعمل بالكامل **على عتاد جهازك محلياً أوفلاين** بخصوصية تامة 100% وبدون الحاجة لأي اتصال بالإنترنت.\n\n* **تدريب وفهم المستندات:** يمكنك رفع أو سحب وإفلات أي ملفات (PDF، Word، كود، نصوص، CSV، إلخ) لأتدرب عليها فوراً وأجيبك بناءً على محتواها.\n* **خصوصية مطلقة:** لا يتم إرسال أي بايت أو ملف خارج حاسوبك.\n* **النموذج النشط:** MOMO1 (يعمل بتقنيات Ollama و Rust محلياً).'
          : '### Welcome! I am MOMO1, your local AI assistant\n\nI run completely **on your local machine hardware offline** with 100% privacy and zero internet requirement.\n\n* **Train & Understand Files:** Upload or drop any files (PDF, Word, Code, CSV, Markdown, etc.) so I train on them and answer directly from their content.\n* **100% Private:** No telemetry or data leaves your device.\n* **Active Model:** MOMO1 (Powered locally via Ollama & Rust).',
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

  // File Upload & Knowledge Vault State
  const [stagedFiles, setStagedFiles] = useState<StagedAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [trainingNotice, setTrainingNotice] = useState<string | null>(null);
  const [isOptimizingVault, setIsOptimizingVault] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

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
    const handleOpenVault = () => setShowVaultModal(true);
    const handleModelChange = (e: any) => {
      if (e.detail) {
        handleSelectModel(e.detail);
      }
    };

    window.addEventListener('momo1:clear_chat', handleClear);
    window.addEventListener('momo1:export_chat', handleExport);
    window.addEventListener('momo1:refresh_status', handleRefresh);
    window.addEventListener('momo1:open_vault', handleOpenVault);
    window.addEventListener('momo1:model_changed', handleModelChange);

    return () => {
      window.removeEventListener('momo1:clear_chat', handleClear);
      window.removeEventListener('momo1:export_chat', handleExport);
      window.removeEventListener('momo1:refresh_status', handleRefresh);
      window.removeEventListener('momo1:open_vault', handleOpenVault);
      window.removeEventListener('momo1:model_changed', handleModelChange);
    };
  }, [messages, selectedModel]);

  // Load Knowledge Vault Documents
  const loadVaultDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await api.getLocalLLMDocuments();
      if (res && res.documents) {
        setVaultDocs(res.documents);
      }
    } catch (err) {
      console.warn('Could not load MOMO1 documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadVaultDocuments();
  }, []);

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
      await loadVaultDocuments();
    } catch (err) {
      console.warn('Failed to probe local LLM:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  // Format File Size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper for File Icon
  const getFileIcon = (filename: string, className = 'w-4 h-4') => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
      return <FileText className={`${className} text-blue-400`} />;
    }
    if (['csv', 'tsv', 'xls', 'xlsx'].includes(ext)) {
      return <FileSpreadsheet className={`${className} text-emerald-400`} />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'c', 'cpp', 'java', 'html', 'css', 'json', 'yaml', 'yml', 'sh', 'sql', 'md'].includes(ext)) {
      return <FileCode className={`${className} text-amber-400`} />;
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp', 'gif'].includes(ext)) {
      return <ImageIcon className={`${className} text-purple-400`} />;
    }
    return <File className={`${className} text-slate-400`} />;
  };

  // Handle User File Selection & Auto-Training
  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newStaged: StagedAttachment[] = fileArray.map((file) => ({
      id: `staged_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type || file.name.split('.').pop() || 'unknown',
      status: 'uploading',
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);

    for (const item of newStaged) {
      try {
        const res = await api.uploadLocalLLMDocument(item.file);
        setStagedFiles((prev) =>
          prev.map((s) =>
            s.id === item.id
              ? {
                  ...s,
                  status: 'ready',
                  docId: res.document?.id,
                  previewText: res.document?.preview,
                }
              : s
          )
        );
        setTrainingNotice(
          isAr
            ? `تم تدريب MOMO1 على "${item.name}" وتخزينه في الذاكرة بنجاح!`
            : `Trained MOMO1 on "${item.name}" successfully!`
        );
        setTimeout(() => setTrainingNotice(null), 4000);
        loadVaultDocuments();
      } catch (err: any) {
        console.error('File training error:', err);
        setStagedFiles((prev) =>
          prev.map((s) =>
            s.id === item.id
              ? { ...s, status: 'error', errorMessage: err.message || 'فشل الفهرسة' }
              : s
          )
        );
      }
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((s) => s.id !== id));
  };

  // Delete Document from MOMO1 Vault
  const handleDeleteDoc = async (docId: string, filename: string) => {
    if (
      !window.confirm(
        isAr
          ? `هل أنت متأكد من حذف المستند "${filename}" من ذاكرة تدريب MOMO1؟`
          : `Remove "${filename}" from MOMO1 knowledge vault?`
      )
    ) {
      return;
    }
    try {
      await api.deleteLocalLLMDocument(docId);
      setVaultDocs((prev) => prev.filter((d) => d.id !== docId));
      setTrainingNotice(isAr ? `تم حذف "${filename}" من الذاكرة.` : `Removed "${filename}".`);
      setTimeout(() => setTrainingNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'فشل حذف المستند');
    }
  };

  // Re-index & optimize Knowledge Vault
  const handleOptimizeVault = async () => {
    setIsOptimizingVault(true);
    try {
      const res = await api.triggerLocalLLMTraining();
      setTrainingNotice(res.message || (isAr ? 'تم تحسين وتثبيت الفهرس المحلي بنجاح!' : 'Training index optimized!'));
      await loadVaultDocuments();
      setTimeout(() => setTrainingNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'فشل تحسين الفهرس');
    } finally {
      setIsOptimizingVault(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && stagedFiles.length === 0) || isGenerating) return;

    const currentStaged = [...stagedFiles];
    const queryText =
      text ||
      (isAr
        ? 'يرجى قراءة وتحليل المستندات المرفقة واستخراج ملخص شامل وأهم النقاط منها.'
        : 'Please analyze the attached files, extract key information, and provide a comprehensive summary.');

    const userMsg: LocalMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: Date.now(),
      attachments: currentStaged.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStagedFiles([]);
    setIsGenerating(true);

    try {
      const res = await api.queryLocalLLM({
        prompt: queryText,
        model: selectedModel,
        temperature: 0.7,
        use_knowledge: true,
        attachments: currentStaged.map((f) => ({
          name: f.name,
          content: f.previewText,
          preview: f.previewText,
        })),
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
    if (window.confirm(isAr ? 'هل تريد مسح محادثة MOMO1؟' : 'Clear local chat history?')) {
      setMessages([]);
      localStorage.removeItem('ANTIGRAVITY_LOCAL_CHAT_MESSAGES');
    }
  };

  const exportChat = () => {
    const text = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? 'User' : 'MOMO1 Local AI'} (${new Date(
            m.timestamp
          ).toLocaleTimeString()})\n\n${m.content}\n\n---`
      )
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOMO1_Local_Chat_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredVaultDocs = vaultDocs.filter((d) =>
    d.filename.toLowerCase().includes(vaultSearchQuery.toLowerCase())
  );

  const totalVaultChunks = vaultDocs.reduce((acc, d) => acc + (d.chunks_count || 1), 0);

  const quickPrompts = [
    {
      title: isAr ? 'تدقيق أمان للكود' : 'Security Code Audit',
      prompt: isAr
        ? 'افحص هذا الكود لاكتشاف أي ثغرات أمنية واقترح أفضل ممارسات الحماية:'
        : 'Audit this snippet for security vulnerabilities and recommend best practices:',
    },
    {
      title: isAr ? 'تحليل المستندات المدربة' : 'Analyze Trained Docs',
      prompt: isAr
        ? 'لخص لي أهم المعلومات والمحتويات الموجودة في المستندات والملفات المحلية التي تدربت عليها.'
        : 'Summarize the key information from all the local files and documents in your knowledge base.',
    },
    {
      title: isAr ? 'تحسين أداء دالة' : 'Optimize Function',
      prompt: isAr
        ? 'راجع الدالة التالية وحسّن سرعتها واستهلاك الذاكرة مع الشرح المباشر:'
        : 'Optimize the following function for speed and minimal memory allocation:',
    },
    {
      title: isAr ? 'شرح خوارزمية' : 'Explain Algorithm',
      prompt: isAr
        ? 'اشرح طريقة عمل خوارزمية البحث الثنائي (Binary Search) مع كود تنفيذي بـ Rust.'
        : 'Explain Binary Search with an optimized implementation in Rust.',
    },
  ];

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden select-text relative backdrop-blur-2xl ${
        isDark ? 'bg-transparent text-[#EDEDED]' : 'bg-transparent text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFilesSelected(e.dataTransfer.files);
        }
      }}
    >
      {/* Hidden File Input for Attachment button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* Hidden File Input for Vault Modal */}
      <input
        ref={modalFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xl border-2 border-dashed border-emerald-500 rounded-3xl m-4 pointer-events-none animate-in fade-in duration-200">
          <div className="p-6 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-4 animate-bounce">
            <UploadCloud className="w-14 h-14" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {isAr ? 'أفلت الملفات لتدريب MOMO1 عليها فوراً' : 'Drop files to train MOMO1 offline'}
          </h3>
          <p className="text-xs text-slate-300 max-w-md text-center leading-relaxed">
            {isAr
              ? 'يدعم جميع أنواع الملفات (PDF, Word, Code, Markdown, CSV, JSON, الصور، نصوص) • معالجة وفهرسة محلية 100% بدون إنترنت'
              : 'Supports all file formats (PDF, Word, Code, Markdown, CSV, JSON, Images, Text) • 100% on-device local execution'}
          </p>
        </div>
      )}

      {/* Toast Training Notice */}
      {trainingNotice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{trainingNotice}</span>
        </div>
      )}

      {/* Messages Canvas - Frosted Canvas */}
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
                <div className={`space-y-1.5 ${isUser ? 'max-w-[85%]' : 'flex-1 max-w-[88%]'}`}>
                  {/* If user sent files, display them as clean badges */}
                  {isUser && m.attachments && m.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end mb-1">
                      {m.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 border border-white/20 text-white text-[11px] backdrop-blur-md shadow-sm"
                        >
                          {getFileIcon(att.name, 'w-3.5 h-3.5')}
                          <span className="font-mono truncate max-w-[150px]">{att.name}</span>
                          <span className="text-[10px] text-white/70">({formatFileSize(att.size)})</span>
                        </div>
                      ))}
                    </div>
                  )}

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
                                    {copiedId === codeString ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                    <span>{copiedId === codeString ? 'تم النسخ' : 'نسخ'}</span>
                                  </button>
                                </div>
                                <pre className="p-3.5 overflow-x-auto text-[12px] font-mono leading-relaxed text-[#EDEDED]">
                                  <code>{codeString}</code>
                                </pre>
                              </div>
                            ) : (
                              <code
                                className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-mono text-xs border border-white/5"
                                {...props}
                              >
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
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
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
                  {isAr ? 'MOMO1 يحلل المعرفة والمستندات محلياً...' : 'MOMO1 analyzing knowledge offline on local hardware...'}
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
          {/* Quick Starter Chips & Knowledge Vault Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {messages.length <= 1 ? (
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
            ) : <div />}

            {/* Knowledge Vault Shortcut Button */}
            <button
              onClick={() => setShowVaultModal(true)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ms-auto active:scale-95 ${
                vaultDocs.length > 0
                  ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                  : isDark
                  ? 'border-white/10 bg-white/5 hover:bg-white/10 text-[#8F95A0]'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title={isAr ? 'فتح مكتبة تدريب ومستندات MOMO1' : 'Open MOMO1 Knowledge Vault'}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isAr
                  ? `مكتبة التدريب (${vaultDocs.length} ملف)`
                  : `Knowledge Vault (${vaultDocs.length})`}
              </span>
            </button>
          </div>

          {/* Capsule Prompt Box with Frosted Blur */}
          <div
            className={`p-2.5 rounded-3xl border transition-all shadow-2xl backdrop-blur-2xl ${
              isDark
                ? 'bg-[#121622]/80 border-white/[0.12] focus-within:border-emerald-500/50 shadow-black/40'
                : 'bg-white/80 border-slate-300 focus-within:border-emerald-600 shadow-slate-200'
            }`}
          >
            {/* Staged Attached Files Preview Chips */}
            {stagedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pt-1 pb-2 border-b border-white/10 mb-2">
                {stagedFiles.map((sf) => (
                  <div
                    key={sf.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono backdrop-blur-md transition-all ${
                      sf.status === 'ready'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : sf.status === 'error'
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        : 'bg-blue-500/15 border-blue-500/30 text-blue-300 animate-pulse'
                    }`}
                  >
                    {getFileIcon(sf.name, 'w-4 h-4')}
                    <span className="truncate max-w-[160px] font-medium">{sf.name}</span>
                    <span className="text-[10px] opacity-70">({formatFileSize(sf.size)})</span>

                    {sf.status === 'uploading' && (
                      <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                    )}
                    {sf.status === 'ready' && (
                      <span title="تم التدريب والحفظ">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </span>
                    )}
                    {sf.status === 'error' && (
                      <span title={sf.errorMessage || 'خطأ'}>
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                      </span>
                    )}

                    <button
                      onClick={() => removeStagedFile(sf.id)}
                      className="hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
                      title={isAr ? 'إزالة' : 'Remove'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 px-2">
              {/* Paperclip Button for File Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-2xl flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                  isDark
                    ? 'hover:bg-white/10 text-emerald-400 hover:text-emerald-300'
                    : 'hover:bg-slate-100 text-emerald-600'
                }`}
                title={
                  isAr
                    ? 'إرفاق وتدريب ملفات لـ MOMO1 (PDF, Word, كود, CSV, صور، إلخ)'
                    : 'Attach & train files for MOMO1 (PDF, Word, Code, CSV, etc.)'
                }
              >
                <Paperclip className="w-4 h-4" />
              </button>

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
                    ? stagedFiles.length > 0
                      ? 'اسأل MOMO1 حول الملفات المرفقة، أو اضغط Enter للتحليل المباشر...'
                      : 'اكتب رسالتك لـ MOMO1 أو ارفع ملفات ليتدرب عليها (Enter للإرسال)...'
                    : stagedFiles.length > 0
                    ? 'Ask MOMO1 about attached files, or press Enter to analyze...'
                    : 'Ask MOMO1 or attach files to train on (Enter to send)...'
                }
                rows={1}
                className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm py-2 px-1 max-h-40 leading-relaxed placeholder:text-[#8F95A0]/60"
              />

              <button
                onClick={handleSend}
                disabled={(!input.trim() && stagedFiles.length === 0) || isGenerating}
                className={`p-2.5 rounded-2xl flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                  (input.trim() || stagedFiles.length > 0) && !isGenerating
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
                ? `MOMO1 محلي 100% (${status?.active_model || selectedModel}) • ${isCheckingStatus ? 'جاري الفحص...' : 'تدريب محلي أوفلاين'} • ${vaultDocs.length} مستند مفهرس`
                : `MOMO1 On-Device 100% (${status?.active_model || selectedModel}) • ${isCheckingStatus ? 'Probing...' : 'Local RAG'} • ${vaultDocs.length} docs trained`}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOMO1 Knowledge Vault Modal (مكتبة تدريب ومعرفة MOMO1)     */}
      {/* ======================================================== */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl max-h-[85vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl ${
              isDark
                ? 'bg-[#0f1118]/95 border-white/[0.12] text-[#EDEDED]'
                : 'bg-white/95 border-slate-300 text-slate-800'
            }`}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>{isAr ? 'مكتبة تدريب ومعرفة MOMO1' : 'MOMO1 Knowledge Vault'}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      100% Offline
                    </span>
                  </h3>
                  <p className="text-xs text-[#8F95A0]">
                    {isAr
                      ? 'الملفات والمستندات المحلية التي تم تدريب MOMO1 عليها ويستخرج منها الإجابات بدقة'
                      : 'Local files trained into MOMO1 for offline contextual retrieval and reasoning'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowVaultModal(false)}
                className="p-2 rounded-full hover:bg-white/10 text-[#8F95A0] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar & Stats */}
            <div className="px-6 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 start-3 text-[#8F95A0]" />
                  <input
                    type="text"
                    value={vaultSearchQuery}
                    onChange={(e) => setVaultSearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث في المستندات...' : 'Search documents...'}
                    className={`ps-8 pe-3 py-1.5 rounded-xl text-xs border outline-none font-mono ${
                      isDark
                        ? 'bg-black/30 border-white/10 focus:border-emerald-500/50'
                        : 'bg-slate-100 border-slate-200 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <span className="text-xs text-[#8F95A0] font-mono">
                  {filteredVaultDocs.length} {isAr ? 'مستند' : 'files'} • {totalVaultChunks} {isAr ? 'أجزاء ذاكرة' : 'chunks'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOptimizeVault}
                  disabled={isOptimizingVault || vaultDocs.length === 0}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all ${
                    isDark
                      ? 'border-white/10 hover:bg-white/10 text-[#8F95A0] hover:text-white'
                      : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                  title={isAr ? 'إعادة فهرسة وتحديث التدريب' : 'Re-index & Optimize'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isOptimizingVault ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{isAr ? 'تحسين الفهرس' : 'Optimize'}</span>
                </button>

                <button
                  onClick={() => modalFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isAr ? 'رفع وتدريب ملف' : 'Upload & Train'}</span>
                </button>
              </div>
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {isLoadingDocs ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#8F95A0] space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs font-mono">{isAr ? 'جاري جلب المستندات...' : 'Loading documents...'}</span>
                </div>
              ) : filteredVaultDocs.length === 0 ? (
                <div className="py-12 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="p-4 rounded-2xl bg-white/5 text-[#8F95A0]">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-[#EDEDED]">
                    {isAr ? 'لا توجد مستندات بعد' : 'No documents trained yet'}
                  </h4>
                  <p className="text-xs text-[#8F95A0] max-w-sm">
                    {isAr
                      ? 'اضغط على زر "رفع وتدريب ملف" أو اسحب وأفلت أي ملف (PDF، وورد، كود، إكسل، نصوص) ليتم استخراجه وفهرسته وتدريب MOMO1 عليه فوراً.'
                      : 'Click "Upload & Train" or drag & drop files (PDF, Word, Code, CSV, Markdown) to train MOMO1 offline.'}
                  </p>
                  <button
                    onClick={() => modalFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isAr ? 'اختر ملفات من جهازك' : 'Choose files from device'}</span>
                  </button>
                </div>
              ) : (
                filteredVaultDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 group ${
                      isDark
                        ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                      {getFileIcon(doc.filename, 'w-5 h-5')}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold truncate font-mono">
                          {doc.filename}
                        </h4>
                        <button
                          onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/20 text-[#8F95A0] hover:text-rose-400 transition-all"
                          title={isAr ? 'حذف من الذاكرة' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#8F95A0]">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 uppercase">
                          {doc.file_type}
                        </span>
                        <span>• {formatFileSize(doc.file_size)}</span>
                        <span>• {doc.chunks_count} {isAr ? 'أجزاء ذاكرة' : 'chunks'}</span>
                        <span>• {doc.char_count} {isAr ? 'حرف' : 'chars'}</span>
                        <span>
                          • {new Date(doc.upload_time * 1000).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {doc.preview && (
                        <p className="text-[11px] text-[#8F95A0]/80 line-clamp-2 leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5 font-mono">
                          {doc.preview}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-white/10 flex items-center justify-between text-xs text-[#8F95A0] font-mono bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {isAr
                    ? 'البيانات تُخزن وتُعالج بالكامل محلياً داخل مجلد المشروع'
                    : 'All training data stored & processed 100% locally on-device'}
                </span>
              </div>
              <button
                onClick={() => setShowVaultModal(false)}
                className="px-4 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-[#EDEDED] transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
