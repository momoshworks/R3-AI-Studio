import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  ExternalLink,
  FileCode,
  FileText,
  File,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Maximize2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { AttachedFile } from '../types';

export interface MarkdownMessageRendererProps {
  content: string;
  attachments?: AttachedFile[];
  isDark?: boolean;
  className?: string;
  onOpenAttachment?: (attachment: AttachedFile) => void;
}

// Check if running inside Tauri Desktop Environment
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Resolves local file paths to safe webview asset URLs via Tauri v2 convertFileSrc,
 * while allowing standard HTTP/HTTPS/data URLs to pass through untouched.
 */
export const resolveMediaSrc = (urlOrPath?: string): string => {
  if (!urlOrPath) return '';

  // 1. External URLs, data URLs, or blob URLs pass through untouched
  if (/^(https?:\/\/|data:|blob:|\/\/)/i.test(urlOrPath)) {
    return urlOrPath;
  }

  // 2. Local filesystem paths converted using Tauri v2 convertFileSrc
  if (isTauri) {
    try {
      return convertFileSrc(urlOrPath);
    } catch (err) {
      console.warn('[Tauri Asset Protocol] Failed to convert path:', urlOrPath, err);
      return urlOrPath;
    }
  }

  return urlOrPath;
};

// Auto-detect Arabic / Right-to-Left (RTL) unicode range
const hasArabic = (text: string): boolean => /[\u0600-\u06FF]/.test(text);

const getTextContent = (children: any): string => {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getTextContent).join('');
  if (typeof children === 'object' && children.props && children.props.children) {
    return getTextContent(children.props.children);
  }
  return '';
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getCleanFileName = (name: string): string => {
  if (!name) return '';
  return name.replace(/\.pdf\.pdf$/i, '.pdf').replace(/(\.\w{2,5})\1$/i, '$1');
};

/**
 * Enhanced Inline Image Component with Fallback, Lazy Loading, and Lightbox
 */
const SafeMarkdownImage: React.FC<{ src?: string; alt?: string; onZoom: (url: string) => void }> = ({
  src,
  alt,
  onZoom,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const resolvedUrl = resolveMediaSrc(src);

  if (hasError || !resolvedUrl) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-2 my-2 rounded-xl bg-[#1e1f20] border border-white/10 text-xs text-[#8E918F] font-mono select-none">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate max-w-xs">{alt || (resolvedUrl ? resolvedUrl.split(/[/\\]/).pop() : 'Image not available')}</span>
      </span>
    );
  }

  return (
    <figure className="my-3.5 inline-block max-w-full">
      <div
        onClick={() => onZoom(resolvedUrl)}
        className="group relative inline-block rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-400/40 transition-all cursor-zoom-in bg-[#16181d] shadow-md"
      >
        {!isLoaded && (
          <div className="w-48 h-32 flex items-center justify-center bg-white/[0.02] text-[#8E918F] animate-pulse">
            <ImageIcon className="w-5 h-5 opacity-40" />
          </div>
        )}
        <img
          src={resolvedUrl}
          alt={alt || 'Rendered Image'}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`max-w-full max-h-[460px] object-contain rounded-2xl transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0 h-0 w-0'
          }`}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/20">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>
      </div>
      {alt && (
        <figcaption className="text-center text-xs text-[#8E918F] mt-1.5 font-mono select-none">
          {alt}
        </figcaption>
      )}
    </figure>
  );
};

export const MarkdownMessageRenderer: React.FC<MarkdownMessageRendererProps> = ({
  content,
  attachments = [],
  isDark = true,
  className = '',
  onOpenAttachment,
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleFileAction = (att: AttachedFile) => {
    if (onOpenAttachment) {
      onOpenAttachment(att);
      return;
    }
    const resolved = resolveMediaSrc(att.preview_url || att.data || att.saved_path);
    if (att.is_image && resolved) {
      setLightboxUrl(resolved);
      return;
    }
    if (resolved) {
      const a = document.createElement('a');
      a.href = resolved;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const isMsgArabic = hasArabic(content);

  return (
    <div
      className={`chat-message-renderer flex flex-col space-y-3 ${className}`}
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      }}
      dir={isMsgArabic ? 'rtl' : 'ltr'}
    >
      {/* 1. Markdown Core Content */}
      <div className={`text-[14px] md:text-[14.5px] leading-relaxed select-text ${
        isDark ? 'text-[#E3E3E3]' : 'text-slate-900'
      }`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p({ children }) {
              const text = getTextContent(children);
              const isAr = hasArabic(text);
              return (
                <p
                  dir={isAr ? 'rtl' : 'ltr'}
                  className={`my-2 leading-[1.75] font-normal ${
                    isDark ? 'text-[#E3E3E3]' : 'text-slate-900'
                  } ${isAr ? 'text-right' : 'text-left'}`}
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {children}
                </p>
              );
            },
            strong({ children }) {
              const text = getTextContent(children);
              const isEnglishOnly = /^[A-Za-z0-9_\-\.\s\(\)]+$/.test(text.trim());
              return (
                <strong
                  dir={isEnglishOnly ? 'ltr' : undefined}
                  className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                  style={{ unicodeBidi: 'isolate' }}
                >
                  {children}
                </strong>
              );
            },
            h1({ children }) {
              const text = getTextContent(children);
              const isAr = hasArabic(text);
              return (
                <h1
                  dir={isAr ? 'rtl' : 'ltr'}
                  className={`text-xl sm:text-2xl font-bold mt-5 mb-2.5 pb-1 border-b ${
                    isDark ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'
                  } ${isAr ? 'text-right' : 'text-left'}`}
                >
                  {children}
                </h1>
              );
            },
            h2({ children }) {
              const text = getTextContent(children);
              const isAr = hasArabic(text);
              return (
                <h2
                  dir={isAr ? 'rtl' : 'ltr'}
                  className={`text-lg sm:text-xl font-semibold mt-4 mb-2 ${
                    isDark ? 'text-[#EDEDED]' : 'text-slate-900'
                  } ${isAr ? 'text-right' : 'text-left'}`}
                >
                  {children}
                </h2>
              );
            },
            h3({ children }) {
              const text = getTextContent(children);
              const isAr = hasArabic(text);
              return (
                <h3
                  dir={isAr ? 'rtl' : 'ltr'}
                  className={`text-base sm:text-lg font-semibold mt-3.5 mb-1.5 ${
                    isDark ? 'text-[#8ab4f8]' : 'text-blue-600'
                  } ${isAr ? 'text-right' : 'text-left'}`}
                >
                  {children}
                </h3>
              );
            },
            ul({ children }) {
              return (
                <ul
                  className={`list-disc ps-6 my-2.5 space-y-1.5 leading-[1.7] ${
                    isDark ? 'text-[#D0D4DC]' : 'text-slate-800'
                  }`}
                >
                  {children}
                </ul>
              );
            },
            ol({ children }) {
              return (
                <ol
                  className={`list-decimal ps-6 my-2.5 space-y-1.5 leading-[1.7] ${
                    isDark ? 'text-[#D0D4DC]' : 'text-slate-800'
                  }`}
                >
                  {children}
                </ol>
              );
            },
            li({ children }) {
              const text = getTextContent(children);
              const isAr = hasArabic(text);
              return (
                <li
                  dir={isAr ? 'rtl' : 'ltr'}
                  className="my-0.5 leading-[1.7]"
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {children}
                </li>
              );
            },
            blockquote({ children }) {
              const text = getTextContent(children);
              const isAr = hasArabic(text);
              return (
                <blockquote
                  dir={isAr ? 'rtl' : 'ltr'}
                  className={`my-3 border-s-2 ps-4 py-1.5 text-xs md:text-[13.5px] leading-relaxed italic ${
                    isDark
                      ? 'border-[#8ab4f8] text-gray-300 bg-white/[0.02]'
                      : 'border-blue-500 text-gray-700 bg-black/[0.02]'
                  } rounded-e`}
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {children}
                </blockquote>
              );
            },
            a({ href, children }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8ab4f8] hover:underline underline-offset-2 font-medium inline-flex items-center gap-1 group"
                >
                  <span>{children}</span>
                  <ExternalLink className="w-3 h-3 text-[#8ab4f8]/70 group-hover:text-[#8ab4f8] inline-block shrink-0" />
                </a>
              );
            },
            img({ src, alt }) {
              return <SafeMarkdownImage src={src} alt={alt} onZoom={(url) => setLightboxUrl(url)} />;
            },
            code({ inline, className: codeClass, children, ...props }: any) {
              const match = /language-(\w+)/.exec(codeClass || '');
              const codeContent = String(children).replace(/\n$/, '');
              const codeId = `code_${Math.random().toString(36).substring(2, 8)}`;

              if (!inline && match) {
                const lang = match[1].toLowerCase();
                return (
                  <div
                    dir="ltr"
                    className="my-3.5 rounded-2xl overflow-hidden border border-white/10 bg-[#16181d] shadow-lg text-left"
                  >
                    <div className="px-4 py-2 bg-[#1e2026] flex items-center justify-between border-b border-white/10 text-xs text-[#8F95A0] font-mono">
                      <span className="flex items-center gap-1.5 text-gray-300 font-semibold">
                        <FileCode className="w-3.5 h-3.5 text-[#8ab4f8]" />
                        {lang}
                      </span>
                      <button
                        onClick={() => handleCopyCode(codeContent, codeId)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/10 text-gray-300 transition-colors text-[11px]"
                      >
                        {copiedCodeId === codeId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-sans">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="font-sans">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-xs sm:text-[13px] font-mono text-[#EDEDED] leading-relaxed">
                      <code>{codeContent}</code>
                    </pre>
                  </div>
                );
              }

              if (!inline && codeContent.includes('\n')) {
                return (
                  <div dir="ltr" className="my-3 rounded-2xl overflow-hidden border border-white/10 bg-[#16181d] text-left">
                    <pre className="p-4 overflow-x-auto text-xs font-mono text-[#EDEDED]">
                      <code>{codeContent}</code>
                    </pre>
                  </div>
                );
              }

              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-[#1e2026] border border-white/10 text-[#8ab4f8] font-mono text-[12.5px] select-all"
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* 2. File & Document Attachment Cards (Compact Grid Beneath Markdown) */}
      {attachments && attachments.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          <div className="text-[11px] font-mono text-[#8E918F] mb-2 font-medium">
            {isMsgArabic ? 'المرفقات المرتبطة:' : 'Attached Files:'}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {attachments.map((att) => {
              const resolvedSrc = resolveMediaSrc(att.preview_url || att.data || att.saved_path);
              const isPdf = att.type.includes('pdf') || att.name.toLowerCase().endsWith('.pdf');
              const isCode =
                att.name.endsWith('.py') ||
                att.name.endsWith('.js') ||
                att.name.endsWith('.ts') ||
                att.name.endsWith('.tsx') ||
                att.name.endsWith('.json');
              const isCsv = att.name.endsWith('.csv') || att.name.endsWith('.xlsx');

              // A. Image Attachment Card
              if (att.is_image) {
                return (
                  <div
                    key={att.id}
                    onClick={() => handleFileAction(att)}
                    className="group relative w-28 h-28 sm:w-36 sm:h-28 rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-400/50 bg-[#1e1f20] transition-all cursor-pointer shadow-sm active:scale-95"
                    title={att.name}
                  >
                    <img
                      src={resolvedSrc}
                      alt={att.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                      <div className="self-end p-1 rounded-full bg-black/60 text-white">
                        <Maximize2 className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-white truncate">{getCleanFileName(att.name)}</p>
                        <span className="text-[9px] font-mono text-gray-300">{formatFileSize(att.size)}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              // B. Document / Code / PDF Horizontal Pill Card
              return (
                <div
                  key={att.id}
                  onClick={() => handleFileAction(att)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[#1e1f20] hover:bg-[#252830] border border-white/10 hover:border-cyan-400/50 transition-all cursor-pointer group shadow-sm active:scale-95"
                  title={att.name}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPdf
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : isCode
                        ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                        : isCsv
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isPdf ? (
                      <FileText className="w-4 h-4" />
                    ) : isCode ? (
                      <FileCode className="w-4 h-4" />
                    ) : (
                      <File className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 pr-1">
                    <div className="font-medium text-xs text-[#E3E3E3] group-hover:text-white truncate max-w-[160px] sm:max-w-[200px]">
                      {getCleanFileName(att.name)}
                    </div>
                    <div className="text-[10px] text-[#8E918F] flex items-center gap-1.5 font-mono">
                      <span>{formatFileSize(att.size)}</span>
                      <span>•</span>
                      <span className="uppercase text-[9px] font-semibold text-cyan-400">
                        {att.name.split('.').pop() || 'FILE'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-[#8E918F] group-hover:text-white group-hover:bg-white/10 transition-colors ms-auto">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="Enlarged View"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownMessageRenderer;
