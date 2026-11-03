import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { GitBranch, Copy, Check, AlertCircle } from 'lucide-react';

interface MermaidChartProps {
  chart: string;
  isDark?: boolean;
  lang?: 'ar' | 'en';
}

export const MermaidChart: React.FC<MermaidChartProps> = ({
  chart,
  isDark = true,
  lang = 'ar',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const cleanChart = chart.trim();
    if (!cleanChart) return;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
      });

      const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

      mermaid
        .render(uniqueId, cleanChart)
        .then(({ svg }) => {
          if (isMounted) {
            setSvgHtml(svg);
            setError(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn('[Mermaid Render Warning]', err);
            setError(err?.message || 'Failed to render diagram syntax');
          }
        });
    } catch (err: any) {
      if (isMounted) {
        setError(err?.message || 'Mermaid initialization error');
      }
    }

    return () => {
      isMounted = false;
    };
  }, [chart, isDark]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      dir="ltr"
      className={`my-4 rounded-2xl border overflow-hidden transition-all shadow-lg text-left ${
        isDark
          ? 'bg-[#18191a] border-gemini-border text-gray-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Header bar */}
      <div
        className={`px-4 py-2 flex items-center justify-between border-b text-xs ${
          isDark
            ? 'bg-[#202124] border-gemini-border text-gray-400'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center space-x-2">
          <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold text-xs tracking-wide">
            {lang === 'ar' ? 'مخطط تدفقي تفاعلي (Mermaid)' : 'Interactive Diagram (Mermaid)'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-white/10 transition-colors text-[11px]"
          title={lang === 'ar' ? 'نسخ كود المخطط' : 'Copy Mermaid Code'}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">{lang === 'ar' ? 'تم النسخ' : 'Copied'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>{lang === 'ar' ? 'نسخ الكود' : 'Copy Code'}</span>
            </>
          )}
        </button>
      </div>

      {/* Diagram Rendering Area */}
      {error ? (
        <div className="p-4 space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'جاري صياغة المخطط أو به خطأ كتابي، عرض الكود الخام:'
                : 'Diagram rendering in progress or has syntax errors. Showing raw definition:'}
            </span>
          </div>
          <pre className="p-3 bg-black/30 rounded-xl overflow-x-auto text-xs font-mono text-gray-300">
            <code>{chart}</code>
          </pre>
        </div>
      ) : svgHtml ? (
        <div
          ref={containerRef}
          className="p-5 overflow-x-auto flex items-center justify-center min-h-[140px] [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      ) : (
        <div className="p-8 text-center text-xs opacity-60 font-mono">
          {lang === 'ar' ? 'جاري بناء المخطط البصري...' : 'Generating visual diagram...'}
        </div>
      )}
    </div>
  );
};
