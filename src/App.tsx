import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ChevronDown,
  LogOut,
  Key,
  Plus,
  Users,
  Check,
  Sun,
  Moon,
  Menu,
  Palette,
  Cpu,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatCanvas } from './components/ChatCanvas';
import { AutomationsHub } from './components/AutomationsHub';
import { LocalChatbot } from './components/LocalChatbot';
import { AntigravityStatusBar } from './components/AntigravityStatusBar';
import { AntigravityThemePicker, ANTIGRAVITY_THEMES } from './components/AntigravityThemePicker';
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
import { storageService } from './services/storage';
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
      { id: 'Google Gemini (gemini-3.5-flash)', name: 'Gemini 3.5 Flash', desc: 'النموذج الأحدث فائق الذكاء والسرعة والاستدلال (افتراضي وموصى به)', tag: 'الأسرع والأحدث' },
      { id: 'Google Gemini 3.8 Flash (gemini-3.8-flash)', name: 'Gemini 3.8 Flash', desc: 'أحدث إصدار بقدرات تفكير متقدمة', tag: 'متقدم' },
      { id: 'Google Gemini Flash Lite (gemini-3.5-flash-lite)', name: 'Gemini Flash Lite', desc: 'فائق الخفة واقتصادي للمهام السريعة', tag: 'خفيف' },
      { id: 'Google Gemini Flash Latest (gemini-flash-latest)', name: 'Gemini Flash Latest', desc: 'الإصدار المباشر الدائم من فلاش', tag: 'مباشر' },
      { id: 'Google Gemini 2.5 Pro (gemini-2.5-pro)', name: 'Gemini 2.5 Pro', desc: 'القدرات الأقوى في التحليل والبرمجة المعقدة', tag: 'شامل' },
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
  {
    category: 'Local Offline AI (On-Device)',
    models: [
      { id: 'antigravity-rust-core', name: 'Antigravity Rust Core', desc: 'محرك محلي فائق الخفة مدمج عبر لغة Rust بدون إنترنت', tag: 'Offline' },
      { id: 'antigravity-code-expert', name: 'Antigravity Code Expert', desc: 'تدقيق الأكواد، فحص الأخطاء، وهندسة البرمجيات محلياً', tag: 'Code' },
      { id: 'llama3.2', name: 'Ollama: Llama 3.2', desc: 'نموذج محلي عبر خادم Ollama على المنفذ 11434', tag: 'Ollama' },
      { id: 'deepseek-r1', name: 'Ollama: DeepSeek R1', desc: 'استدلال محلي وتفكير عميق عبر Ollama', tag: 'Reasoning' },
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

  // Antigravity Theme Engine State
  const [antigravityTheme, setAntigravityTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('ANTIGRAVITY_THEME') || 'antigravity-dark';
    } catch {
      return 'antigravity-dark';
    }
  });
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('ANTIGRAVITY_THEME', antigravityTheme);
      document.documentElement.setAttribute('data-theme', antigravityTheme);

      // Clean existing theme- classes
      const currentClasses = document.documentElement.className
        .split(' ')
        .filter((c) => !c.startsWith('theme-'));
      document.documentElement.className = currentClasses.join(' ');
      document.documentElement.classList.add(`theme-${antigravityTheme}`);

      if (antigravityTheme === 'matcha' || antigravityTheme === 'doodle') {
        setTheme('light');
      } else {
        setTheme('dark');
      }
    } catch {}
  }, [antigravityTheme]);

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

  // Chat Sessions (Persistent Offline-First across Android & Desktop)
  const [sessions, setSessions] = useState<Session[]>(() => storageService.getInitialSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => storageService.getInitialActiveSessionId());

  // Load complete offline sessions and attachments on launch
  useEffect(() => {
    storageService.loadSessions().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setSessions(loaded);
        storageService.loadActiveSessionId().then((savedId) => {
          if (savedId && loaded.some((s) => s.id === savedId)) {
            setActiveSessionId(savedId);
          }
        });
      }
    });
  }, []);

  // Auto-save all chat sessions and messages immediately
  useEffect(() => {
    storageService.saveAllSessions(sessions);
  }, [sessions]);

  // Remember active session
  useEffect(() => {
    storageService.saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  // Execution & Models
  const [selectedModel, setSelectedModel] = useState<string>('Google Gemini (gemini-3.5-flash)');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const stopGenerationRef = useRef<(() => void) | null>(null);

  // Global Background Media Player State (Persistent across all tabs)
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  // System & Backend Data
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
    storageService.deleteSession(id);
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

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        storageService.saveAttachment(att);
      }
    }

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
      className={`fixed inset-0 flex flex-row h-full w-full overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? 'bg-[#0e0f12] text-[#EDEDED]' : 'bg-slate-50 text-slate-800'
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
        metrics={metrics}
        t={t}
        theme={theme}
        lang={lang}
      />

      {/* 2. Main Workspace (dir adapts for Arabic or English content) */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden relative transition-colors duration-200 ${
          isDark ? 'bg-[#0e0f12] text-[#EDEDED]' : 'bg-[#f8fafc] text-slate-800'
        }`}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Top Navigation Bar - Ultra-Clean Linear & Gemini Aesthetic */}
        <header
          className={`h-14 px-3 sm:px-6 border-b flex items-center justify-between select-none z-10 transition-colors gap-2 shrink-0 ${
            isDark
              ? 'bg-[#0e0f12]/80 backdrop-blur-md border-[#262930] text-[#EDEDED]'
              : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          {/* Left section: Sidebar toggle + Minimalist Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all shrink-0 ${
                isSidebarCollapsed ? 'flex' : 'flex md:hidden'
              } ${
                isDark
                  ? 'text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={t.toggleSidebar}
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className={`font-bold text-sm tracking-tight hidden xs:inline ${isDark ? 'text-[#EDEDED]' : 'text-slate-900'}`}>
              Nerdo
            </span>
          </div>

          {/* Center: Clean, pill-shaped Model Selector with translucent #1e2026 */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm whitespace-nowrap active:scale-95 ${
                isDark
                  ? 'bg-[#1e2026] hover:bg-[#252830] border-[#2a2d36] text-[#EDEDED]'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8ab4f8] shrink-0" />
              <span className="font-semibold truncate sm:hidden max-w-[100px]">
                {getShortModelName(selectedModel)}
              </span>
              <span className="font-semibold truncate hidden sm:inline max-w-[180px]">
                {getDisplayModelName(selectedModel)}
              </span>
              <ChevronDown className="w-3 h-3 text-[#8F95A0] shrink-0" />
              {((isChatGpt && !hasOpenaiKey) || (!isChatGpt && !hasApiKey)) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="API Key missing" />
              )}
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
                  className={`absolute top-full mt-2 w-72 max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl p-2 text-xs z-50 space-y-2 border animate-in fade-in zoom-in-95 duration-150 ${
                    lang === 'ar' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
                  } ${
                    isDark
                      ? 'bg-[#16181d] border-[#262930] text-[#EDEDED]'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {AVAILABLE_MODELS.map((group) => (
                    <div key={group.category} className="space-y-1">
                      <div className="px-2 text-[10px] font-semibold text-[#8F95A0] uppercase tracking-wider">
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
                            className={`w-full p-2 rounded-xl text-start transition-colors flex items-center justify-between ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#1e2026] text-[#EDEDED] font-medium'
                                  : 'bg-blue-50 text-blue-700 font-medium'
                                : isDark
                                ? 'hover:bg-white/[0.04] text-[#8F95A0]'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="truncate">
                              <div className={`font-medium text-xs flex items-center gap-1.5 ${isDark ? 'text-[#EDEDED]' : 'text-slate-900'}`}>
                                <span>{m.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isDark ? 'bg-black/40 text-[#8F95A0]' : 'bg-slate-200 text-slate-600'}`}>
                                  {m.tag}
                                </span>
                              </div>
                              <div className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-[#8F95A0]' : 'text-slate-500'}`}>
                                {m.desc}
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#8ab4f8] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right section: Minimal quick-actions: Language, Theme, User Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Switch Button */}
            <button
              onClick={toggleLanguage}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                isDark
                  ? 'text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
            >
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Theme Switch Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all shrink-0 ${
                isDark
                  ? 'text-[#8F95A0] hover:text-[#EDEDED] hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={lang === 'ar' ? 'تبديل المظهر' : 'Toggle Theme'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Local Bot Quick Pill */}
            <button
              onClick={() => setCurrentTab('local_chat')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all border shrink-0 ${
                currentTab === 'local_chat'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                  : isDark
                  ? 'bg-[#16181d] border-[#262930] hover:border-emerald-500/40 text-[#8F95A0] hover:text-emerald-400'
                  : 'bg-white border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-700'
              }`}
              title={lang === 'ar' ? 'فتح الشات بوت المحلي (Offline)' : 'Open Local Chatbot (Offline)'}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'ar' ? 'بوت محلي' : 'Local Bot'}</span>
            </button>

            {/* Antigravity Theme Switcher Button */}
            <button
              onClick={() => setIsThemePickerOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
                isDark
                  ? 'bg-[#16181d] border-[#262930] hover:border-[#8ab4f8]/50 text-[#8F95A0] hover:text-[#EDEDED]'
                  : 'bg-white border-slate-300 hover:border-blue-500 text-slate-700'
              }`}
              title={lang === 'ar' ? 'تغيير ثيم Antigravity' : 'Antigravity Themes'}
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline font-mono text-[11px]">
                {ANTIGRAVITY_THEMES.find((t) => t.id === antigravityTheme)?.name.split(' ')[0] || 'Theme'}
              </span>
            </button>

            {/* User Account Avatar Trigger & Dropdown Menu */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-1.5 p-1 rounded-full border transition-colors ${
                  isDark
                    ? 'border-[#262930] hover:border-[#8ab4f8]/50'
                    : 'border-slate-300 hover:border-blue-500'
                }`}
              >
                <img
                  src={currentPicture}
                  alt={currentDisplayName}
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                />
                <ChevronDown className="w-3 h-3 text-[#8F95A0] shrink-0" />
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
        ) : currentTab === 'automations' ? (
          <AutomationsHub theme={theme} lang={lang} t={t} />
        ) : currentTab === 'local_chat' ? (
          <LocalChatbot theme={theme} lang={lang} />
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

        {/* Antigravity Desktop Status Bar */}
        <AntigravityStatusBar
          theme={theme}
          lang={lang}
          metrics={metrics}
          activeThemeName={ANTIGRAVITY_THEMES.find((th) => th.id === antigravityTheme)?.name || 'Antigravity Dark'}
          onOpenThemeModal={() => setIsThemePickerOpen(true)}
          onToggleLang={toggleLanguage}
          onSelectLocalBot={() => setCurrentTab('local_chat')}
        />

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

      {/* Antigravity Theme Picker Modal */}
      <AntigravityThemePicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
        currentThemeId={antigravityTheme}
        onSelectTheme={(thId) => setAntigravityTheme(thId)}
        lang={lang}
      />
    </div>
  );
};
