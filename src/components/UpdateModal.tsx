import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Download,
  ExternalLink,
  X,
  RefreshCw,
  CheckCircle2,
  Package,
  Calendar,
  Tag,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { ReleaseInfo, formatBytes, checkGitHubRelease } from '../services/updateService';
import { Theme, Language } from '../utils/translations';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseInfo: ReleaseInfo | null;
  onUpdateReleaseInfo: (info: ReleaseInfo | null) => void;
  theme: Theme;
  lang: Language;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  releaseInfo,
  onUpdateReleaseInfo,
  theme,
  lang,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const hasUpdate = releaseInfo?.has_update ?? false;

  const handleRefresh = async () => {
    setIsChecking(true);
    try {
      const fresh = await checkGitHubRelease(true);
      onUpdateReleaseInfo(fresh);
    } catch (e) {
      console.warn('Manual update check failed:', e);
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  const handleDownloadAsset = (url: string) => {
    setDownloadingUrl(url);
    window.open(url, '_blank');
    setTimeout(() => setDownloadingUrl(null), 1500);
  };

  const formattedDate = releaseInfo?.published_at
    ? new Date(releaseInfo.published_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 animate-in zoom-in-95 backdrop-blur-xl ${
          isDark
            ? 'bg-[#18191c]/95 border-white/10 text-gray-100 shadow-blue-500/10'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
                hasUpdate
                  ? 'bg-gradient-to-tr from-purple-600 to-blue-600 shadow-purple-500/25'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-500/25'
              }`}
            >
              {hasUpdate ? <Rocket className="w-5 h-5 animate-bounce" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>
                  {hasUpdate
                    ? lang === 'ar'
                      ? 'تحديث جديد متوفر للتطبيق 🚀'
                      : 'New Release Available 🚀'
                    : lang === 'ar'
                    ? 'أنت على أحدث إصدار من التطبيق'
                    : 'Your App is Up to Date'}
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs opacity-60 mt-0.5 font-mono">
                <span>{lang === 'ar' ? 'الإصدار الحالي:' : 'Current:'} {releaseInfo?.current_version || 'v1.0.0'}</span>
                <span>•</span>
                <span>{lang === 'ar' ? 'أحدث إصدار:' : 'Latest:'} {releaseInfo?.tag_name || 'v1.0.0'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={isChecking}
              className={`p-2 rounded-xl border transition-all ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
              title={lang === 'ar' ? 'إعادة التحقق من GitHub' : 'Check GitHub Again'}
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${
                isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 fast-scroll">
          {/* Release Info Pill Card */}
          <div
            className={`p-4 rounded-2xl border space-y-2.5 ${
              hasUpdate
                ? isDark
                  ? 'bg-gradient-to-r from-purple-950/20 to-blue-950/20 border-purple-500/30'
                  : 'bg-purple-50/70 border-purple-200'
                : isDark
                ? 'bg-emerald-950/15 border-emerald-500/30'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-bold text-sm">{releaseInfo?.name || releaseInfo?.tag_name || 'Release'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                  {releaseInfo?.tag_name}
                </span>
              </div>

              {formattedDate && (
                <div className="flex items-center gap-1.5 text-xs opacity-70 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs opacity-75">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'إصدار رسمي موثق وموقع من مستودع GitHub'
                  : 'Verified official release from GitHub repository'}
              </span>
            </div>
          </div>

          {/* Release Notes / Changelog */}
          {releaseInfo?.body && (
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'سجل التغييرات والتحسينات (Changelog):' : 'Changelog & Release Notes:'}</span>
              </h3>
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed max-h-56 overflow-y-auto fast-scroll ${
                  isDark ? 'bg-black/30 border-white/5 text-gray-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {releaseInfo.body}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Downloadable Assets Section */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider opacity-60 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'حزم التنزيل والملفات المرفقة (Release Assets):' : 'Release Download Assets:'}</span>
            </h3>

            {releaseInfo?.assets && releaseInfo.assets.length > 0 ? (
              <div className="space-y-2">
                {releaseInfo.assets.map((asset, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isDark ? 'bg-[#1f2024] hover:bg-[#25262a] border-white/5' : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate font-mono" dir="ltr">
                          {asset.name}
                        </div>
                        <div className="text-[11px] opacity-60 font-mono mt-0.5">
                          {formatBytes(asset.size)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadAsset(asset.download_url)}
                      disabled={downloadingUrl === asset.download_url}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingUrl === asset.download_url ? '...' : lang === 'ar' ? 'تنزيل' : 'Download'}</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`p-4 rounded-2xl border text-center text-xs opacity-60 ${
                  isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {lang === 'ar'
                  ? 'لا توجد ملفات ثنائية مرفقة مباشرة، يمكنك تنزيل الكود المصدري من صفحة الإصدار.'
                  : 'No binary assets attached, source code is available on the release page.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <a
            href={releaseInfo?.html_url || 'https://github.com/momoshworks/R3-AI-Studio/releases'}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'عرض على GitHub' : 'View on GitHub'}</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
              }`}
            >
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>

            {releaseInfo?.assets?.[0] && (
              <button
                onClick={() => handleDownloadAsset(releaseInfo.assets[0].download_url)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تنزيل أحدث حزمة الآن' : 'Download Latest Now'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
