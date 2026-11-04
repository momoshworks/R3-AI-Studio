import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Cpu,
  HardDrive,
  ChevronDown,
  LogOut,
  Key,
  Plus,
  Users,
  Bot,
  Check,
  Sun,
  Moon,
  Globe,
  Search,
  Activity,
  Menu,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatCanvas } from './components/ChatCanvas';
import { InputBar } from './components/InputBar';
import { UsefulToolsHub } from './components/UsefulToolsHub';
import { SettingsModal } from './components/SettingsModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { MediaVault } from './components/MediaVault';
import { BackgroundMediaPlayer } from './components/BackgroundMediaPlayer';
import { CommandPalette } from './components/CommandPalette';
import { NotebookStudio } from './components/NotebookStudio';
import { GlassLoginModal } from './components/GlassLoginModal';
import { DeveloperModal } from './components/DeveloperModal';
import { UpdateModal } from './components/UpdateModal';
import { checkGitHubRelease, ReleaseInfo } from './services/updateService';
import { api } from './services/api';
import {
  AttachedFile,
  ChatMessage,
  DriveStatus,
  GoogleUser,
  MediaItem,
  Session,
  SidebarTab,
  SystemMetrics,
  UserAccount,
} from './types';
import { translations, Language, Theme } from './utils/translations';

const getDisplayModelName = (modelId: string) => {
  const found = AVAILABLE_MODELS.flatMap((g) => g.models).find((m) => m.id === modelId);
  if (found) return found.name;
  return modelId.replace(/^Google\s+/i, '').replace(/^OpenAI\s+/i, '').replace(/\(.*\)/, '').trim();
};

const getShortModelName = (modelId: string) => {
  const name = getDisplayModelName(modelId);
  return name.replace(/^Google\s+/i, '').replace(/^ChatGPT\s+/i, 'GPT-').trim();
};

const AVAILABLE_MODELS = [
  {
    category: 'Google Gemini',
    models: [
      { id: 'Google Gemini (gemini-2.5-flash)', name: 'Gemini 2.5 Flash', desc: 'الأفضل في الذكاء والسرعة والاستدلال (موصى به)', tag: 'افتراضي' },
      { id: 'Google Gemini 2.0 Flash (gemini-2.0-flash)', name: 'Gemini 2.0 Flash', desc: 'فائق السرعة والاستجابة اللحظية', tag: 'سريع' },
      { id: 'Google Gemini Flash Lite (gemini-2.5-flash-lite)', name: 'Gemini Flash Lite', desc: 'فائق الخفة واقتصادي للمهام السريعة', tag: 'خفيف' },
      { id: 'Google Gemini 2.5 Pro (gemini-2.5-pro)', name: 'Gemini 2.5 Pro', desc: 'القدرات الأقوى في التحليل والبرمجة', tag: 'شامل' },
      { id: 'Google Gemini 1.5 Flash (gemini-1.5-flash-latest)', name: 'Gemini 1.5 Flash', desc: 'النموذج الكلاسيكي الموثوق', tag: 'كلاسيك' },
    ],
  },
  {
    category: 'ChatGPT / OpenAI',
    models: [
      { id: 'ChatGPT 4o Mini (gpt-4o-mini)', name: 'ChatGPT 4o-mini', desc: 'سريع وذكي واقتصادي للغاية', tag: 'شائع' },
      { id: 'ChatGPT 4o (gpt-4o)', name: 'ChatGPT 4o', desc: 'النموذج الأقوى متعدد الوسائط', tag: 'شامل' },
      { id: 'ChatGPT o3-mini (o3-mini)', name: 'ChatGPT o3-mini', desc: 'تفكير واستدلال عميق للأكواد', tag: 'تفكير' },
    ],
  },
];

export const App: React.FC = () => {
  // Theme & Language State
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('R3_LANG');
      return saved === 'en' || saved === 'ar' ? saved : 'ar';
    } catch {
      return 'ar';
    }
  });

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('R3_THEME');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const t = translations[lang];

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    try {
      localStorage.setItem('R3_THEME', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('R3_LANG', lang);
      document.documentElement.setAttribute('lang', lang);
    } catch {}
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation & UI State
  const [currentTab, setCurrentTab] = useState<SidebarTab>('chats');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('R3_IS_AUTHENTICATED') === 'true';
    } catch {
      return false;
    }
  });
  const [showDevModal, setShowDevModal] = useState<boolean>(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  // Check GitHub Releases for updates on startup
  useEffect(() => {
    checkGitHubRelease().then((info) => {
      if (info) {
        setReleaseInfo(info);
      }
    });
  }, []);

  // Global Ultra-Fast Keyboard Shortcuts & Menu Navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Ctrl+K / Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // New Chat (Ctrl+N / Cmd+N)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
        setCurrentTab('chats');
      }
      // Settings (Ctrl+, / Cmd+,)
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      // Instant Tab Navigation (Alt+1 to Alt+5)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') { e.preventDefault(); setCurrentTab('chats'); }
        if (e.key === '2') { e.preventDefault(); setCurrentTab('notebook'); }
        if (e.key === '3') { e.preventDefault(); setCurrentTab('tools'); }
        if (e.key === '4') { e.preventDefault(); setCurrentTab('media'); }
        if (e.key === '5') { e.preventDefault(); setCurrentTab('drive'); }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Accounts & API Keys
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser>({ authenticated: false });

  // Chat Sessions
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: 'session-1',
      title: lang === 'ar' ? 'محادثة ذكية جديدة' : 'New AI Session',
      timestamp: Date.now(),
      messages: [],
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-1');

  // Execution & Models
  const [selectedModel, setSelectedModel] = useState<string>('Google Gemini (gemini-2.5-flash)');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const stopGenerationRef = useRef<(() => void) | null>(null);

  // Global Background Media Player State (Persistent across all tabs)
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  // System & Backend Data
  const [isMetricsMenuOpen, setIsMetricsMenuOpen] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu_usage: 0,
    memory_used_mb: 0,
    memory_total_mb: 0,
    memory_percentage: 0,
    disk_free_gb: 0,
    disk_total_gb: 0,
  });
  const [driveStatus, setDriveStatus] = useState<DriveStatus>({
    authenticated: false,
  });

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const isChatGpt =
    selectedModel.toLowerCase().includes('gpt') ||
    selectedModel.toLowerCase().includes('o3');

  // Refresh Accounts & Settings
  const refreshUserData = async () => {
    try {
      const [accRes, setRes, user] = await Promise.allSettled([
        api.getAccounts(),
        api.getSettings(),
        api.getGoogleUser(),
      ]);

      if (accRes.status === 'fulfilled' && accRes.value.accounts) {
        setAccounts(accRes.value.accounts);
        setActiveAccount(accRes.value.active || accRes.value.accounts[0] || null);
      }
      if (setRes.status === 'fulfilled') {
        setHasApiKey(Boolean(setRes.value.has_api_key));
        setHasOpenaiKey(Boolean(setRes.value.has_openai_key));
      }
      if (user.status === 'fulfilled') {
        setGoogleUser(user.value);
        setDriveStatus(user.value);
      }
    } catch (err) {
      console.warn('Refresh user data notice:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const initData = async () => {
      try {
        const sys = await api.getSystemMetrics();
        setMetrics(sys);
      } catch {}
      await refreshUserData();
    };
    initData();

    // Telemetry pulse: idle-throttled to save CPU when window is inactive
    const fetchMetrics = async () => {
      if (document.hidden) return; // Do not consume CPU/disk when tab/window is minimized
      try {
        const sys = await api.getSystemMetrics();
        setMetrics(sys);
      } catch {}
    };

    const metricsInterval = setInterval(fetchMetrics, 10000);

    // Refresh immediately when returning to the app window
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMetrics();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(metricsInterval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const handleGoogleLogout = async () => {
    try {
      await api.logoutGoogle();
      setGoogleUser({ authenticated: false });
      setDriveStatus({ authenticated: false });
      setIsUserMenuOpen(false);
      localStorage.removeItem('R3_IS_AUTHENTICATED');
      setIsAuthenticated(false);
      refreshUserData();
    } catch (err) {
      console.error(err);
      localStorage.removeItem('R3_IS_AUTHENTICATED');
      setIsAuthenticated(false);
    }
  };

  const handleSwitchAccount = async (accId: string) => {
    try {
      const res = await api.switchAccount(accId);
      if (res.status === 'success') {
        setActiveAccount(res.active);
        setAccounts(res.accounts);
        setGoogleUser({
          authenticated: true,
          name: res.active.name,
          email: res.active.email,
          picture: res.active.picture,
        });
        setIsUserMenuOpen(false);
        refreshUserData();
      }
    } catch (err) {
      console.error('Failed to switch account:', err);
    }
  };

  // New Chat Session
  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: Session = {
      id: newId,
      title: lang === 'ar' ? 'محادثة جديدة' : 'New Chat',
      timestamp: Date.now(),
      messages: [],
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
  };

  // Delete Chat Session
  const handleDeleteSession = (id: string) => {
    const filtered = sessions.filter((s) => s.id !== id);
    if (filtered.length === 0) {
      const fallback: Session = {
        id: `session-${Date.now()}`,
        title: lang === 'ar' ? 'محادثة جديدة' : 'New Chat',
        timestamp: Date.now(),
        messages: [],
      };
      setSessions([fallback]);
      setActiveSessionId(fallback.id);
    } else {
      setSessions(filtered);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
    }
  };

  // Send Message & Stream Chat
  const handleSendMessage = (text: string, attachments?: AttachedFile[]) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments,
    };

    const assistantPlaceholderId = `msg-${Date.now() + 1}`;
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
    };

    setSessions((prevSessions) =>
      prevSessions.map((s) => {
        if (s.id === activeSessionId) {
          const isFirst = s.messages.length === 0;
          return {
            ...s,
            title: isFirst ? text.slice(0, 30) || (lang === 'ar' ? 'محادثة ذكية' : 'AI Chat') : s.title,
            messages: [...s.messages, userMessage, assistantMessage],
          };
        }
        return s;
      })
    );

    setIsGenerating(true);

    const chatHistory = [...activeSession.messages, userMessage];

    // High-performance RAF Chunk Buffer: groups rapid tokens and renders at 60fps
    let streamBuffer = '';
    let streamRafId: number | null = null;

    const flushStreamBuffer = () => {
      if (!streamBuffer) return;
      const flushedChunk = streamBuffer;
      streamBuffer = '';
      setSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, content: m.content + flushedChunk }
                  : m
              ),
            };
          }
          return s;
        })
      );
    };

    const scheduleStreamFlush = () => {
      if (streamRafId !== null) return;
      streamRafId = requestAnimationFrame(() => {
        streamRafId = null;
        flushStreamBuffer();
      });
    };

    const abort = api.streamChat(
      chatHistory,
      selectedModel,
      (chunk: string) => {
        streamBuffer += chunk;
        scheduleStreamFlush();
      },
      () => {
        if (streamRafId !== null) {
          cancelAnimationFrame(streamRafId);
          streamRafId = null;
        }
        flushStreamBuffer();
        setIsGenerating(false);
        stopGenerationRef.current = null;
      },
      (error: any) => {
        if (streamRafId !== null) {
          cancelAnimationFrame(streamRafId);
          streamRafId = null;
        }
        flushStreamBuffer();
        console.error('Chat stream error:', error);
        setSessions((prevSessions) =>
          prevSessions.map((s) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        content:
                          m.content ? `${m.content}\n\n⚠️ **${lang === 'ar' ? 'تنبيه' : 'Notice'}:** ${error.message || (lang === 'ar' ? 'يرجى التحقق من إدخال مفتاح API في الإعدادات.' : 'Please check API key settings.')}` : `⚠️ **${lang === 'ar' ? 'تنبيه' : 'Notice'}:** ${error.message || (lang === 'ar' ? 'يرجى التحقق من إدخال مفتاح API في الإعدادات.' : 'Please check API key settings.')}`,
                      }
                    : m
                ),
              };
            }
            return s;
          })
        );
        setIsGenerating(false);
        stopGenerationRef.current = null;
      }
    );

    stopGenerationRef.current = abort;
  };

  const handleStop = () => {
    if (stopGenerationRef.current) {
      stopGenerationRef.current();
      stopGenerationRef.current = null;
    }
    setIsGenerating(false);
  };

  const currentDisplayName =
    activeAccount?.name || googleUser.name || 'Mohamed Shabaan';
  const currentEmail =
    activeAccount?.email || googleUser.email || 'momosh991@gmail.com';
  const currentPicture =
    activeAccount?.picture ||
    googleUser.picture ||
    'https://api.dicebear.com/7.x/identicon/svg?seed=momosh991@gmail.com';

  const isDark = theme === 'dark';

  return (
    // Outer Flex is strictly dir="ltr" so Sidebar is ALWAYS anchored to the left of the screen!
    <div
      className={`flex flex-row h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? 'bg-gemini-dark text-gray-100' : 'bg-slate-50 text-slate-800'
      }`}
      dir="ltr"
    >
      {/* Mobile Drawer Backdrop when sidebar is open */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* 1. Left Collapsible Sidebar (ALWAYS ON THE LEFT SIDE) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setCurrentTab('chats');
        }}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        driveStatus={driveStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        t={t}
        theme={theme}
        lang={lang}
      />

      {/* 2. Main Workspace (dir adapts for Arabic or English content) */}
      <div
        className="flex-1 flex flex-col h-full overflow-hidden relative"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Top Navigation Bar */}
        <header
          className={`px-2 sm:px-4 md:px-6 border-b flex items-center justify-between select-none z-10 transition-colors gap-1.5 sm:gap-2 safe-pt min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] ${
            isDark
              ? 'bg-gemini-dark/80 backdrop-blur-md border-gemini-border/70 text-gray-100'
              : 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-800'
          }`}
        >
          {/* Left section of Topbar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className={`p-1.5 rounded-xl border transition-all md:hidden shrink-0 ${
                isDark
                  ? 'text-gray-300 hover:text-white bg-[#1a1b1d] border-white/10'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200'
              }`}
              title={t.toggleSidebar}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Ra Studio Brand Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-black text-xs sm:text-sm text-white shadow-md shadow-cyan-500/20">
                Ra
              </div>
              <span className="hidden sm:inline-block font-bold tracking-tight text-xs sm:text-sm">
                Ra Studio
              </span>
            </div>
            {/* Model Selector Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm ${
                  isChatGpt
                    ? isDark
                      ? 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700'
                    : isDark
                    ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-gemini-border text-gray-200'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                {isChatGpt ? (
                  <Bot className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
                <span className="truncate max-w-[100px] sm:hidden font-semibold">{getShortModelName(selectedModel)}</span>
                <span className="truncate hidden sm:inline max-w-[160px] md:max-w-xs font-semibold">{getDisplayModelName(selectedModel)}</span>
                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
              </button>

              {/* Models Menu */}
              {isModelMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsModelMenuOpen(false)}
                  />
                  <div
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    className={`absolute top-full mt-2 w-72 max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl p-2.5 text-xs z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150 border ${
                      lang === 'ar' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
                    } ${
                      isDark
                        ? 'bg-[#1e1f20] border-gemini-border text-gray-200'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    {AVAILABLE_MODELS.map((group) => (
                      <div key={group.category} className="space-y-1">
                        <div className="px-2 text-[10px] font-semibold opacity-60 uppercase tracking-wider">
                          {group.category}
                        </div>
                        {group.models.map((m) => {
                          const isSelected = selectedModel === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSelectedModel(m.id);
                                setIsModelMenuOpen(false);
                              }}
                              className={`w-full p-2 rounded-xl text-right transition-colors flex items-center justify-between ${
                                isSelected
                                  ? isDark
                                    ? 'bg-white/10 text-white font-medium border border-white/10'
                                    : 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                                  : isDark
                                  ? 'hover:bg-white/5 text-gray-300'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="truncate">
                                <div className="font-medium text-xs flex items-center gap-1.5">
                                  <span>{m.name}</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                    isDark ? 'bg-black/40 text-gray-400' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {m.tag}
                                  </span>
                                </div>
                                <div className="text-[10px] opacity-60 truncate mt-0.5">
                                  {m.desc}
                                </div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Quick Command Palette Spotlight Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className={`hidden md:flex items-center space-x-2 space-x-reverse px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                isDark
                  ? 'bg-[#1a1b1d] hover:bg-[#222325] border-white/10 text-gray-400 hover:text-gray-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title={t.commandPalette}
            >
              <Search className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <span className="truncate max-w-[120px]">{lang === 'ar' ? 'بحث أو أوامر...' : 'Search or actions...'}</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-gray-400 border border-white/5">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Right section of Topbar */}
          <div className="flex items-center space-x-2 space-x-reverse">
            {/* Unified System Health Pulse Widget (بسيط ومفيد جداً) */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setIsMetricsMenuOpen(!isMetricsMenuOpen)}
                className={`flex items-center space-x-2 space-x-reverse px-2.5 py-1.5 rounded-full border text-xs font-mono transition-all hover:border-blue-500/40 shadow-sm ${
                  isDark
                    ? 'bg-[#1a1b1d] border-white/10 text-gray-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title={lang === 'ar' ? 'اضغط لعرض تفاصيل استهلاك وموارد الجهاز' : 'System Performance & Resources'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    metrics.cpu_usage > 85
                      ? 'bg-rose-500 animate-ping'
                      : metrics.cpu_usage > 60
                      ? 'bg-amber-400'
                      : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                <span dir="ltr" className="font-semibold text-[11px] tracking-tight text-gray-300">
                  CPU {metrics.cpu_usage.toFixed(0)}% • RAM {metrics.memory_percentage.toFixed(0)}%
                </span>
                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
              </button>

              {/* System Performance Details Popover */}
              {isMetricsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMetricsMenuOpen(false)} />
                  <div
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    className={`absolute top-full mt-2 end-0 z-50 w-64 rounded-2xl p-3.5 shadow-2xl border text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
                      isDark
                        ? 'bg-[#1e1f20] border-gemini-border text-gray-200 shadow-black/60'
                        : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="font-bold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                        {lang === 'ar' ? 'موارد الجهاز ومحرك الذكاء' : 'System & AI Engine'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {lang === 'ar' ? 'متصل محلياً' : 'Local Connected'}
                      </span>
                    </div>

                    {/* CPU Meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] opacity-80">
                        <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3 text-blue-400" />{t.cpu}</span>
                        <span dir="ltr" className="font-mono font-bold text-blue-400">{metrics.cpu_usage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, metrics.cpu_usage)}%` }}
                        />
                      </div>
                    </div>

                    {/* RAM Meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] opacity-80">
                        <span>{t.ram} ({((metrics.memory_used_mb || 0) / 1024).toFixed(1)} / {((metrics.memory_total_mb || 1) / 1024).toFixed(1)} GB)</span>
                        <span dir="ltr" className="font-mono font-bold text-purple-400">{metrics.memory_percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, metrics.memory_percentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* Disk Free */}
                    <div className="flex justify-between items-center pt-1.5 text-[11px] border-t border-white/10">
                      <span className="opacity-70 flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-cyan-400" />
                        {t.diskFree}
                      </span>
                      <span dir="ltr" className="font-mono font-bold text-cyan-400">
                        {metrics.disk_free_gb.toFixed(0)} GB
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Center Navigation Tabs (Desktop / Tablet) */}
          <div className="hidden lg:flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs">
            <button
              onClick={() => setCurrentTab('chats')}
              className={`rounded-lg px-3 py-1 font-medium transition-all ${
                currentTab === 'chats'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Smart Chat
            </button>
            <button
              onClick={() => setCurrentTab('notebook')}
              className={`rounded-lg px-3 py-1 font-medium transition-all ${
                currentTab === 'notebook'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Notebook & Study
            </button>
            <button
              onClick={() => setCurrentTab('tools')}
              className={`rounded-lg px-3 py-1 font-medium transition-all ${
                currentTab === 'tools'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Tools
            </button>
          </div>

          {/* Right section: Developer modal button + AI Status + Lang + Theme + User Menu */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Developer Contact Button */}
            <button
              onClick={() => setShowDevModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full sm:rounded-xl border text-xs font-medium transition-all shadow-sm shrink-0 ${
                isDark
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700'
              }`}
              title="تواصل مع المطور"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">تواصل مع المطور</span>
              <span className="sm:hidden text-[11px] font-semibold">المطور</span>
            </button>

            {/* Smart Minimalist AI Status Pill */}
            {isChatGpt ? (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`hidden sm:flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  hasOpenaiKey
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                }`}
                title={hasOpenaiKey ? t.chatGptActive : t.addApiKey}
              >
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span>{hasOpenaiKey ? 'ChatGPT' : t.addApiKey}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`hidden sm:flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  hasApiKey
                    ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                }`}
                title={hasApiKey ? t.geminiNotice : t.addApiKey}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-purple-400' : 'bg-amber-400 animate-ping'}`} />
                <span>{hasApiKey ? 'Gemini' : t.addApiKey}</span>
              </button>
            )}

            {/* Subtle Divider */}
            <div className="h-4 w-px bg-white/10 hidden sm:block mx-0.5" />

            {/* Language Switch Button */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center space-x-1 space-x-reverse px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                isDark
                  ? 'bg-[#1a1b1d] hover:bg-[#252629] border-white/10 text-gray-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
              title={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Theme Switch Button */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-full border transition-all ${
                isDark
                  ? 'bg-[#1a1b1d] hover:bg-[#252629] border-white/10 text-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-purple-600'
              }`}
              title={lang === 'ar' ? 'تبديل المظهر (فاتح / داكن)' : 'Toggle Theme (Light / Dark)'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* GitHub Release Update Button */}
            <button
              onClick={() => setIsUpdateModalOpen(true)}
              className={`flex items-center space-x-1 space-x-reverse px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                releaseInfo?.has_update
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-400 shadow-md shadow-purple-500/25 animate-pulse'
                  : isDark
                  ? 'bg-[#1a1b1d] hover:bg-[#252629] border-white/10 text-gray-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title={
                releaseInfo?.has_update
                  ? lang === 'ar'
                    ? `تحديث جديد متوفر: ${releaseInfo.tag_name}`
                    : `New Update Available: ${releaseInfo.tag_name}`
                  : lang === 'ar'
                  ? 'فحص التحديثات (GitHub)'
                  : 'Check Updates'
              }
            >
              <Sparkles className={`w-3.5 h-3.5 ${releaseInfo?.has_update ? 'text-amber-300 animate-spin' : 'text-purple-400'}`} />
              <span className="hidden sm:inline">
                {releaseInfo?.has_update
                  ? lang === 'ar'
                    ? 'تحديث'
                    : 'Update'
                  : lang === 'ar'
                  ? 'تحديثات'
                  : 'Updates'}
              </span>
              {releaseInfo?.has_update && (
                <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-white/20">
                  {releaseInfo.tag_name}
                </span>
              )}
            </button>

            {/* Subtle Divider */}
            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* User Account Avatar Trigger & Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center space-x-2 pl-2 pr-2.5 py-1 rounded-full border transition-colors text-xs ${
                  isDark
                    ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-gemini-border'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300'
                }`}
              >
                <img
                  src={currentPicture}
                  alt={currentDisplayName}
                  className="w-6 h-6 rounded-full border border-blue-500 object-cover shrink-0"
                />
                <span className="font-medium max-w-[110px] truncate hidden md:inline">
                  {currentDisplayName}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    className={`absolute top-full mt-2 end-0 z-[9999] w-80 max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl p-4 text-xs space-y-3.5 border transition-all animate-in fade-in zoom-in-95 duration-150 ${
                      isDark
                        ? 'bg-[#1e1f20] border-gemini-border text-gray-200 shadow-black/60'
                        : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
                    }`}
                  >
                    {/* Current Active Account Card */}
                    <div
                      className={`flex items-center space-x-3 ${
                        lang === 'ar' ? 'space-x-reverse' : ''
                      } pb-3 border-b ${
                        isDark ? 'border-gemini-border' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={currentPicture}
                        alt={currentDisplayName}
                        className="w-10 h-10 rounded-full border-2 border-blue-500 object-cover shrink-0"
                      />
                      <div className="overflow-hidden min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{currentDisplayName}</div>
                        <div className="text-[11px] opacity-70 truncate font-mono" dir="ltr">
                          {currentEmail}
                        </div>
                        <span className="inline-block mt-1 text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {t.activeAccount}
                        </span>
                      </div>
                    </div>

                    {/* Switch to Other Accounts */}
                    {accounts.length > 1 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">
                          {t.switchAccount}
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {accounts
                            .filter((a) => a.id !== activeAccount?.id)
                            .map((acc) => (
                              <button
                                key={acc.id}
                                onClick={() => handleSwitchAccount(acc.id)}
                                className={`w-full p-2 rounded-xl flex items-center justify-between text-right transition-colors ${
                                  isDark
                                    ? 'bg-[#171819] hover:bg-[#252628]'
                                    : 'bg-slate-100 hover:bg-slate-200'
                                }`}
                              >
                                <div
                                  className={`flex items-center space-x-2 ${
                                    lang === 'ar' ? 'space-x-reverse' : ''
                                  } truncate min-w-0`}
                                >
                                  <img
                                    src={
                                      acc.picture ||
                                      'https://api.dicebear.com/7.x/identicon/svg?seed=' + acc.email
                                    }
                                    alt={acc.name}
                                    className="w-6 h-6 rounded-full object-cover shrink-0"
                                  />
                                  <div className="truncate text-left">
                                    <div className="font-medium text-xs truncate">{acc.name}</div>
                                    <div className="text-[10px] opacity-60 truncate" dir="ltr">
                                      {acc.email}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[11px] text-blue-500 font-medium px-2 py-0.5 rounded-md hover:bg-blue-500/10 shrink-0">
                                  {t.switchBtn}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div
                      className={`space-y-1.5 pt-2 border-t ${
                        isDark ? 'border-gemini-border' : 'border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className={`w-full py-2 px-3 rounded-xl flex items-center justify-between transition-colors ${
                          isDark
                            ? 'bg-white/5 hover:bg-white/10 text-gray-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span>{t.addAccount}</span>
                        </span>
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className={`w-full py-2 px-3 rounded-xl flex items-center justify-between transition-colors ${
                          isDark
                            ? 'bg-white/5 hover:bg-white/10 text-gray-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-purple-500" />
                          <span>{t.aiSettings}</span>
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsUpdateModalOpen(true);
                        }}
                        className={`w-full py-2 px-3 rounded-xl flex items-center justify-between transition-colors ${
                          releaseInfo?.has_update
                            ? 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-medium'
                            : isDark
                            ? 'bg-white/5 hover:bg-white/10 text-gray-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className={`w-4 h-4 ${releaseInfo?.has_update ? 'text-amber-400 animate-spin' : 'text-purple-400'}`} />
                          <span>{lang === 'ar' ? 'التحقق من التحديثات (GitHub)' : 'Check for Updates'}</span>
                        </span>
                        {releaseInfo?.has_update && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                            {releaseInfo.tag_name}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setShowDevModal(true);
                        }}
                        className={`w-full py-2 px-3 rounded-xl flex items-center justify-between transition-colors ${
                          isDark
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>تواصل مع المطور (محمد شعبان)</span>
                        </span>
                        <span className="text-xs font-mono">MS ↗</span>
                      </button>

                      <button
                        onClick={handleGoogleLogout}
                        className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center space-x-2 space-x-reverse transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t.signOut}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Body: Fluid GPU Tab Navigation & Ultra-Fast Switching */}
        <div key={currentTab} className="flex-1 flex flex-col h-full overflow-hidden relative tab-enter transform-gpu">
        {currentTab === 'tools' ? (
          <UsefulToolsHub theme={theme} lang={lang} />
        ) : currentTab === 'media' ? (
          <MediaVault
            activeMedia={activeMedia}
            onPlayMedia={(item) => setActiveMedia(item)}
            onSendToChat={(_mediaFile) => {
              setCurrentTab('chats');
            }}
            theme={theme}
            lang={lang}
            t={t}
          />
        ) : currentTab === 'notebook' ? (
          <NotebookStudio
            theme={theme}
            lang={lang}
            t={t}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        ) : (
          <>
            <ChatCanvas
              messages={activeSession.messages}
              isStreaming={isGenerating}
              selectedModel={selectedModel}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onSwitchModel={(modelId) => setSelectedModel(modelId)}
              onPromptSelect={(prompt) => handleSendMessage(prompt)}
              t={t}
              theme={theme}
              lang={lang}
            />

            <InputBar
              onSendMessage={handleSendMessage}
              onStop={handleStop}
              isGenerating={isGenerating}
              selectedModel={selectedModel}
              t={t}
              theme={theme}
              lang={lang}
            />
          </>
        )}

        </div>

        {/* Global Background Media Player (Plays across all tabs & in background!) */}
        <BackgroundMediaPlayer
          activeMedia={activeMedia}
          onClose={() => setActiveMedia(null)}
          currentTab={currentTab}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        driveStatus={driveStatus}
        onRefreshDrive={refreshUserData}
        onOpenGoogleAuth={() => setIsGoogleAuthModalOpen(true)}
        onLogoutGoogle={handleGoogleLogout}
        onAccountSwitched={(acc) => {
          setActiveAccount(acc);
          setGoogleUser({
            authenticated: true,
            name: acc.name,
            email: acc.email,
            picture: acc.picture,
          });
          refreshUserData();
        }}
        theme={theme}
        lang={lang}
        onToggleTheme={setTheme}
        onToggleLang={setLang}
        t={t}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        releaseInfo={releaseInfo}
      />

      {/* GitHub Release Update Container Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        releaseInfo={releaseInfo}
        onUpdateReleaseInfo={setReleaseInfo}
        theme={theme}
        lang={lang}
      />

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={isGoogleAuthModalOpen}
        onClose={() => setIsGoogleAuthModalOpen(false)}
        onSuccess={(user) => {
          setGoogleUser(user);
          setDriveStatus(user);
          refreshUserData();
        }}
      />

      {/* Glassmorphism Google Login Modal */}
      <GlassLoginModal
        isOpen={!isAuthenticated}
        onLoginSuccess={() => setIsAuthenticated(true)}
      />

      {/* Developer Profile Modal */}
      <DeveloperModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
      />

      {/* Universal Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTheme={toggleTheme}
        onToggleLang={toggleLanguage}
        theme={theme}
        lang={lang}
        t={t}
      />
    </div>
  );
};
