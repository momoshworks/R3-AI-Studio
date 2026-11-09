import React from 'react';
import {
  GitBranch,
  Cpu,
  Palette,
  Activity,
} from 'lucide-react';
import { SystemMetrics } from '../types';
import { Language, Theme } from '../utils/translations';

interface AntigravityStatusBarProps {
  theme: Theme;
  lang: Language;
  metrics?: SystemMetrics;
  activeThemeName?: string;
  onOpenThemeModal?: () => void;
  onToggleLang?: () => void;
  onSelectLocalBot?: () => void;
}

export const AntigravityStatusBar: React.FC<AntigravityStatusBarProps> = ({
  theme,
  lang,
  metrics,
  activeThemeName = 'Antigravity Dark',
  onOpenThemeModal,
  onToggleLang,
  onSelectLocalBot,
}) => {
  const isDark = theme === 'dark';
  const isAr = lang === 'ar';

  const cpuPercent = metrics ? Math.round(metrics.cpu_usage) : 18;
  const memPercent = metrics ? Math.round(metrics.memory_percentage) : 46;

  return (
    <footer
      className={`h-7 px-3 border-t shrink-0 flex items-center justify-between text-[11px] font-mono select-none transition-colors z-30 ${
        isDark
          ? 'bg-[#0a0a0d] border-[#262930] text-[#8F95A0]'
          : 'bg-[#EDEDED] border-slate-300 text-slate-600'
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
          <span>{isAr ? 'المحرك المحلي: جاهز' : 'Local Bot: Ready'}</span>
        </button>
      </div>

      {/* Right Items: Telemetry & Theme Switcher */}
      <div className="flex items-center gap-3">
        {/* CPU & RAM Telemetry */}
        <div className="hidden md:flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span>CPU {cpuPercent}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>RAM {memPercent}%</span>
          </div>
        </div>

        <span className="opacity-30 hidden md:inline">•</span>

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
