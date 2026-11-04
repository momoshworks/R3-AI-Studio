import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Headphones,
  FileText,
  FileSearch,
  ShieldCheck,
  RefreshCw,
  Maximize2,
  Zap,
  HelpCircle,
  Compass,
  ArrowUpRight,
  GraduationCap,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Translations, Theme, Language } from '../utils/translations';
import { openOfficialNotebookLM } from '../services/api';

interface NotebookStudioProps {
  theme: Theme;
  lang: Language;
  t?: Translations;
  onOpenSettings?: () => void;
}

export const NotebookStudio: React.FC<NotebookStudioProps> = ({
  theme,
  lang,
  onOpenSettings,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [autoOpen, setAutoOpen] = useState(() => {
    try {
      return localStorage.getItem('R3_AUTO_OPEN_NOTEBOOKLM') === 'true';
    } catch {
      return false;
    }
  });

  const isDark = theme === 'dark';

  // Handle launch of official NotebookLM Webview Window
  const handleLaunchNotebookLM = async () => {
    setIsOpening(true);
    try {
      await openOfficialNotebookLM();
    } catch (e) {
      console.error('Failed to open NotebookLM window:', e);
    } finally {
      setTimeout(() => setIsOpening(false), 1200);
    }
  };

  // Optional auto-open on first render if user preference is enabled
  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => {
        handleLaunchNotebookLM();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleToggleAutoOpen = () => {
    const nextVal = !autoOpen;
    setAutoOpen(nextVal);
    try {
      localStorage.setItem('R3_AUTO_OPEN_NOTEBOOKLM', String(nextVal));
    } catch {}
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://notebooklm.google.com');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto select-none p-3 sm:p-6 md:p-8 fast-scroll ${
        isDark ? 'bg-gemini-dark text-gray-100' : 'bg-slate-50 text-slate-800'
      }`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-5xl mx-auto w-full space-y-6 sm:space-y-8 pb-12">
        {/* Top Hero Banner */}
        <div
          className={`relative rounded-3xl p-6 sm:p-8 border shadow-2xl overflow-hidden backdrop-blur-xl ${
            isDark
              ? 'bg-gradient-to-br from-[#1a1c24]/90 via-[#181920]/80 to-[#14151a]/90 border-white/10'
              : 'bg-gradient-to-br from-white via-slate-50 to-blue-50/50 border-slate-200 shadow-slate-200'
          }`}
        >
          {/* Subtle Ambient Aurora Light */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>
                  {lang === 'ar'
                    ? 'الخدمة الرسمية المدمجة عبر Tauri v2 Webview'
                    : 'Official Google Service via Tauri v2 Webview'}
                </span>
              </div>

              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                    <span>Google NotebookLM</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30">
                      v2.0
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm opacity-70 mt-1">
                    {lang === 'ar'
                      ? 'استوديو أبحاث الذكاء الاصطناعي الأقوى عالمياً لتحليل الكتب والمحاضرات وتوليد البودكاست الصوتي التفاعلي.'
                      : 'The world’s most advanced AI research studio for reading, grounding, and interactive audio podcasts.'}
                  </p>
                </div>
              </div>

              {/* Session Persistence Note */}
              <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? 'تسجيل الدخول بحساب Google محفوظ تلقائياً مع تشفير ملفات الارتباط (Cookies & Sessions).'
                    : 'Google account sign-in is permanently saved with native persistent cookie session storage.'}
                </span>
              </div>
            </div>

            {/* Launch Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto shrink-0">
              <button
                onClick={handleLaunchNotebookLM}
                disabled={isOpening}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isOpening ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري فتح النافذة المدمجة...' : 'Opening Window...'}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تشغيل Google NotebookLM' : 'Launch NotebookLM'}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-70" />
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    isDark
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                  title={lang === 'ar' ? 'نسخ رابط الخدمة' : 'Copy link'}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{lang === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleToggleAutoOpen}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    autoOpen
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold'
                      : isDark
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  title={lang === 'ar' ? 'فتح النافذة تلقائياً عند الدخول على هذا التبويب' : 'Auto-open window when navigating to this tab'}
                >
                  <Zap className={`w-3.5 h-3.5 ${autoOpen ? 'text-purple-400' : 'opacity-60'}`} />
                  <span>{lang === 'ar' ? 'فتح تلقائي' : 'Auto Open'}</span>
                </button>

                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-center transition-all ${
                      isDark
                        ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    title={lang === 'ar' ? 'الإعدادات ومفاتيح الذكاء الاصطناعي' : 'Settings'}
                  >
                    <SettingsIcon className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ar' ? 'أبرز مميزات Google NotebookLM الرسمية' : 'Official NotebookLM Capabilities'}</span>
            </h2>
            <span className="text-[11px] opacity-60 font-mono">
              Powered by Gemini 1.5 Pro Architecture
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Audio Overview Podcast */}
            <div
              className={`p-5 rounded-2xl border transition-all hover:border-purple-500/40 shadow-sm space-y-3 ${
                isDark ? 'bg-[#18191c]/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {lang === 'ar' ? 'البودكاست الصوتي التفاعلي (Audio Overview)' : 'Deep Dive Audio Overview'}
                  </h3>
                  <span className="text-[10px] text-purple-400 font-mono">
                    Two AI Hosts · Interactive Discussion
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed opacity-75">
                {lang === 'ar'
                  ? 'ميزة ثورية تحول أوراقك البحثية وكتب الـ PDF ومستنداتك الطويلة إلى حوار صوتي ممتع بين مذيعين اثنين بالذكاء الاصطناعي يناقشان المفاهيم ويلخصانها مثل بودكاست إذاعي احترافي.'
                  : 'Transforms complex research, PDFs, and notes into an engaging conversation between two AI hosts who summarize and debate key points.'}
              </p>
            </div>

            {/* Card 2: 50+ Sources Grounding */}
            <div
              className={`p-5 rounded-2xl border transition-all hover:border-blue-500/40 shadow-sm space-y-3 ${
                isDark ? 'bg-[#18191c]/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {lang === 'ar' ? 'استيعاب 50 مصدراً و500 ألف كلمة' : 'Up to 50 Sources & 500k Words'}
                  </h3>
                  <span className="text-[10px] text-blue-400 font-mono">
                    PDFs · Google Docs · YouTube · Slides
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed opacity-75">
                {lang === 'ar'
                  ? 'ارفع كتب المناهج، مقاطع الفيديو على YouTube، مستندات الـ Word والـ Slides معاً في دفتر واحد ليقوم بمزامنتها وفهم الروابط المعرفية المشتركة بينها فوراً.'
                  : 'Upload full books, research papers, YouTube videos, and Google Docs into a single workspace for multi-source knowledge synthesis.'}
              </p>
            </div>

            {/* Card 3: 100% Grounded Citations */}
            <div
              className={`p-5 rounded-2xl border transition-all hover:border-emerald-500/40 shadow-sm space-y-3 ${
                isDark ? 'bg-[#18191c]/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {lang === 'ar' ? 'إجابات موثقة بالاستشهادات الدقيقة 100%' : '100% Grounded In-line Citations'}
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Zero Hallucination · Exact Page Quotes
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed opacity-75">
                {lang === 'ar'
                  ? 'كل إجابة يقدمها الذكاء الاصطناعي مدعومة برقم الصفحة والفقرة المباشرة التي يمكنك الضغط عليها فوراً للتأكد من النص الأصلي بدون أي اختلاق أو هلوسة.'
                  : 'Every single claim and explanation is backed by clickable in-line citations pointing to the exact page and paragraph in your sources.'}
              </p>
            </div>

            {/* Card 4: Study Guides & Briefings */}
            <div
              className={`p-5 rounded-2xl border transition-all hover:border-amber-500/40 shadow-sm space-y-3 ${
                isDark ? 'bg-[#18191c]/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {lang === 'ar' ? 'أدلة دراسية ومذكرات إحاطة فورية' : 'Study Guides & Briefing Docs'}
                  </h3>
                  <span className="text-[10px] text-amber-400 font-mono">
                    FAQs · Study Outlines · Timelines
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed opacity-75">
                {lang === 'ar'
                  ? 'بضغطة واحدة، ينشئ الدفتر دليلاً دراسياً شاملاً، أسئلة شائعة، جداول للمفاهيم، ومذكرات إحاطة تنفيذية جاهزة للمراجعة للامتحانات أو المشاريع.'
                  : 'Instantly generate study guides, timeline overviews, FAQ briefs, and structured outlines designed for students and professionals.'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Launch & How it Works */}
        <div
          className={`p-5 sm:p-6 rounded-3xl border space-y-4 ${
            isDark ? 'bg-[#151619] border-white/5' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>{lang === 'ar' ? 'طريقة الاستخدام السلسة داخل Nerdo AI Studio' : 'How it works inside Nerdo AI Studio'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1a1b1d] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold font-mono mb-2">
                1
              </div>
              <div className="font-semibold mb-1">{lang === 'ar' ? 'فتح النافذة المدمجة' : 'Launch Webview Window'}</div>
              <p className="opacity-70 leading-relaxed text-[11px]">
                {lang === 'ar'
                  ? 'اضغط على زر التشغيل بالأعلى لفتح نافذة Google NotebookLM بنظام Webview المباشر.'
                  : 'Click the launch button to open NotebookLM in a high-performance Tauri child window.'}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1a1b1d] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold font-mono mb-2">
                2
              </div>
              <div className="font-semibold mb-1">{lang === 'ar' ? 'تسجيل الدخول الدائم' : 'Permanent Sign-In'}</div>
              <p className="opacity-70 leading-relaxed text-[11px]">
                {lang === 'ar'
                  ? 'سجل دخولك بحساب Google مرة واحدة فقط؛ يتم حفظ الجلسة والملفات السحابية تلقائياً للأبد.'
                  : 'Log in with your Google account once; cookies and workspace sessions persist permanently.'}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1a1b1d] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono mb-2">
                3
              </div>
              <div className="font-semibold mb-1">{lang === 'ar' ? 'الاستيعاب والبودكاست' : 'Research & Audio'}</div>
              <p className="opacity-70 leading-relaxed text-[11px]">
                {lang === 'ar'
                  ? 'ارفع ملفاتك وكتبك واستمع للشرح الصوتي أو ابدأ الاستفسار بدقة استشهادات متناهية.'
                  : 'Upload your documents, generate audio summaries, and ask in-depth grounded questions.'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 text-xs">
            <span className="opacity-60 flex items-center gap-1.5">
              <span>رابط الخدمة الرسمي المباشر:</span>
              <a
                href="https://notebooklm.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline font-mono"
              >
                https://notebooklm.google.com
              </a>
            </span>

            <button
              onClick={handleLaunchNotebookLM}
              className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-2 transition-all active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'بدء الاستخدام الآن' : 'Start Using Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
