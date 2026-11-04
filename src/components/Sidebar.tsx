import React, { useState } from 'react';
import {
  MessageSquare,
  Globe,
  Cloud,
  Film,
  Trash2,
  Plus,
  ExternalLink,
  Search,
  Settings as SettingsIcon,
  Menu,
  BookOpen,
} from 'lucide-react';
import { DriveStatus, Session, SidebarTab } from '../types';
import { USEFUL_WEBSITES } from '../data/usefulWebsites';
import { Translations, Theme, Language } from '../utils/translations';

interface SidebarProps {
  currentTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  driveStatus: DriveStatus;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  t: Translations;
  theme: Theme;
  lang: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  driveStatus,
  onOpenSettings,
  isCollapsed,
  onToggleCollapse,
  t,
  theme,
  lang,
}) => {
  const [sidebarSearch, setSidebarSearch] = useState('');

  const isDark = theme === 'dark';

  const autoCollapseMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && !isCollapsed) {
      onToggleCollapse();
    }
  };

  const handleSelectTab = (tab: SidebarTab) => {
    onSelectTab(tab);
    autoCollapseMobile();
  };

  const handleSelectSession = (id: string) => {
    onSelectSession(id);
    autoCollapseMobile();
  };

  const handleNewChat = () => {
    onNewChat();
    autoCollapseMobile();
  };

  // Group sessions chronologically
  const groupSessions = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const todayLabel = lang === 'ar' ? 'اليوم' : 'Today';
    const yesterdayLabel = lang === 'ar' ? 'أمس' : 'Yesterday';
    const prevLabel = lang === 'ar' ? 'الأيام السابقة' : 'Previous';

    const groups: { [key: string]: Session[] } = {
      [todayLabel]: [],
      [yesterdayLabel]: [],
      [prevLabel]: [],
    };

    const filtered = sidebarSearch.trim()
      ? sessions.filter((s) => s.title.toLowerCase().includes(sidebarSearch.toLowerCase().trim()))
      : sessions;

    filtered.forEach((s) => {
      const diff = now - s.timestamp;
      if (diff < oneDay) {
        groups[todayLabel].push(s);
      } else if (diff < 2 * oneDay) {
        groups[yesterdayLabel].push(s);
      } else {
        groups[prevLabel].push(s);
      }
    });

    return groups;
  };

  const grouped = groupSessions();

  return (
    <aside
      className={`h-screen border-r flex flex-col transition-all duration-300 select-none z-50 overflow-x-hidden safe-pt safe-pb ${
        isCollapsed ? 'hidden md:flex md:w-16' : 'fixed inset-y-0 start-0 z-50 w-72 max-w-[85vw] shadow-2xl md:static md:w-[260px] md:shadow-none'
      } ${
        isDark
          ? 'bg-gemini-sidebar border-gemini-border text-gray-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Header: Hamburger Menu Button & App Brand */}
      <div
        className={`h-14 flex items-center border-b transition-colors ${
          isDark ? 'border-gemini-border/60' : 'border-slate-200'
        } ${isCollapsed ? 'px-1 sm:px-2 justify-center' : 'px-3 justify-between'}`}
      >
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-xl transition-all active:scale-95 duration-200 flex items-center justify-center ${
            isDark
              ? 'text-gray-300 hover:text-white hover:bg-white/10'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title={t.toggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </button>

        {!isCollapsed && (
          <div className="flex items-center space-x-2 space-x-reverse pe-1 select-none">
            <div className="flex items-baseline space-x-1.5 space-x-reverse">
              <span className={`font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Nerdo
              </span>
              <span className="font-semibold text-xs text-cyan-400">
                AI Studio
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-purple-500/30 shadow-md shadow-purple-500/10 shrink-0">
              <img src="/app-icon.png" alt="Nerdo" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>

      {/* "New Chat" Button */}
      <div className="p-2.5 flex justify-center">
        <button
          onClick={() => {
            handleSelectTab('chats');
            handleNewChat();
          }}
          className={`group relative overflow-hidden transition-all duration-300 border ${
            isDark
              ? 'border-white/10 hover:border-blue-400/50 bg-[#1a1b1d] hover:bg-[#252628]'
              : 'border-slate-200 hover:border-blue-500 bg-slate-100 hover:bg-slate-200'
          } shadow-sm ${
            isCollapsed
              ? 'w-10 h-10 rounded-full flex items-center justify-center p-0'
              : 'w-full rounded-full py-2.5 px-4 flex items-center justify-start space-x-3 space-x-reverse'
          }`}
          title={t.newChat}
        >
          <Plus className="w-4 h-4 text-purple-400 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
          {!isCollapsed && (
            <span
              className={`text-sm font-medium ${
                isDark ? 'text-gray-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'
              }`}
            >
              {t.newChat}
            </span>
          )}
        </button>
      </div>

      {/* Navigation Hub Tabs: 2-Column Grid When Open, Vertical Icons When Collapsed */}
      <div
        className={`border-b ${
          isDark ? 'border-gemini-border/50' : 'border-slate-200'
        } transition-all ${
          isCollapsed
            ? 'flex flex-col items-center py-2.5 space-y-2 px-1'
            : 'grid grid-cols-2 gap-2 p-2.5'
        }`}
      >
        {/* 1. Chats Tab */}
        <button
          onClick={() => handleSelectTab('chats')}
          className={`rounded-2xl transition-all ${
            isCollapsed
              ? 'w-10 h-10 flex items-center justify-center'
              : 'p-3 flex flex-col items-center justify-center gap-1.5 border'
          } ${
            currentTab === 'chats'
              ? 'text-blue-500 bg-blue-500/15 font-semibold border-blue-500/40 shadow-sm shadow-blue-500/10'
              : isDark
              ? 'text-gray-300 hover:text-white bg-[#1a1b1d] hover:bg-[#252628] border-white/5'
              : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
          }`}
          title={t.chat}
        >
          <MessageSquare className="w-5 h-5 shrink-0 text-blue-400" />
          {!isCollapsed && <span className="text-xs font-medium">{t.chat}</span>}
        </button>

        {/* 2. Useful Tools & Websites Tab */}
        <button
          onClick={() => handleSelectTab('tools')}
          className={`rounded-2xl transition-all ${
            isCollapsed
              ? 'w-10 h-10 flex items-center justify-center'
              : 'p-3 flex flex-col items-center justify-center gap-1.5 border'
          } ${
            currentTab === 'tools'
              ? 'text-purple-500 bg-purple-500/15 font-semibold border-purple-500/40 shadow-sm shadow-purple-500/10'
              : isDark
              ? 'text-gray-300 hover:text-white bg-[#1a1b1d] hover:bg-[#252628] border-white/5'
              : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
          }`}
          title={t.tools}
        >
          <Globe className="w-5 h-5 shrink-0 text-purple-400" />
          {!isCollapsed && <span className="text-xs font-medium">{t.tools}</span>}
        </button>

        {/* 3. Local Media Vault Tab */}
        <button
          onClick={() => handleSelectTab('media')}
          className={`rounded-2xl transition-all ${
            isCollapsed
              ? 'w-10 h-10 flex items-center justify-center'
              : 'p-3 flex flex-col items-center justify-center gap-1.5 border'
          } ${
            currentTab === 'media'
              ? 'text-cyan-500 bg-cyan-500/15 font-semibold border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : isDark
              ? 'text-gray-300 hover:text-white bg-[#1a1b1d] hover:bg-[#252628] border-white/5'
              : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
          }`}
          title={t.media}
        >
          <Film className="w-5 h-5 shrink-0 text-cyan-400" />
          {!isCollapsed && <span className="text-xs font-medium">{t.media}</span>}
        </button>

        {/* 4. Google Drive Tab */}
        <button
          onClick={() => handleSelectTab('drive')}
          className={`rounded-2xl transition-all ${
            isCollapsed
              ? 'w-10 h-10 flex items-center justify-center'
              : 'p-3 flex flex-col items-center justify-center gap-1.5 border'
          } ${
            currentTab === 'drive'
              ? 'text-emerald-500 bg-emerald-500/15 font-semibold border-emerald-500/40 shadow-sm shadow-emerald-500/10'
              : isDark
              ? 'text-gray-300 hover:text-white bg-[#1a1b1d] hover:bg-[#252628] border-white/5'
              : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
          }`}
          title={t.drive}
        >
          <Cloud className="w-5 h-5 shrink-0 text-emerald-400" />
          {!isCollapsed && <span className="text-xs font-medium">{t.drive}</span>}
        </button>

        {/* 5. NotebookLM / Research Studio Tab (Spans both columns for full visibility) */}
        <button
          onClick={() => handleSelectTab('notebook')}
          className={`rounded-2xl transition-all ${
            isCollapsed
              ? 'w-10 h-10 flex items-center justify-center'
              : 'col-span-2 p-3 flex items-center justify-between border'
          } ${
            currentTab === 'notebook'
              ? 'text-amber-400 bg-amber-500/15 font-semibold border-amber-500/40 shadow-sm shadow-amber-500/10'
              : isDark
              ? 'text-gray-200 hover:text-white bg-gradient-to-r from-[#1a1b1d] to-[#202124] hover:bg-[#252628] border-white/10'
              : 'text-slate-700 hover:text-slate-900 bg-gradient-to-r from-slate-50 to-slate-100 hover:bg-slate-200 border-slate-200'
          }`}
          title={t.notebookStudio}
        >
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 shrink-0" />
            </div>
            {!isCollapsed && (
              <div className="text-right">
                <div className="text-xs font-bold leading-none">Google NotebookLM</div>
                <div className="text-[10px] opacity-60 mt-0.5">{lang === 'ar' ? 'الخدمة الرسمية · البودكاست' : 'Official Studio · Audio Pods'}</div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[9px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-md border border-purple-500/30">
              Webview 2.0
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* 1. CHATS TAB */}
        {currentTab === 'chats' && (
          <div className="space-y-3">
            {/* Live Search inside Past Chats */}
            {!isCollapsed && sessions.length > 1 && (
              <div className="px-1 pb-1">
                <div
                  className={`relative flex items-center rounded-xl border px-2.5 py-1.5 text-xs transition-colors ${
                    isDark
                      ? 'bg-black/30 border-white/5 text-gray-200'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 opacity-40 shrink-0" />
                  <input
                    type="text"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder={t.searchChats}
                    className="w-full bg-transparent px-2 outline-none text-[11px]"
                  />
                  {sidebarSearch && (
                    <button
                      onClick={() => setSidebarSearch('')}
                      className="opacity-40 hover:opacity-100 text-gray-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {Object.entries(grouped).map(([label, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={label} className="space-y-1">
                  {!isCollapsed && (
                    <div className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {label}
                    </div>
                  )}
                  {items.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`group flex items-center cursor-pointer text-xs transition-colors ${
                        isCollapsed
                          ? 'justify-center w-10 h-10 rounded-xl mx-auto'
                          : 'justify-between px-3 py-2 rounded-xl active:scale-[0.98]'
                      } ${
                        activeSessionId === s.id
                          ? isDark
                            ? 'bg-gemini-hover text-white font-medium border border-white/5'
                            : 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                          : isDark
                          ? 'text-gray-400 hover:bg-gemini-hover/60 hover:text-gray-200'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={s.title || t.newChat}
                    >
                      <div className="flex items-center space-x-2 space-x-reverse truncate">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="truncate">{s.title || t.newChat}</span>
                        )}
                      </div>

                      {!isCollapsed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(s.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* 2. QUICK WEBSITES DIRECTORY TAB */}
        {currentTab === 'tools' && !isCollapsed && (
          <div className="space-y-3 px-1 text-xs">
            <div
              className={`flex items-center justify-between font-semibold text-[11px] ${
                isDark ? 'text-gray-300' : 'text-slate-700'
              }`}
            >
              <span>{t.quickTools}</span>
              <span className="text-[10px] text-purple-400 font-mono">100+</span>
            </div>

            {/* Quick Search in Sidebar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث سريع...' : 'Quick search...'}
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className={`w-full border rounded-lg pl-8 pr-2.5 py-1 text-xs outline-none transition-colors ${
                  isDark
                    ? 'bg-[#171819] border-gemini-border text-white placeholder-gray-500 focus:border-purple-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-500'
                }`}
              />
            </div>

            {/* Featured Sites list */}
            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
              {USEFUL_WEBSITES.filter(
                (w) =>
                  !sidebarSearch ||
                  w.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                  w.tags.some((siteTag) =>
                    siteTag.toLowerCase().includes(sidebarSearch.toLowerCase())
                  )
              )
                .slice(0, 25)
                .map((site) => (
                  <a
                    key={site.id}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-xl border transition-all flex items-center justify-between group ${
                      isDark
                        ? 'bg-[#171819] hover:bg-[#202124] border-gemini-border/50 hover:border-purple-500/40'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse truncate">
                      <span className="text-sm shrink-0">{site.icon}</span>
                      <div className="truncate">
                        <div
                          className={`font-medium text-xs truncate group-hover:text-purple-400 ${
                            isDark ? 'text-gray-200' : 'text-slate-800'
                          }`}
                        >
                          {site.name}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {site.category}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-purple-400 shrink-0" />
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* 3. GOOGLE DRIVE TAB */}
        {currentTab === 'drive' && !isCollapsed && (
          <div className="space-y-4 px-1 text-xs">
            <div
              className={`p-3.5 rounded-2xl border space-y-3 ${
                isDark
                  ? 'bg-[#171819] border-gemini-border'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2 space-x-reverse text-emerald-500 font-medium">
                <Cloud className="w-4 h-4" />
                <span>Google Drive Cloud</span>
              </div>
              <p
                className={`text-[11px] leading-relaxed ${
                  isDark ? 'text-gray-400' : 'text-slate-600'
                }`}
              >
                {lang === 'ar'
                  ? 'مساحتك السحابية الخاصة متصلة بحسابك لحفظ ملفاتك والمحادثات تلقائياً.'
                  : 'Your cloud storage is linked to sync files and chat logs seamlessly.'}
              </p>
              <div
                className={`pt-1 flex items-center justify-between text-[11px] border-t ${
                  isDark
                    ? 'text-gray-300 border-white/5'
                    : 'text-slate-700 border-slate-200'
                }`}
              >
                <span>{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                <span
                  className={
                    driveStatus.authenticated
                      ? 'text-emerald-500 font-semibold'
                      : 'text-amber-500'
                  }
                >
                  {driveStatus.authenticated
                    ? lang === 'ar'
                      ? 'متصل ومفعل'
                      : 'Connected'
                    : lang === 'ar'
                    ? 'جاهز للربط'
                    : 'Ready to connect'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offline Status Badge */}
      {!isCollapsed && (
        <div className="px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-500 font-mono border-t border-white/5">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{lang === 'ar' ? 'حفظ محلي فوري (Offline-First)' : 'Offline Auto-Saved'}</span>
          </span>
          <span className="text-[9px] opacity-60">SQLite / IDB</span>
        </div>
      )}

      {/* Footer Settings Button */}
      <div
        className={`p-3 border-t ${
          isDark ? 'border-gemini-border/60' : 'border-slate-200'
        }`}
      >
        <button
          onClick={onOpenSettings}
          className={`w-full py-2 px-3 rounded-xl flex items-center transition-all active:scale-95 text-xs font-medium ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } ${
            isDark
              ? 'hover:bg-white/5 text-gray-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title={t.settings}
        >
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            {!isCollapsed && <span>{t.settings}</span>}
          </div>
        </button>
      </div>
    </aside>
  );
};
