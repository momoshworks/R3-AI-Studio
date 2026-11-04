import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  Search,
  Sparkles,
  Loader2,
  FileCode,
  GraduationCap,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  X,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Globe,
  Lightbulb,
  HelpCircle,
  Brain,
  Zap,
  Copy,
  Edit3,
  Eye,
  FolderOpen,
  Save,
  FileEdit,
  ExternalLink,
  Check,
  Music,
} from 'lucide-react';
import {
  Notebook,
  NotebookChunk,
  Citation,
  StudyGuideData,
} from '../types';
import { api } from '../services/api';
import { Translations, Theme, Language } from '../utils/translations';
import { downloadPDFDirectly } from '../utils/pdfExport';


// Clean file names by removing duplicated extensions (e.g. .pdf.pdf -> .pdf)
const cleanFileName = (name: string): string => {
  if (!name) return '';
  return name.replace(/\.pdf\.pdf$/i, '.pdf').replace(/(\.\w{2,5})\1$/i, '$1');
};

const getTextFromChildren = (children: any): string => {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getTextFromChildren).join('');
  if (typeof children === 'object' && children.props && children.props.children) {
    return getTextFromChildren(children.props.children);
  }
  return '';
};

// Rich Markdown Components with Highlighting on Key Concepts
const notebookMarkdownComponents = {
  strong({ children }: any) {
    const text = getTextFromChildren(children);
    const isEnglishOnly = /^[A-Za-z0-9_\-\.\s\(\)]+$/.test(text.trim());
    return (
      <strong
        dir={isEnglishOnly ? 'ltr' : undefined}
        className="font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/25 shadow-sm inline-block my-0.5"
        style={{ unicodeBidi: 'isolate' }}
      >
        {children}
      </strong>
    );
  },
  p({ children }: any) {
    return (
      <p
        className="my-2 leading-[1.68] text-slate-300 text-xs md:text-[13px] font-normal"
        style={{ unicodeBidi: 'plaintext' }}
      >
        {children}
      </p>
    );
  },
  h1({ children }: any) {
    return (
      <h1 className="text-sm md:text-base font-bold text-sky-400 mt-3 mb-1.5 pb-1 border-b border-white/10">
        {children}
      </h1>
    );
  },
  h2({ children }: any) {
    const text = getTextFromChildren(children);
    let icon = '📌';
    let cardClass = 'border-s-4 border-s-blue-500 bg-[#0e131f]/80';

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
      <div className={`p-2 my-2 rounded-xl border border-white/10 ${cardClass} shadow-md backdrop-blur-md`}>
        <h2 className="text-xs md:text-[13px] font-bold text-gray-100 flex items-center gap-2">
          <span className="text-base select-none">{icon}</span>
          <span className="flex-1" style={{ unicodeBidi: 'plaintext' }}>{children}</span>
        </h2>
      </div>
    );
  },
  h3({ children }: any) {
    return (
      <h3 className="text-[11.5px] md:text-xs font-semibold text-emerald-400 mt-2 mb-1 flex items-center gap-1.5">
        <span>🔹</span>
        <span style={{ unicodeBidi: 'plaintext' }}>{children}</span>
      </h3>
    );
  },
  ul({ children }: any) {
    return <ul className="list-disc ps-5 space-y-1.5 my-1.5 text-xs md:text-[13px] leading-[1.68] text-slate-300">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal ps-5 space-y-1.5 my-1.5 text-xs md:text-[13px] leading-[1.68] text-slate-300">{children}</ol>;
  },
  li({ children }: any) {
    return (
      <li className="leading-[1.68] my-0.5" style={{ unicodeBidi: 'plaintext' }}>
        {children}
      </li>
    );
  },
  blockquote({ children }: any) {
    return (
      <blockquote
        className="my-2.5 border-s-4 border-amber-400 bg-amber-950/20 px-3 py-2 rounded-e-xl text-xs md:text-[12.5px] leading-[1.68] font-medium text-amber-200 shadow-sm"
        style={{ unicodeBidi: 'plaintext' }}
      >
        <span className="block font-bold text-amber-400 text-[11px] mb-1">💡 ملحوظة وخلاصة جوهرية:</span>
        {children}
      </blockquote>
    );
  },
  code({ inline, children, ...props }: any) {
    if (inline) {
      return (
        <code
          dir="ltr"
          className="inline-term px-1.5 py-0.5 rounded bg-white/[0.08] text-sky-300 font-mono text-[11px] border border-white/10 mx-0.5 inline-block"
          style={{ unicodeBidi: 'isolate' }}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre dir="ltr" className="p-3 my-2.5 rounded-xl bg-black/60 border border-white/10 overflow-x-auto text-[11px] font-mono leading-relaxed text-blue-300 text-left">
        <code dir="ltr" className="text-left font-mono">{children}</code>
      </pre>
    );
  },
};

interface NotebookStudioProps {
  theme: Theme;
  lang: Language;
  t: Translations;
  onOpenSettings?: () => void;
}

interface ChatHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  citations?: Citation[];
  web_results?: any[];
}

export const NotebookStudio: React.FC<NotebookStudioProps> = ({
  theme,
  lang,
  t,
}) => {
  const isDark = theme === 'dark';
  const isRtl = lang === 'ar';

  // Notebooks State
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>('');
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Selected Sources for Filtering
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  // Studio Mode: 'chat' | 'study' | 'search'
  const [activeMode, setActiveMode] = useState<'chat' | 'study' | 'search'>('chat');
  const [studySubTab, setStudySubTab] = useState<'summary' | 'flashcards' | 'quiz' | 'concepts'>('summary');

  // Web Search Knowledge Toggle
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NotebookChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Study Tools State
  const [studyData, setStudyData] = useState<StudyGuideData | null>(null);
  const [isGeneratingStudy, setIsGeneratingStudy] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<string, string>>({});

  // Citation Modal Preview
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isMobileSourcesOpen, setIsMobileSourcesOpen] = useState<boolean>(false);
  const [vaultSearch, setVaultSearch] = useState('');
  const [editingSource, setEditingSource] = useState<{
    id: string;
    name: string;
    file_type: string;
    content: string;
    is_editable: boolean;
    is_saving?: boolean;
  } | null>(null);
  const [viewingSource, setViewingSource] = useState<{
    source_id: string;
    name: string;
    file_type: string;
    content: string;
    is_editable: boolean;
    size_human: string;
    download_url?: string;
  } | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [pdfViewMode, setPdfViewMode] = useState<'native' | 'text'>('native');
  const [copiedViewerText, setCopiedViewerText] = useState(false);

  const handleOpenSourceViewer = async (sourceId: string) => {
    if (!activeNotebook) return;
    setPdfViewMode('native');
    setIsLoadingSource(true);
    try {
      const data = await api.getNotebookSourceContent(activeNotebook.id, sourceId);
      setViewingSource(data);
    } catch (err) {
      console.error('Error fetching source for viewing:', err);
    } finally {
      setIsLoadingSource(false);
    }
  };

  const handleOpenSourceEditor = async (sourceId: string) => {
    if (!activeNotebook) return;
    setIsLoadingSource(true);
    try {
      const data = await api.getNotebookSourceContent(activeNotebook.id, sourceId);
      setEditingSource({
        id: sourceId,
        name: data.name,
        file_type: data.file_type,
        content: data.content,
        is_editable: data.is_editable,
      });
    } catch (err) {
      console.error('Error fetching source for editing:', err);
    } finally {
      setIsLoadingSource(false);
    }
  };

  const handleSaveSourceContent = async () => {
    if (!activeNotebook || !editingSource) return;
    setEditingSource((prev) => (prev ? { ...prev, is_saving: true } : null));
    try {
      await api.updateNotebookSourceContent(activeNotebook.id, editingSource.id, editingSource.content);
      await loadNotebooks();
      setEditingSource(null);
    } catch (err) {
      console.error('Error saving source content:', err);
    }
  };

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Notebook
  const activeNotebook = notebooks.find((nb) => nb.id === activeNotebookId) || notebooks[0] || null;

  // Load Notebooks on Mount
  useEffect(() => {
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
    try {
      const data = await api.listNotebooks();
      if (data.notebooks && data.notebooks.length > 0) {
        setNotebooks(data.notebooks);
        if (!activeNotebookId || !data.notebooks.some((n) => n.id === activeNotebookId)) {
          setActiveNotebookId(data.notebooks[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load notebooks:', e);
    }
  };

  // Sync active notebook study data
  useEffect(() => {
    if (activeNotebook) {
      if (activeNotebook.study_guide) {
        setStudyData(activeNotebook.study_guide);
      } else {
        setStudyData(null);
      }
      setSelectedSourceIds(activeNotebook.sources.map((s) => s.id));
      setChatHistory([
        {
          id: 'welcome-rag',
          role: 'assistant',
          text:
            lang === 'ar'
              ? `### مرحباً بك في **${activeNotebook.title}**! 🎓\n\nتم تفعيل **محرك الاستيعاب الذكي المتصل بسحابة Gemini والإنترنت** لمساعدتك في فهم واستذكار المادة بالكامل.\n\n> **أهم الإمكانيات المتاحة لك:**\n> 1. سؤالي عن أي نقطة غامضة مع **توثيق فوري برقم الصفحة والمقطع**.\n> 2. طلب **شرح وتبسيط المسائل والقوانين** بأسلوب عملي وتشبيهات واقعية.\n> 3. استخراج **ملخص تنفيذي، وبطاقات مراجعة، واختبارات تدريبية**.\n\nابدأ بكتابة سؤالك بالأسفل، أو اختر أمراً من **الأوامر السريعة** بالأعلى!`
              : `### Welcome to **${activeNotebook.title}**! 🎓\n\nPowered by **Gemini AI & Live Grounded Web Search**.\n\n> **Key Highlights:**\n> 1. Ask any question with **verified page-grounded citations**.\n> 2. Step-by-step problem walk-throughs with real analogies.\n> 3. Generate **Executive Summaries, Flashcards, and Practice Quizzes**.\n\nType your inquiry below or click a **Quick Action** above!`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [activeNotebookId]);

  // Create Notebook
  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await api.createNotebook(newTitle, newDesc);
      setNotebooks((prev) => [created, ...prev]);
      setActiveNotebookId(created.id);
      setIsCreatingNotebook(false);
      setNewTitle('');
      setNewDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Notebook
  const handleDeleteNotebook = async (nbId: string) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الدفتر وجميع ملفاته؟' : 'Are you sure you want to delete this notebook?')) {
      try {
        await api.deleteNotebook(nbId);
        setNotebooks((prev) => prev.filter((n) => n.id !== nbId));
        if (activeNotebookId === nbId) {
          const remaining = notebooks.filter((n) => n.id !== nbId);
          if (remaining.length > 0) {
            setActiveNotebookId(remaining[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Upload Files to Active Notebook
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeNotebook) return;
    setIsUploading(true);
    try {
      const fileArr = Array.from(files);
      const res = await api.uploadNotebookSources(activeNotebook.id, fileArr);
      if (res && res.sources) {
        const updatedNb = await api.getNotebook(activeNotebook.id);
        setNotebooks((prev) => prev.map((n) => (n.id === updatedNb.id ? updatedNb : n)));
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete Source
  const handleDeleteSource = async (sourceId: string) => {
    if (!activeNotebook) return;
    try {
      await api.deleteNotebookSource(activeNotebook.id, sourceId);
      const updatedNb = await api.getNotebook(activeNotebook.id);
      setNotebooks((prev) => prev.map((n) => (n.id === updatedNb.id ? updatedNb : n)));
    } catch (err) {
      console.error(err);
    }
  };

  // Chat with Notebook (RAG + AI Model + Web Search)
  const handleSendChat = async (customPrompt?: string, mode: 'qa' | 'explain' | 'solve' = 'qa') => {
    const textToSend = customPrompt || chatInput.trim();
    if (!textToSend || !activeNotebook || isQuerying) return;

    const userMsg: ChatHistoryItem = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsQuerying(true);

    try {
      const res = await api.chatWithNotebook(
        activeNotebook.id,
        textToSend,
        selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
        enableWebSearch,
        mode
      );

      const botMsg: ChatHistoryItem = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        text: res.answer,
        timestamp: Date.now(),
        citations: res.citations,
        web_results: res.web_results,
      };

      setChatHistory((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: lang === 'ar' ? '⚠️ حدث خطأ أثناء الاتصال بمحرك الاسترجاع والذكاء الاصطناعي.' : '⚠️ Error querying retrieval and AI engine.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  // Instant Semantic Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !activeNotebook || isSearching) return;
    setIsSearching(true);
    try {
      const res = await api.queryNotebook(
        activeNotebook.id,
        searchQuery.trim(),
        10,
        selectedSourceIds.length > 0 ? selectedSourceIds : undefined
      );
      setSearchResults(res.chunks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Generate / Load Study Tools via Gemini AI
  const handleGenerateStudyTools = async (forceRefresh: boolean = false) => {
    if (!activeNotebook || isGeneratingStudy) return;
    setIsGeneratingStudy(true);
    try {
      const res = await api.generateStudyTools(activeNotebook.id, 'all', forceRefresh);
      setStudyData(res);
      setCurrentFlashcardIndex(0);
      setIsCardFlipped(false);
      setUserQuizAnswers({});
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingStudy(false);
    }
  };

  // Toggle Source Selection
  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  };

  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-500 shrink-0" />;
      case 'py':
      case 'json':
      case 'js':
        return <FileCode className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />;
      default:
        return <FileText className="w-5 h-5 text-purple-500 shrink-0" />;
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden select-none ${
        isDark ? 'bg-gemini-bg text-gray-100' : 'bg-[#f8fafc] text-slate-800'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Header Bar */}
      <div
        className={`px-3 sm:px-4 py-2 border-b flex flex-wrap md:flex-nowrap items-center justify-between gap-2 shrink-0 transition-colors ${
          isDark ? 'bg-gemini-sidebar/80 border-gemini-border' : 'bg-white border-slate-200'
        } backdrop-blur-md z-10`}
      >
        <div className="flex items-center space-x-2.5 space-x-reverse min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 space-x-reverse">
              <h2 className="font-bold text-xs sm:text-sm truncate max-w-[110px] sm:max-w-xs md:max-w-md">
                {activeNotebook?.title || t.notebookStudio}
              </h2>
              <span className="text-[10px] bg-amber-500/15 text-amber-400 font-mono px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Gemini AI Connected</span>
                <span className="sm:hidden text-[9px]">AI</span>
              </span>
            </div>
            <p className="hidden sm:block text-[11px] opacity-65 truncate max-w-sm">
              {activeNotebook?.description || t.hybridSearch}
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex items-center space-x-1.5 space-x-reverse overflow-x-auto no-scrollbar max-w-full py-1 shrink-0">
          {/* Mobile Sources Drawer Trigger */}
          <button
            onClick={() => setIsMobileSourcesOpen(true)}
            className="md:hidden px-2 py-1.5 rounded-xl border flex items-center gap-1 text-xs font-semibold bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0"
            title={t.notebooks}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'المصادر' : 'Sources'}</span>
            <span className="text-[10px] bg-amber-400/20 px-1.5 py-0.2 rounded-full font-mono">
              {activeNotebook?.sources.length || 0}
            </span>
          </button>
          {/* Live Web Search Toggle Pill */}
          <button
            onClick={() => setEnableWebSearch(!enableWebSearch)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all shrink-0 ${
              enableWebSearch
                ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 shadow-sm'
                : isDark
                ? 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title={lang === 'ar' ? 'تفعيل البحث في الويب للحلول والمراجع الخارجية' : 'Toggle live web search for external solutions'}
          >
            <Globe className={`w-3.5 h-3.5 ${enableWebSearch ? 'text-blue-400 animate-spin-slow' : ''}`} />
            <span>{lang === 'ar' ? 'البحث بالإنترنت' : 'Web Search'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                enableWebSearch ? 'bg-blue-500 shadow-sm shadow-blue-500' : 'bg-gray-500'
              }`}
            />
          </button>

          {/* Mode Switcher Tabs */}
          <div
            className={`p-1 rounded-xl border flex items-center space-x-1 space-x-reverse text-xs shrink-0 ${
              isDark ? 'bg-[#1a1b1d] border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setActiveMode('chat')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 space-x-reverse font-medium transition-all ${
                activeMode === 'chat'
                  ? 'bg-blue-600 text-white shadow'
                  : isDark
                  ? 'text-gray-300 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t.chatWithSources}</span>
            </button>

            <button
              onClick={() => {
                setActiveMode('study');
                if (!studyData) handleGenerateStudyTools(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 space-x-reverse font-medium transition-all ${
                activeMode === 'study'
                  ? 'bg-purple-600 text-white shadow'
                  : isDark
                  ? 'text-gray-300 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{t.studyTools}</span>
            </button>

            <button
              onClick={() => setActiveMode('search')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 space-x-reverse font-medium transition-all ${
                activeMode === 'search'
                  ? 'bg-emerald-600 text-white shadow'
                  : isDark
                  ? 'text-gray-300 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'بحث دلالي' : 'Semantic Search'}</span>
            </button>
          </div>

          <button
            onClick={() => setIsCreatingNotebook(true)}
            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all shrink-0"
            title={t.newNotebook}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Body: Sources Sidebar + Dynamic Work Canvas */}
      <div className="flex-1 flex overflow-hidden overflow-x-hidden relative">
        {/* Mobile Sources Drawer Overlay */}
        {isMobileSourcesOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden flex justify-start animate-in fade-in duration-200"
            onClick={() => setIsMobileSourcesOpen(false)}
          >
            <div
              className={`w-[85%] max-w-sm h-full flex flex-col shadow-2xl safe-area-all animate-in slide-in-from-left duration-200 ${
                isDark ? 'bg-[#18191c] text-gray-100 border-e border-white/10' : 'bg-white text-slate-800 border-e border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  {t.notebooks}
                </span>
                <button
                  onClick={() => setIsMobileSourcesOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Mobile Drawer content continues with selector and sources */}
                <div className="p-3 border-b border-gemini-border/40">
                  <label className="text-[10px] font-bold opacity-60 uppercase tracking-wider block mb-1">
                    {t.notebooks} ({notebooks.length})
                  </label>
                  <select
                    value={activeNotebookId}
                    onChange={(e) => {
                      setActiveNotebookId(e.target.value);
                      setIsMobileSourcesOpen(false);
                    }}
                    className={`w-full text-xs font-semibold rounded-xl px-2.5 py-2 border outline-none cursor-pointer ${
                      isDark
                        ? 'bg-[#1e1f20] border-white/10 text-gray-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {notebooks.map((nb) => (
                      <option key={nb.id} value={nb.id}>
                        {nb.title} ({nb.sources.length} مصادر)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 border-b border-gemini-border/40 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => {
                      setIsMobileSourcesOpen(false);
                      setIsVaultModalOpen(true);
                    }}
                    className="text-xs font-bold flex items-center gap-1.5 hover:text-blue-400 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'ar' ? 'مخزن الملفات' : 'Vault'}</span>
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded-full font-mono">
                      {activeNotebook?.sources.length || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-medium px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all shadow-sm disabled:opacity-50 shrink-0"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploading ? t.indexing : t.addSources}</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {activeNotebook?.sources.map((source) => {
                    const isSelected = selectedSourceIds.includes(source.id);
                    return (
                      <div
                        key={source.id}
                        className={`p-3 rounded-2xl border text-xs transition-all relative flex flex-col gap-2 ${
                          isSelected
                            ? isDark
                              ? 'bg-blue-600/10 border-blue-500/40 text-blue-200 shadow-sm'
                              : 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-sm'
                            : isDark
                            ? 'bg-[#1a1b1d] border-white/5 text-gray-300 hover:border-white/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSourceSelection(source.id)}
                            className="rounded accent-blue-600 shrink-0 cursor-pointer w-3.5 h-3.5"
                          />
                          <div className="shrink-0">{getSourceIcon(source.file_type)}</div>
                          <span className="font-semibold text-xs truncate flex-1 select-none" title={source.name}>
                            {cleanFileName(source.name)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/5 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 uppercase font-bold text-blue-400">
                            {source.file_type}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setIsMobileSourcesOpen(false);
                                setPdfViewMode('native');
                                handleOpenSourceViewer(source.id);
                              }}
                              className="p-1 rounded-lg text-blue-400 hover:bg-blue-500/20"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSource(source.id)}
                              className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2.5 border-t border-gemini-border/40 flex justify-between items-center text-xs safe-bottom">
                  <button
                    onClick={() => {
                      setIsMobileSourcesOpen(false);
                      handleDeleteNotebook(activeNotebook.id);
                    }}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'حذف هذا الدفتر' : 'Delete Notebook'}</span>
                  </button>
                  <span className="text-[10px] opacity-50 font-mono">
                    {activeNotebook?.sources.reduce((acc, s) => acc + s.chunk_count, 0) || 0} Chunks
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Left Column: Notebook Sources (Hidden on Mobile) */}
        <div
          className={`hidden md:flex md:w-72 lg:w-80 border-e flex-col shrink-0 transition-colors ${
            isDark ? 'bg-gemini-sidebar/50 border-gemini-border' : 'bg-white border-slate-200'
          }`}
        >
          {/* Notebook Selector Dropdown */}
          <div className="p-3 border-b border-gemini-border/40">
            <label className="text-[10px] font-bold opacity-60 uppercase tracking-wider block mb-1">
              {t.notebooks} ({notebooks.length})
            </label>
            <select
              value={activeNotebookId}
              onChange={(e) => setActiveNotebookId(e.target.value)}
              className={`w-full text-xs font-semibold rounded-xl px-2.5 py-2 border outline-none cursor-pointer ${
                isDark
                  ? 'bg-[#1e1f20] border-white/10 text-gray-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {notebooks.map((nb) => (
                <option key={nb.id} value={nb.id}>
                  {nb.title} ({nb.sources.length} مصادر)
                </option>
              ))}
            </select>
          </div>

          {/* Sources Header & Vault / Upload Buttons */}
          <div className="p-2.5 border-b border-gemini-border/40 flex items-center justify-between gap-1.5">
            <button
              onClick={() => setIsVaultModalOpen(true)}
              className="text-xs font-bold flex items-center gap-1.5 hover:text-blue-400 transition-colors"
              title={lang === 'ar' ? 'فتح مستودع ومخزن الملفات بالكامل' : 'Open Document Vault'}
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'مخزن الملفات' : 'Vault'}</span>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded-full font-mono">
                {activeNotebook?.sources.length || 0}
              </span>
            </button>
            <div className="flex items-center gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e.target.files)}
                multiple
                accept=".pdf,.docx,.doc,.txt,.py,.csv,.json,.md"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-medium px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all shadow-sm disabled:opacity-50 shrink-0"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isUploading ? t.indexing : t.addSources}</span>
              </button>
            </div>
          </div>

          {isLoadingSource && (
            <div className="p-2 text-center text-xs text-blue-400 flex items-center justify-center gap-1.5 border-b border-blue-500/20 bg-blue-500/10 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{lang === 'ar' ? 'جاري فتح وتحضير محتوى المستند...' : 'Loading document content...'}</span>
            </div>
          )}

          {/* Drag & Drop Upload Dropzone if no sources */}
          {activeNotebook && activeNotebook.sources.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`m-3 p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDark
                  ? 'border-white/10 hover:border-blue-500/50 bg-white/[0.02]'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50'
              }`}
            >
              <UploadCloud className="w-8 h-8 text-blue-400 mb-2 animate-bounce" />
              <p className="text-xs font-medium mb-1">{t.dropSources}</p>
              <span className="text-[10px] opacity-60">PDF, DOCX, TXT, PY, CSV</span>
            </div>
          )}

          {/* List of Source Cards */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {activeNotebook?.sources.map((source) => {
              const isSelected = selectedSourceIds.includes(source.id);
              return (
                <div
                  key={source.id}
                  className={`p-3 rounded-2xl border text-xs transition-all relative flex flex-col gap-2 ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600/10 border-blue-500/40 text-blue-200 shadow-sm'
                        : 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-sm'
                      : isDark
                      ? 'bg-[#1a1b1d] border-white/5 text-gray-300 hover:border-white/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {/* Row 1: Checkbox + Icon + Clean File Name */}
                  <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSourceSelection(source.id)}
                      className="rounded accent-blue-600 shrink-0 cursor-pointer w-3.5 h-3.5"
                      title={lang === 'ar' ? 'تضمين في التحليل والبحث' : 'Include in analysis'}
                    />
                    <div className="shrink-0">{getSourceIcon(source.file_type)}</div>
                    <span
                      className="font-semibold text-xs truncate flex-1 select-none"
                      title={source.name}
                    >
                      {cleanFileName(source.name)}
                    </span>
                  </div>

                  {/* Row 2: Metadata Pills & Action Buttons */}
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/5 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 opacity-85 truncate min-w-0" dir="ltr">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/15 uppercase font-bold text-blue-400 border border-blue-500/20">
                        {source.file_type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-gray-300">
                        {source.page_count} {t.pages}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-gray-300 font-mono inline-block" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                        {source.size_human}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setPdfViewMode('native');
                          handleOpenSourceViewer(source.id);
                        }}
                        className="p-1 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title={lang === 'ar' ? 'معاينة وعرض المستند' : 'Preview Document'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenSourceEditor(source.id)}
                        className="p-1 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors"
                        title={lang === 'ar' ? 'تعديل بسيط على المحتوى' : 'Quick Edit Content'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={`/api/notebooks/${activeNotebook?.id}/sources/${source.id}/file`}
                        download={source.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title={lang === 'ar' ? 'تحميل الملف الأصلي' : 'Download File'}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title={lang === 'ar' ? 'حذف المصدر' : 'Delete Source'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delete Active Notebook footer */}
          <div className="p-2.5 border-t border-gemini-border/40 flex justify-between items-center text-xs safe-bottom">
            <button
              onClick={() => handleDeleteNotebook(activeNotebook.id)}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>{lang === 'ar' ? 'حذف هذا الدفتر' : 'Delete Notebook'}</span>
            </button>
            <span className="text-[10px] opacity-50 font-mono">
              {activeNotebook?.sources.reduce((acc, s) => acc + s.chunk_count, 0) || 0} Chunks
            </span>
          </div>
        </div>

        {/* Center Canvas: Dynamic Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-w-0 w-full">
          {/* Quick Learning Action Starter Chips (Available in Chat Mode) */}
          {activeMode === 'chat' && (
            <div
              className={`px-3 sm:px-4 py-2 border-b flex items-center space-x-2 space-x-reverse overflow-x-auto no-scrollbar text-xs shrink-0 ${
                isDark ? 'bg-[#151618] border-gemini-border/40' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                {lang === 'ar' ? 'أوامر سريعة:' : 'Quick Actions:'}
              </span>

              <button
                onClick={() => handleSendChat(lang === 'ar' ? 'اشرح لي محتوى المستندات المرفوعة بالتفصيل مع تبسيط المفاهيم الصعبة والقوانين الرياضية' : 'Explain the core material step-by-step with analogies and principles', 'explain')}
                className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0 transition-all flex items-center gap-1 active:scale-95 shadow-sm"
              >
                <Brain className="w-3 h-3" />
                <span>{lang === 'ar' ? 'شرح وتبسيط' : 'Explain Concepts'}</span>
              </button>

              <button
                onClick={() => handleSendChat(lang === 'ar' ? 'حل ووضح المسائل والتمارين الموجودة في المستندات مع خطوات الحل والقوانين المستخدمة' : 'Solve and walk through the problems in the sources step-by-step', 'solve')}
                className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 transition-all flex items-center gap-1 active:scale-95 shadow-sm"
              >
                <Lightbulb className="w-3 h-3" />
                <span>{lang === 'ar' ? 'حل المسائل' : 'Solve Problems'}</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('study');
                  setStudySubTab('summary');
                  handleGenerateStudyTools(true);
                }}
                className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0 transition-all flex items-center gap-1 active:scale-95 shadow-sm"
              >
                <GraduationCap className="w-3 h-3" />
                <span>{lang === 'ar' ? 'ملخص شامل' : 'Deep Summary'}</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('study');
                  setStudySubTab('quiz');
                  handleGenerateStudyTools(true);
                }}
                className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 transition-all flex items-center gap-1 active:scale-95 shadow-sm"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{lang === 'ar' ? 'اختبار تدريبي' : 'Exam Quiz'}</span>
              </button>
            </div>
          )}

          {/* MODE 1: Grounded Source Chat (NotebookLM Style) */}
          {activeMode === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm transition-all ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : isDark
                          ? 'bg-[#1e1f20] border border-gemini-border text-gray-200 rounded-bl-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap font-sans font-medium text-xs leading-relaxed">{msg.text}</div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed font-sans">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={notebookMarkdownComponents}>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Grounded Citations Badges below assistant message */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider block w-full mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            {t.citations}:
                          </span>
                          {msg.citations.map((cite, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveCitation(cite)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-mono bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <FileText className="w-3 h-3 text-blue-400" />
                              <span className="font-semibold">{cleanFileName(cite.source_name)}</span>
                              <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">ص {cite.page}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick pedagogical assistant actions */}
                      {msg.role === 'assistant' && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleSendChat(
                                lang === 'ar'
                                  ? 'أعد شرح الرد السابق بأسلوب مبسط جداً لشخص ليس لديه أي خلفية تقنية، واستخدم تشبيهاً من الحياة اليومية ومثالاً بسيطاً من سطرين فقط.'
                                  : 'Please re-explain the previous response in very simple terms for someone with no technical background, using a daily-life analogy and a minimal 2-line example.',
                                'explain'
                              )
                            }
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 transition-all text-[10px] font-medium active:scale-95"
                            title={lang === 'ar' ? 'تبسيط الشرح بأسلوب سلس وتشبيه واقعي' : "Explain Like I'm 10"}
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>{lang === 'ar' ? '👶 بسّطهالي أكتر' : 'ELI5 (Simplify)'}</span>
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.text)}
                            className="px-2 py-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors text-[10px] flex items-center gap-1"
                            title={t.copy}
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>{t.copy}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isQuerying && (
                  <div className="flex items-center space-x-2 space-x-reverse text-xs opacity-70 p-2 animate-pulse">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>
                      {lang === 'ar'
                        ? 'جاري الاسترجاع الذكي والاتصال بموديل الذكاء الاصطناعي وتوثيق الحلول...'
                        : 'Retrieving sources, searching web knowledge, and synthesizing AI answer...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div
                className={`p-2 sm:p-3 border-t shrink-0 safe-bottom transition-colors ${
                  isDark ? 'bg-gemini-sidebar/50 border-gemini-border' : 'bg-white border-slate-200'
                }`}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 w-full max-w-4xl mx-auto"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      enableWebSearch
                        ? lang === 'ar'
                          ? 'اسأل سؤالاً، أو اطلب شرح مسألة (المصادر + الويب)...'
                          : 'Ask a question (Sources + Web)...'
                        : t.askNotebookPlaceholder
                    }
                    disabled={isQuerying}
                    className={`flex-1 min-w-0 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs outline-none border transition-all ${
                      isDark
                        ? 'bg-[#1a1b1d] border-white/10 focus:border-amber-500 text-gray-200'
                        : 'bg-slate-50 border-slate-300 focus:border-amber-500 text-slate-800'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isQuerying || !chatInput.trim()}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-1.5 shrink-0"
                  >
                    <span className="hidden sm:inline">{t.send}</span>
                    <ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODE 2: Study Guide & Intelligence Suite */}
          {activeMode === 'study' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              {/* Subtabs for Study Tools */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pb-2.5 border-b border-gemini-border/40 shrink-0">
                <div className="flex items-center space-x-2 space-x-reverse overflow-x-auto no-scrollbar py-0.5 max-w-full">
                  <button
                    onClick={() => setStudySubTab('summary')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${
                      studySubTab === 'summary'
                        ? 'bg-purple-600 text-white shadow'
                        : isDark
                        ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📝 {t.executiveSummary}
                  </button>

                  <button
                    onClick={() => setStudySubTab('flashcards')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${
                      studySubTab === 'flashcards'
                        ? 'bg-blue-600 text-white shadow'
                        : isDark
                        ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    🗂️ {t.flashcards} ({studyData?.flashcards.length || 0})
                  </button>

                  <button
                    onClick={() => setStudySubTab('quiz')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${
                      studySubTab === 'quiz'
                        ? 'bg-emerald-600 text-white shadow'
                        : isDark
                        ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ❓ {t.practiceQuiz} ({studyData?.quiz.length || 0})
                  </button>

                  <button
                    onClick={() => setStudySubTab('concepts')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${
                      studySubTab === 'concepts'
                        ? 'bg-amber-600 text-white shadow'
                        : isDark
                        ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    🔑 {t.keyConcepts}
                  </button>
                </div>

                <button
                  onClick={() => handleGenerateStudyTools(true)}
                  disabled={isGeneratingStudy}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isGeneratingStudy ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingStudy ? t.indexing : lang === 'ar' ? 'توليد ذكي جديد (Gemini AI)' : 'Regenerate via AI'}</span>
                </button>
              </div>

              {/* Subtab Body */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1">
                {/* 1. Summary View */}
                {studySubTab === 'summary' && (
                  <div className="space-y-4 max-w-3xl">
                    <div
                      className={`p-5 rounded-2xl border text-xs leading-relaxed space-y-3 ${
                        isDark ? 'bg-[#1a1b1d] border-gemini-border text-gray-200' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gemini-border/40">
                        <span className="font-bold text-sm text-purple-400 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          {t.executiveSummary}
                        </span>
                        <button
                          onClick={() => {
                            if (studyData?.summary && activeNotebook) {
                              downloadPDFDirectly(studyData.summary, {
                                filename: `${activeNotebook.title}_Summary.pdf`,
                                title: activeNotebook.title,
                                modelName: 'R3 NotebookLM AI',
                              });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 text-[11px] font-medium flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t.downloadPdf}</span>
                        </button>
                      </div>

                      <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                        {studyData?.summary || (isGeneratingStudy ? 'جاري التحليل المعمق وتوليد الدليل الدراسي عبر Gemini AI...' : t.indexing)}
                      </div>

                      {studyData?.key_points && studyData.key_points.length > 0 && (
                        <div className="pt-3 border-t border-gemini-border/40 space-y-2">
                          <span className="font-bold text-xs opacity-80 block text-amber-400">
                            {lang === 'ar' ? '📌 أهم النقاط الرئيسية المستخلصة:' : '📌 Core Key Points:'}
                          </span>
                          <ul className="list-disc list-inside space-y-1.5 opacity-90 text-[11px]">
                            {studyData.key_points.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Interactive Flashcards View */}
                {studySubTab === 'flashcards' && (
                  <div className="flex flex-col items-center justify-center py-6 max-w-xl mx-auto space-y-4">
                    {studyData?.flashcards && studyData.flashcards.length > 0 ? (
                      <>
                        <div className="text-xs font-mono opacity-70">
                          {currentFlashcardIndex + 1} / {studyData.flashcards.length}
                        </div>

                        {/* Interactive 3D Flip Card */}
                        <div
                          onClick={() => setIsCardFlipped(!isCardFlipped)}
                          className={`w-full min-h-[240px] rounded-3xl p-6 border shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:scale-[1.01] ${
                            isCardFlipped
                              ? 'bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 border-purple-500/50 text-purple-100'
                              : isDark
                              ? 'bg-[#1e1f20] border-gemini-border text-gray-100'
                              : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] opacity-60">
                            <span className="font-bold uppercase tracking-wider">
                              {isCardFlipped ? (lang === 'ar' ? 'الإجابة والتفسير' : 'Answer') : (lang === 'ar' ? 'سؤال المراجعة' : 'Question')}
                            </span>
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono">
                              {studyData.flashcards[currentFlashcardIndex].source_name} - {t.sourcePage}{' '}
                              {studyData.flashcards[currentFlashcardIndex].page}
                            </span>
                          </div>

                          <div className="text-center my-auto px-4 py-4">
                            <p className="text-sm md:text-base font-semibold leading-relaxed">
                              {isCardFlipped
                                ? studyData.flashcards[currentFlashcardIndex].answer
                                : studyData.flashcards[currentFlashcardIndex].question}
                            </p>
                          </div>

                          <div className="text-center text-[10px] opacity-50 font-mono">
                            {t.flipCard}
                          </div>
                        </div>

                        {/* Card Controls */}
                        <div className="flex items-center space-x-3 space-x-reverse pt-2">
                          <button
                            onClick={() => {
                              setIsCardFlipped(false);
                              setCurrentFlashcardIndex((prev) => Math.max(0, prev - 1));
                            }}
                            disabled={currentFlashcardIndex === 0}
                            className="p-2.5 rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
                          >
                            <ChevronRight className={`w-5 h-5 ${isRtl ? '' : 'rotate-180'}`} />
                          </button>

                          <button
                            onClick={() => setIsCardFlipped(!isCardFlipped)}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow"
                          >
                            {isCardFlipped ? (lang === 'ar' ? 'إعادة للسؤال' : 'Show Question') : (lang === 'ar' ? 'كشف الإجابة' : 'Reveal Answer')}
                          </button>

                          <button
                            onClick={() => {
                              setIsCardFlipped(false);
                              setCurrentFlashcardIndex((prev) =>
                                Math.min(studyData.flashcards.length - 1, prev + 1)
                              );
                            }}
                            disabled={currentFlashcardIndex === studyData.flashcards.length - 1}
                            className="p-2.5 rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
                          >
                            <ChevronLeft className={`w-5 h-5 ${isRtl ? '' : 'rotate-180'}`} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs opacity-60 text-center py-10">
                        {lang === 'ar' ? 'جاري توليد بطاقات المراجعة بالذكاء الاصطناعي...' : 'No flashcards available.'}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Interactive Practice Quiz View */}
                {studySubTab === 'quiz' && (
                  <div className="space-y-4 max-w-3xl pb-10">
                    {studyData?.quiz && studyData.quiz.length > 0 ? (
                      studyData.quiz.map((q, qIndex) => {
                        const selectedOption = userQuizAnswers[q.id];
                        const isAnswered = !!selectedOption;
                        const isCorrect = selectedOption === q.correct_option;

                        return (
                          <div
                            key={q.id}
                            className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                              isDark ? 'bg-[#1a1b1d] border-gemini-border' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-xs text-blue-400">
                                السؤال {qIndex + 1}:
                              </span>
                              <span className="text-[10px] opacity-60 font-mono">
                                [{q.source_name} - ص {q.page}]
                              </span>
                            </div>

                            <p className="font-medium text-xs text-gray-200">{q.question}</p>

                            {/* Options */}
                            <div className="space-y-1.5 pt-1">
                              {q.options.map((opt) => {
                                const isThisSelected = selectedOption === opt.key;
                                const isThisCorrect = q.correct_option === opt.key;

                                let optClass = isDark
                                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800';

                                if (isAnswered) {
                                  if (isThisCorrect) {
                                    optClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                                  } else if (isThisSelected) {
                                    optClass = 'bg-rose-500/20 border-rose-500 text-rose-300';
                                  }
                                }

                                return (
                                  <button
                                    key={opt.key}
                                    onClick={() => {
                                      if (!isAnswered) {
                                        setUserQuizAnswers((prev) => ({ ...prev, [q.id]: opt.key }));
                                      }
                                    }}
                                    className={`w-full p-2.5 rounded-xl border text-right flex items-center space-x-2.5 space-x-reverse transition-all ${optClass}`}
                                  >
                                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-mono text-[10px] shrink-0">
                                      {opt.key}
                                    </span>
                                    <span className="flex-1">{opt.text}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Explanation Feedback */}
                            {isAnswered && (
                              <div
                                className={`p-3 rounded-xl border text-[11px] mt-2 ${
                                  isCorrect
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                }`}
                              >
                                <span className="font-bold block mb-1">
                                  {isCorrect ? t.correct : t.incorrect}
                                </span>
                                <p className="opacity-90">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs opacity-60 text-center py-10">
                        {lang === 'ar' ? 'جاري إعداد وتوليد أسئلة الاختبار...' : 'No quiz questions available.'}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Key Concepts Glossary View */}
                {studySubTab === 'concepts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
                    {studyData?.key_concepts && studyData.key_concepts.length > 0 ? (
                      studyData.key_concepts.map((kc) => (
                        <div
                          key={kc.id}
                          className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                            isDark
                              ? 'bg-[#1a1b1d] border-gemini-border hover:border-amber-500/40'
                              : 'bg-white border-slate-200 hover:border-amber-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-amber-400">{kc.term}</span>
                            <span className="text-[10px] opacity-60 font-mono">
                              {t.sourcePage} {kc.page}
                            </span>
                          </div>
                          <p className="opacity-80 leading-relaxed text-[11px]">{kc.definition}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs opacity-60 text-center py-10 col-span-2">
                        {lang === 'ar' ? 'لا توجد مصطلحات مستخرجة بعد.' : 'No key concepts extracted.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 3: Direct Semantic Search */}
          {activeMode === 'search' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              <form onSubmit={handleSearch} className="flex items-center space-x-2 space-x-reverse mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث في ملايين الكلمات داخل الملازم والكتب...' : 'Search inside all uploaded documents...'}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-xs outline-none border transition-all ${
                    isDark
                      ? 'bg-[#1a1b1d] border-white/10 focus:border-emerald-500 text-gray-200'
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-500 text-slate-800'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'بحث دلالي' : 'Search'}</span>
                </button>
              </form>

              <div className="flex-1 overflow-y-auto space-y-3">
                {searchResults.map((chunk, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
                      isDark ? 'bg-[#1e1f20] border-gemini-border' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {chunk.source_name} (ص {chunk.page})
                      </span>
                      {chunk.similarity !== undefined && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                          مطابقة {Math.round(chunk.similarity * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="opacity-80 leading-relaxed font-sans">{chunk.text}</p>
                  </div>
                ))}
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-12 text-xs opacity-50">
                    {lang === 'ar' ? 'اكتب كلمة أو مفهوماً للبحث في المتجهات الدلالية للمستندات.' : 'Type a query to search local semantic chunks.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Citation Preview Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl space-y-3 ${
              isDark ? 'bg-[#1e1f20] border-gemini-border text-gray-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gemini-border/40">
              <span className="font-bold text-xs text-blue-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {activeCitation.source_name} - {t.sourcePage} {activeCitation.page}
              </span>
              <button
                onClick={() => setActiveCitation(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs leading-relaxed opacity-90 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 font-sans">
              <span className="text-[10px] font-bold text-blue-400 block mb-1">
                {lang === 'ar' ? 'المقطع المقتبس من المصدر:' : 'Exact Grounded Source Excerpt:'}
              </span>
              "{activeCitation.excerpt}"
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveCitation(null)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Notebook Modal */}
      {isCreatingNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateNotebook}
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
              isDark ? 'bg-[#1e1f20] border-gemini-border text-gray-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gemini-border/40">
              <span className="font-bold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                {t.createNotebook}
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingNotebook(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 opacity-80">{t.notebookTitle}</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: فيزياء حديثة - الترم الثاني"
                  className={`w-full rounded-xl px-3 py-2 border outline-none ${
                    isDark ? 'bg-[#1a1b1d] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">{t.notebookDesc}</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="وصف مختصر لموضوع الدفتر..."
                  className={`w-full rounded-xl px-3 py-2 border outline-none ${
                    isDark ? 'bg-[#1a1b1d] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingNotebook(false)}
                className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow"
              >
                {t.createNotebook}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* 1. UNIVERSAL NATURAL FILE VIEWER MODAL */}
      {viewingSource && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200"
          onClick={() => setViewingSource(null)}
        >
          <div
            className={`w-full max-w-6xl h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isDark ? 'bg-[#161719] border-gemini-border text-gray-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div
              className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                isDark ? 'border-gemini-border bg-[#1d1f23]' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3 space-x-reverse min-w-0 flex-1">
                <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400 shrink-0">
                  {getSourceIcon(viewingSource.file_type)}
                </div>
                <div className="truncate min-w-0">
                  <div className="font-bold text-sm truncate flex items-center gap-2" title={cleanFileName(viewingSource.name)}>
                    <span className="truncate">{cleanFileName(viewingSource.name)}</span>
                    <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-bold shrink-0">
                      {viewingSource.file_type}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-65 font-mono mt-0.5">
                    {viewingSource.size_human} • {lang === 'ar' ? 'عرض طبيعي للملف' : 'Native Format Viewer'}
                  </div>
                </div>
              </div>

              {/* Header Action Tools */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* PDF Switcher: Native PDF vs Extracted Text */}
                {viewingSource.file_type.toLowerCase() === 'pdf' && (
                  <div className="flex items-center p-0.5 rounded-xl bg-black/20 border border-white/10 text-xs font-medium">
                    <button
                      onClick={() => setPdfViewMode('native')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        pdfViewMode === 'native'
                          ? 'bg-blue-600 text-white shadow'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {lang === 'ar' ? '📄 مستند PDF الأصلي' : 'Native PDF'}
                    </button>
                    <button
                      onClick={() => setPdfViewMode('text')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        pdfViewMode === 'text'
                          ? 'bg-purple-600 text-white shadow'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {lang === 'ar' ? '📝 النص المستخرج' : 'Extracted Text'}
                    </button>
                  </div>
                )}

                {/* Edit Button if editable */}
                {viewingSource.is_editable && (
                  <button
                    onClick={() => {
                      const src = viewingSource;
                      setViewingSource(null);
                      setEditingSource({
                        id: src.source_id,
                        name: src.name,
                        file_type: src.file_type,
                        content: src.content,
                        is_editable: true,
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 shadow"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تعديل المحتوى' : 'Edit Content'}</span>
                  </button>
                )}

                {/* Copy Text Button */}
                {viewingSource.content && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewingSource.content);
                      setCopiedViewerText(true);
                      setTimeout(() => setCopiedViewerText(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-medium flex items-center gap-1.5"
                    title={lang === 'ar' ? 'نسخ النص بالكامل' : 'Copy Text'}
                  >
                    {copiedViewerText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedViewerText ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
                  </button>
                )}

                {/* Open in New Window */}
                <a
                  href={`/api/notebooks/${activeNotebook?.id}/sources/${viewingSource.source_id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-medium flex items-center gap-1.5"
                  title={lang === 'ar' ? 'فتح في علامة تبويب جديدة' : 'Open in new tab'}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'نافذة جديدة' : 'New Tab'}</span>
                </a>

                {/* Download Button */}
                <a
                  href={`/api/notebooks/${activeNotebook?.id}/sources/${viewingSource.source_id}/file`}
                  download={viewingSource.name}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تحميل' : 'Download'}</span>
                </a>

                {/* Close Button */}
                <button
                  onClick={() => setViewingSource(null)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Multi-Format Dynamic Viewer */}
            <div className="flex-1 overflow-hidden relative bg-[#0d0e10]/40 flex flex-col">
              {/* FORMAT 1: PDF Viewer */}
              {viewingSource.file_type.toLowerCase() === 'pdf' ? (
                pdfViewMode === 'native' ? (
                  <div className="w-full h-full flex-1 bg-[#2a2a2e] relative">
                    <iframe
                      src={`/api/notebooks/${activeNotebook?.id}/sources/${viewingSource.source_id}/file#toolbar=1&navpanes=1`}
                      className="w-full h-full border-0 bg-white"
                      title={viewingSource.name}
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-6 font-sans text-xs md:text-sm leading-relaxed whitespace-pre-wrap select-text">
                    {viewingSource.content || (lang === 'ar' ? 'لا يوجد نص مستخرج' : 'No extracted text')}
                  </div>
                )
              ) : /* FORMAT 2: Images */
              ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(viewingSource.file_type.toLowerCase()) ? (
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-black/40">
                  <img
                    src={`/api/notebooks/${activeNotebook?.id}/sources/${viewingSource.source_id}/file`}
                    alt={viewingSource.name}
                    className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl mx-auto"
                  />
                </div>
              ) : /* FORMAT 3: Video */
              ['mp4', 'webm', 'mov', 'mkv'].includes(viewingSource.file_type.toLowerCase()) ? (
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-black/60">
                  <video
                    controls
                    src={`/api/notebooks/${activeNotebook?.id}/sources/${viewingSource.source_id}/file`}
                    className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl mx-auto"
                  />
                </div>
              ) : /* FORMAT 4: Audio */
              ['mp3', 'wav', 'ogg', 'm4a'].includes(viewingSource.file_type.toLowerCase()) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-5">
                  <div className="w-20 h-20 rounded-3xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-2xl">
                    <Music className="w-10 h-10 animate-bounce" />
                  </div>
                  <h4 className="font-bold text-sm">{viewingSource.name}</h4>
                  <audio
                    controls
                    src={`/api/notebooks/${activeNotebook?.id}/sources/${viewingSource.source_id}/file`}
                    className="w-full max-w-md shadow-lg"
                  />
                </div>
              ) : /* FORMAT 5: Spreadsheets / CSV Tabular View */
              viewingSource.file_type.toLowerCase() === 'csv' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs bg-white/[0.02]">
                    <span className="opacity-70 font-mono">
                      {lang === 'ar' ? 'عرض بيانات الجدول (CSV Table)' : 'Tabular CSV View'}
                    </span>
                    <button
                      onClick={() => {
                        const src = viewingSource;
                        setViewingSource(null);
                        setEditingSource({
                          id: src.source_id,
                          name: src.name,
                          file_type: src.file_type,
                          content: src.content,
                          is_editable: true,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                    >
                      {lang === 'ar' ? '✏️ تعديل الجدول' : '✏️ Edit CSV'}
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-xs font-mono border-collapse border border-white/10 text-start">
                      <tbody>
                        {viewingSource.content
                          .trim()
                          .split('\n')
                          .slice(0, 150)
                          .map((rowText, rIdx) => {
                            const cols = rowText.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
                            const isHeader = rIdx === 0;
                            return (
                              <tr
                                key={rIdx}
                                className={
                                  isHeader
                                    ? isDark
                                      ? 'bg-blue-600/20 font-bold text-blue-300 border-b border-white/20'
                                      : 'bg-blue-100 font-bold text-blue-900 border-b border-slate-300'
                                    : rIdx % 2 === 0
                                    ? isDark
                                      ? 'bg-white/[0.02]'
                                      : 'bg-slate-50'
                                    : ''
                                }
                              >
                                {cols.map((col, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="p-2.5 border border-white/10 max-w-xs truncate select-text"
                                    title={col}
                                  >
                                    {col}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* FORMAT 6: Code & Plain Text with syntax styling */
                <div className="flex-1 overflow-y-auto p-5 text-xs font-mono leading-relaxed select-text whitespace-pre-wrap">
                  {viewingSource.content || (
                    <div className="text-center opacity-50 py-10">
                      {lang === 'ar' ? 'لا يوجد محتوى نصي متاح لهذا الملف' : 'No text content available for this file'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. SIMPLE DOCUMENT EDITOR MODAL */}
      {editingSource && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEditingSource(null)}
        >
          <div
            className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isDark ? 'bg-[#18191a] border-gemini-border text-gray-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Editor Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gemini-border bg-[#202124]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center space-x-3 space-x-reverse min-w-0">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-sm truncate flex items-center gap-2">
                    <span>{lang === 'ar' ? 'محرر مستند النوتبوك:' : 'Notebook Editor:'}</span>
                    <span className="text-purple-400 font-mono">{cleanFileName(editingSource.name)}</span>
                  </div>
                  <div className="text-[11px] opacity-65">
                    {lang === 'ar' ? 'قم بتعديل المحتوى واضغط حفظ لتحديث الفهرس وسياق الذكاء الاصطناعي تلقائياً.' : 'Edit text content and save to automatically update embeddings and grounding context.'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveSourceContent}
                  disabled={editingSource.is_saving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingSource.is_saving ? (lang === 'ar' ? 'جاري الحفظ والفهرسة...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}</span>
                </button>
                <button
                  onClick={() => setEditingSource(null)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Editor Textarea */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <textarea
                value={editingSource.content}
                onChange={(e) => setEditingSource({ ...editingSource, content: e.target.value })}
                className={`w-full flex-1 p-4 rounded-2xl border font-mono text-xs leading-relaxed outline-none resize-none transition-colors ${
                  isDark
                    ? 'bg-[#121314] border-gemini-border text-gray-200 focus:border-purple-500/60'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-purple-500'
                }`}
                placeholder={lang === 'ar' ? 'اكتب أو عدل محتوى المستند هنا...' : 'Edit document text content here...'}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. DEDICATED NOTEBOOK FILE VAULT MODAL */}
      {isVaultModalOpen && activeNotebook && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsVaultModalOpen(false)}
        >
          <div
            className={`w-full max-w-5xl max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isDark ? 'bg-[#18191a] border-gemini-border text-gray-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Vault Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gemini-border bg-[#202124]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>{lang === 'ar' ? 'مخزن ملفات ومستندات النوتبوك' : 'Notebook Document Vault'}</span>
                    <span className="text-xs font-mono font-normal bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      {activeNotebook.title}
                    </span>
                  </h3>
                  <p className="text-xs opacity-65 mt-0.5">
                    {lang === 'ar'
                      ? 'استعراض وتحرير وتحميل جميع ملفات ومراجع النوتبوك بكل الصيغ (PDF, DOCX, Code, CSV, Markdown)'
                      : 'Explore, edit, preview, and download all notebook files across all formats.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'رفع ملفات جديدة' : 'Upload Files'}</span>
                </button>
                <button
                  onClick={() => setIsVaultModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Vault Search Bar */}
            <div className="p-3 border-b border-gemini-border/40 flex items-center gap-2">
              <Search className="w-4 h-4 opacity-50 shrink-0" />
              <input
                type="text"
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                placeholder={lang === 'ar' ? 'بحث في ملفات المخزن بالاسم أو الصيغة...' : 'Search files in vault...'}
                className={`w-full bg-transparent text-xs outline-none ${isDark ? 'text-gray-200' : 'text-slate-800'}`}
              />
              {vaultSearch && (
                <button onClick={() => setVaultSearch('')} className="p-1 opacity-60 hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Vault Files Grid / List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeNotebook.sources.filter((s) => !vaultSearch || s.name.toLowerCase().includes(vaultSearch.toLowerCase()) || s.file_type.toLowerCase().includes(vaultSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-16 opacity-50">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{lang === 'ar' ? 'لا توجد ملفات مطابقة في المخزن' : 'No matching files in vault'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeNotebook.sources
                    .filter((s) => !vaultSearch || s.name.toLowerCase().includes(vaultSearch.toLowerCase()) || s.file_type.toLowerCase().includes(vaultSearch.toLowerCase()))
                    .map((s) => (
                      <div
                        key={s.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                          isDark
                            ? 'bg-[#1b1c1e] hover:bg-[#222326] border-white/5 hover:border-blue-500/30'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-center space-x-3 space-x-reverse truncate min-w-0">
                          <div className="shrink-0">{getSourceIcon(s.file_type)}</div>
                          <div className="truncate min-w-0">
                            <div className="font-semibold text-xs truncate" title={cleanFileName(s.name)}>
                              {cleanFileName(s.name)}
                            </div>
                            <div className="text-[10px] opacity-65 flex items-center gap-1.5 font-mono mt-0.5">
                              <span className="uppercase font-bold text-blue-400">{s.file_type}</span>
                              <span>•</span>
                              <span>{s.size_human}</span>
                              <span>•</span>
                              <span>{s.chunk_count} {t.chunks}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenSourceViewer(s.id)}
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                            title={lang === 'ar' ? 'معاينة المستند' : 'Preview'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenSourceEditor(s.id)}
                            className="p-1.5 rounded-lg hover:bg-purple-500/20 text-purple-400 transition-colors"
                            title={lang === 'ar' ? 'تعديل المحتوى' : 'Edit'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <a
                            href={`/api/notebooks/${activeNotebook.id}/sources/${s.id}/file`}
                            download={s.name}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title={lang === 'ar' ? 'تحميل' : 'Download'}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteSource(s.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
