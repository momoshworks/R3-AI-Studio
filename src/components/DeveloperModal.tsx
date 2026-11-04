import React from 'react';

interface DeveloperModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({ isOpen = true, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="إغلاق"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full border-2 border-cyan-400/40 p-1 shadow-lg shadow-cyan-500/25">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 to-blue-700 text-2xl font-black text-white shadow-inner">
              MS
            </div>
          </div>

          <h3 className="mt-3 text-lg font-bold text-white">محمد شعبان</h3>
          <p className="text-xs text-cyan-400 font-medium tracking-wide">Mohamed Mahmoud Mohamed Shaban</p>
          <p className="mt-1 text-xs text-slate-400">AI Engineer & Full-Stack Developer</p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <a
            href="https://github.com/momoshworks"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200 transition-all hover:bg-cyan-500/10 hover:border-cyan-500/30 group"
          >
            <span className="flex items-center gap-2">
              <span className="font-semibold text-white">GitHub:</span>
              <span className="text-slate-300 font-mono">momoshworks</span>
            </span>
            <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform">↗</span>
          </a>

          <a
            href="mailto:momosh991@gmail.com"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200 transition-all hover:bg-cyan-500/10 hover:border-cyan-500/30 group"
          >
            <span className="flex items-center gap-2">
              <span className="font-semibold text-white">Email:</span>
              <span className="text-slate-300 font-mono">momosh991@gmail.com</span>
            </span>
            <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform">↗</span>
          </a>

          <a
            href="tel:+201034191685"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200 transition-all hover:bg-cyan-500/10 hover:border-cyan-500/30 group"
          >
            <span className="flex items-center gap-2">
              <span className="font-semibold text-white">Phone:</span>
              <span className="text-slate-300 font-mono" dir="ltr">+20 103 419 1685</span>
            </span>
            <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform">↗</span>
          </a>
        </div>
      </div>
    </div>
  );
};
