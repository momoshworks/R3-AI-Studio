import React from 'react';
import {
  GitBranch,
  Palette,
} from 'lucide-react';
import { Language, Theme } from '../utils/translations';

interface AntigravityStatusBarProps {
  theme: Theme;
  lang: Language;
  activeThemeName?: string;
  onOpenThemeModal?: () => void;
  onToggleLang?: () => void;
  onSelectLocalBot?: () => void;
}

export const AntigravityStatusBar: React.FC<AntigravityStatusBarProps> = ({
  theme,
  lang,
  activeThemeName = 'Liquid Glass Aurora',
  onOpenThemeModal,
  onToggleLang,
  onSelectLocalBot,
}) => {
  const isDark = theme === 'dark';
  const isAr = lang === 'ar';

  return (
    <footer
      className={`h-7 px-3 border-t shrink-0 flex items-center justify-between text-[11px] font-mono select-none transition-colors z-30 backdrop-blur-md ${
        isDark
          ? 'bg-[#0a0a0d]/80 border-white/[0.08] text-[#8F95A0]'
          : 'bg-white/80 border-slate-200 text-slate-600'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Left Items: Git Branch & Version */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
          <GitBranch className="w-3.5 h-3.5 text-[#8ab4f8]" />
          <span>main*</span>
        </div>

        <span className="opacity-30">•</span>

        <span className="text-[#8ab4f8] font-semibold">
          Antigravity IDE v2.0
        </span>

        <span className="opacity-30 hidden sm:inline">•</span>

        {/* Local Bot Status Pill */}
        <button
          onClick={onSelectLocalBot}
          className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/5 text-emerald-400 transition-colors"
          title={isAr ? 'فتح الشات بوت المحلي' : 'Open Local Chatbot'}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isAr ? 'MOMO1: جاهز' : 'MOMO1: Ready'}</span>
        </button>
      </div>

      {/* Right Items: Theme Switcher & Lang */}
      <div className="flex items-center gap-3">
        {/* Antigravity Theme Switcher Button */}
        <button
          onClick={onOpenThemeModal}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          title={isAr ? 'تبديل ثيمات Antigravity' : 'Switch Antigravity Themes'}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeThemeName}</span>
        </button>

        <span className="opacity-30">•</span>

        {/* Language Toggle */}
        <button
          onClick={onToggleLang}
          className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors font-bold uppercase"
        >
          {lang === 'ar' ? 'العربية' : 'EN'}
        </button>

        <span className="opacity-30">•</span>

        <span className="text-[10px] text-zinc-500">
          UTF-8
        </span>
      </div>
    </footer>
  );
};
