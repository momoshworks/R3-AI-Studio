import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Plus,
  Globe,
  Film,
  Settings as SettingsIcon,
  Sun,
  Moon,
  ExternalLink,
  Command,
  X,
} from 'lucide-react';
import { USEFUL_WEBSITES } from '../data/usefulWebsites';
import { Translations, Theme, Language } from '../utils/translations';
import { SidebarTab } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: SidebarTab) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  theme: Theme;
  lang: Language;
  t: Translations;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  category: 'action' | 'navigation' | 'tool';
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onNewChat,
  onOpenSettings,
  onToggleTheme,
  onToggleLang,
  theme,
  lang,
  t,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const allCommands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      {
        id: 'new-chat',
        title: t.newChat,
        subtitle: lang === 'ar' ? 'بدء جلسة ذكاء اصطناعي جديدة فوراً' : 'Start a new AI conversation session',
        icon: <Plus className="w-4 h-4 text-purple-400" />,
        category: 'action',
        action: () => {
          onSelectTab('chats');
          onNewChat();
          onClose();
        },
        shortcut: 'Ctrl+N',
      },
      {
        id: 'chats-tab',
        title: t.chat,
        subtitle: lang === 'ar' ? 'عرض المحادثات والدردشة الذكية' : 'View AI chat sessions',
        icon: <MessageSquare className="w-4 h-4 text-blue-400" />,
        category: 'navigation',
        action: () => {
          onSelectTab('chats');
          onClose();
        },
      },
      {
        id: 'tools-tab',
        title: t.tools,
        subtitle: lang === 'ar' ? 'دليل ومستودع +100 موقع وأداة عالمية' : 'Curated 100+ global web tools directory',
        icon: <Globe className="w-4 h-4 text-emerald-400" />,
        category: 'navigation',
        action: () => {
          onSelectTab('tools');
          onClose();
        },
        shortcut: 'Ctrl+T',
      },
      {
        id: 'media-tab',
        title: t.media,
        subtitle: lang === 'ar' ? 'مخزن الوسائط ومشغل الصوتيات والفيديو بالخلفية' : 'Local media vault & background player',
        icon: <Film className="w-4 h-4 text-amber-400" />,
        category: 'navigation',
        action: () => {
          onSelectTab('media');
          onClose();
        },
        shortcut: 'Ctrl+M',
      },
      {
        id: 'toggle-theme',
        title: `${t.theme}: ${theme === 'dark' ? t.light : t.dark}`,
        subtitle: lang === 'ar' ? 'تبديل فوري بين المظهر الداكن والمظهر الفاتح' : 'Instant toggle between dark & light themes',
        icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-400" />,
        category: 'action',
        action: () => {
          onToggleTheme();
          onClose();
        },
        shortcut: 'Ctrl+D',
      },
      {
        id: 'toggle-lang',
        title: `${t.language}: ${lang === 'ar' ? 'English' : 'العربية'}`,
        subtitle: lang === 'ar' ? 'Switch complete interface to English' : 'التحويل الكامل للواجهة إلى اللغة العربية',
        icon: <Globe className="w-4 h-4 text-cyan-400" />,
        category: 'action',
        action: () => {
          onToggleLang();
          onClose();
        },
        shortcut: 'Ctrl+L',
      },
      {
        id: 'settings',
        title: t.settings,
        subtitle: lang === 'ar' ? 'إدارة مفاتيح AI والحسابات وتخصيص المظهر' : 'Manage AI keys, accounts, and appearance',
        icon: <SettingsIcon className="w-4 h-4 text-slate-400" />,
        category: 'action',
        action: () => {
          onOpenSettings();
          onClose();
        },
      },
    ];

    // Add Top Tools
    USEFUL_WEBSITES.slice(0, 15).forEach((site) => {
      list.push({
        id: `site-${site.id}`,
        title: site.name,
        subtitle: site.description,
        icon: <ExternalLink className="w-4 h-4 text-blue-400" />,
        category: 'tool',
        action: () => {
          window.open(site.url, '_blank', 'noopener,noreferrer');
          onClose();
        },
      });
    });

    return list;
  }, [t, lang, theme, onSelectTab, onNewChat, onClose, onToggleTheme, onToggleLang, onOpenSettings]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Handle Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className={`w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden transition-all duration-200 animate-in zoom-in-95 ${
          isDark
            ? 'bg-[#18191c]/95 border-gemini-border text-gray-100 shadow-blue-500/10'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300'
        } backdrop-blur-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className={`flex items-center px-4 py-3.5 border-b ${isDark ? 'border-gemini-border/70' : 'border-slate-200'}`}>
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t.searchCommands}
            className={`w-full px-3 py-1 bg-transparent text-sm outline-none font-medium ${
              isDark ? 'text-white placeholder-gray-500' : 'text-slate-900 placeholder-slate-400'
            }`}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border bg-black/10 text-gray-400">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              {lang === 'ar' ? 'لم يتم العثور على أي أوامر مطابقة' : 'No matching commands found'}
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-right transition-all text-xs ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600/20 text-white border border-blue-500/40'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                      : isDark
                      ? 'hover:bg-white/5 text-gray-300 border border-transparent'
                      : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isDark ? 'bg-white/5' : 'bg-slate-100'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="truncate text-left">
                      <div className="font-semibold truncate">{cmd.title}</div>
                      <div className="text-[10px] opacity-60 truncate">{cmd.subtitle}</div>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border opacity-60 shrink-0">
                      {cmd.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div
          className={`px-4 py-2 border-t flex items-center justify-between text-[11px] opacity-60 ${
            isDark ? 'border-gemini-border/70 bg-[#141517]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <span>
            {lang === 'ar' ? 'استخدم الأسهم ⇅ للتنقل و Enter للاختيار' : 'Use ⇅ arrows to navigate, Enter to select'}
          </span>
          <span className="font-mono">Esc {lang === 'ar' ? 'للإغلاق' : 'to close'}</span>
        </div>
      </div>
    </div>
  );
};
