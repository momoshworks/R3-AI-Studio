import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  Search,
  Sparkles,
  CheckCircle2,
  Layers,
  FileCode,
  GraduationCap,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  X,
  RotateCcw,
  Download,
  FileSpreadsheet,
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
              ? `مرحباً بك في **${activeNotebook.title}**! يمكنك الآن سؤالي عن أي جزئية في المستندات المرفوعة وسأجيبك مع الاستشهاد برقم الصفحة والمقطع بدقة، أو الانتقال لتبويب أدوات المذاكرة لتوليد الملخص والبطاقات والاختبارات.`
              : `Welcome to **${activeNotebook.title}**! You can now ask any question grounded in the uploaded sources with exact page citations, or explore the Study Tools for summaries, flashcards, and quizzes.`,
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
        // Refresh notebook data
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

  // Chat with Notebook (RAG)
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeNotebook || isQuerying) return;

    const userMsg: ChatHistoryItem = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: chatInput.trim(),
      timestamp: Date.now(),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    const query = chatInput.trim();
    setChatInput('');
    setIsQuerying(true);

    try {
      const res = await api.chatWithNotebook(
        activeNotebook.id,
        query,
        selectedSourceIds.length > 0 ? selectedSourceIds : undefined
      );

      const botMsg: ChatHistoryItem = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        text: res.answer,
        timestamp: Date.now(),
        citations: res.citations,
      };

      setChatHistory((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: lang === 'ar' ? '⚠️ حدث خطأ أثناء الاتصال بمحرك الاسترجاع.' : '⚠️ Error querying retrieval engine.',
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
        8,
        selectedSourceIds.length > 0 ? selectedSourceIds : undefined
      );
      setSearchResults(res.chunks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Generate / Load Study Tools
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
        className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 transition-colors ${
          isDark ? 'bg-gemini-sidebar/70 border-gemini-border' : 'bg-white/80 border-slate-200'
        } backdrop-blur-md z-10`}
      >
        <div className="flex items-center space-x-3 space-x-reverse min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 space-x-reverse">
              <h2 className="font-bold text-sm truncate">
                {activeNotebook?.title || t.notebookStudio}
              </h2>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {t.offlineReady}
              </span>
            </div>
            <p className="text-[11px] opacity-65 truncate max-w-sm">
              {activeNotebook?.description || t.hybridSearch}
            </p>
          </div>
        </div>

        {/* Action Tabs: Chat | Study Tools | Search */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <div
            className={`p-1 rounded-xl border flex items-center space-x-1 space-x-reverse text-xs ${
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
            className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/30 transition-all"
            title={t.newNotebook}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Body: Sources Sidebar + Dynamic Work Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Notebook Sources & Management Drawer (280px) */}
        <div
          className={`w-72 border-e flex flex-col shrink-0 transition-colors ${
            isDark ? 'bg-gemini-sidebar/40 border-gemini-border' : 'bg-white border-slate-200'
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

          {/* Sources Header & Upload Button */}
          <div className="p-3 border-b border-gemini-border/40 flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              {t.sources} ({activeNotebook?.sources.length || 0})
            </span>
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
              className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isUploading ? t.indexing : t.addSources}</span>
            </button>
          </div>

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
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {activeNotebook?.sources.map((source) => {
              const isSelected = selectedSourceIds.includes(source.id);
              return (
                <div
                  key={source.id}
                  className={`p-2.5 rounded-xl border text-xs transition-all relative group ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600/10 border-blue-500/40 text-blue-200'
                        : 'bg-blue-50/80 border-blue-300 text-blue-900'
                      : isDark
                      ? 'bg-[#1a1b1d] border-white/5 text-gray-300 hover:border-white/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start space-x-2.5 space-x-reverse min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSourceSelection(source.id)}
                      className="mt-1 rounded cursor-pointer accent-blue-600 shrink-0"
                      title={lang === 'ar' ? 'تضمين في البحث' : 'Include in query'}
                    />
                    <div className="mt-0.5">{getSourceIcon(source.file_type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate" title={source.name}>
                        {source.name}
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse text-[10px] opacity-65 mt-1 font-mono">
                        <span>{source.page_count} {t.pages}</span>
                        <span>•</span>
                        <span>{source.chunk_count} {t.chunks}</span>
                        <span>•</span>
                        <span>{source.size_human}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:bg-rose-500/20 rounded transition-opacity shrink-0"
                      title={lang === 'ar' ? 'حذف المصدر' : 'Delete Source'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delete Active Notebook footer */}
          <div className="p-2.5 border-t border-gemini-border/40 flex justify-between items-center text-xs">
            <button
              onClick={() => handleDeleteNotebook(activeNotebook.id)}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>{lang === 'ar' ? 'حذف هذا الدفتر' : 'Delete Notebook'}</span>
            </button>
            <span className="text-[10px] opacity-50 font-mono">
              {activeNotebook?.sources.reduce((acc, s) => acc + s.chunk_count, 0) || 0} Chunks Indexed
            </span>
          </div>
        </div>

        {/* Center Canvas: Dynamic Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
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
                      <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

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
                              className="px-2 py-1 rounded-lg text-[10px] font-mono bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 transition-all flex items-center gap-1"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              <span>
                                {cite.source_name} - {t.sourcePage} {cite.page}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isQuerying && (
                  <div className="flex items-center space-x-2 space-x-reverse text-xs opacity-70 p-2 animate-pulse">
                    <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري البحث والاسترجاع الدقيق مع توثيق الاستشهادات...' : 'Retrieving grounded source chunks with citations...'}</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div
                className={`p-3 border-t shrink-0 ${
                  isDark ? 'bg-gemini-sidebar/50 border-gemini-border' : 'bg-white border-slate-200'
                }`}
              >
                <form onSubmit={handleSendChat} className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={t.askNotebookPlaceholder}
                    disabled={isQuerying}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-xs outline-none border transition-all ${
                      isDark
                        ? 'bg-[#1a1b1d] border-white/10 focus:border-blue-500 text-gray-200'
                        : 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-800'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isQuerying || !chatInput.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>{t.send}</span>
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
              <div className="flex items-center justify-between pb-3 border-b border-gemini-border/40 shrink-0">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onClick={() => setStudySubTab('summary')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
                  <span>{isGeneratingStudy ? t.indexing : lang === 'ar' ? 'تحديث وتوليد جديد' : 'Regenerate'}</span>
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
                      <div className="flex items-center justify-between pb-2 border-b border-gemini-border/40">
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
                                modelName: 'R3 NotebookLM',
                              });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 text-[11px] font-medium flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t.downloadPdf}</span>
                        </button>
                      </div>

                      <div className="whitespace-pre-wrap font-sans">
                        {studyData?.summary || t.indexing}
                      </div>

                      {studyData?.key_points && studyData.key_points.length > 0 && (
                        <div className="pt-3 border-t border-gemini-border/40 space-y-2">
                          <span className="font-bold text-xs opacity-80 block">
                            {lang === 'ar' ? '📌 أهم النقاط الرئيسية المستخلصة:' : '📌 Core Key Points:'}
                          </span>
                          <ul className="list-disc list-inside space-y-1.5 opacity-90">
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
                          className={`w-full h-64 rounded-3xl p-6 border shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:scale-[1.01] ${
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

                          <div className="text-center my-auto px-4">
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
                        {lang === 'ar' ? 'لا توجد بطاقات مراجعة متاحة بعد.' : 'No flashcards available.'}
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
                        {lang === 'ar' ? 'لا توجد أسئلة اختبار بعد.' : 'No quiz questions available.'}
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
    </div>
  );
};
