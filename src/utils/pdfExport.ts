/**
 * R3 AI Studio Native High-Resolution PDF Export Utility
 * Provides both:
 * 1. downloadPDFDirectly: Calls backend headless Edge engine to download an authentic .pdf file.
 * 2. exportTextOrHtmlToPDF: Opens browser native Print-to-PDF dialog.
 */

export interface PDFExportOptions {
  title?: string;
  modelName?: string;
  author?: string;
  filename?: string;
}

/**
 * Lightweight, robust Markdown to HTML converter for PDF styling
 */
export function markdownToPrintableHtml(md: string): string {
  if (!md) return '';

  // If already full HTML snippet, return as-is
  if (md.trim().startsWith('<div') || md.trim().startsWith('<table') || md.trim().startsWith('<article')) {
    return md;
  }

  let html = md;

  // 1. Preserve and format code blocks
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code>${escaped.trim()}</code></pre>`;
  });

  // 2. Inline code
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<code>${escaped}</code>`;
  });

  // 3. Headings
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 4. Bold and Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 5. Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // 6. Bullet lists
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
  // Clean up duplicate nested uls
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // 7. Paragraphs: split by double newline
  const paragraphs = html.split(/\n{2,}/);
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<table')
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return html;
}

/**
 * Downloads a crisp .pdf file directly using the backend headless engine
 */
export async function downloadPDFDirectly(content: string, options: PDFExportOptions = {}): Promise<boolean> {
  const renderedHtml = markdownToPrintableHtml(content);
  const title = options.title || 'R3 AI Report';
  const modelName = options.modelName || 'R3 AI';
  const filename = options.filename || `${title.replace(/[\s/\\?%*:|"<>]/g, '_')}.pdf`;

  try {
    const response = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: renderedHtml,
        title,
        model_name: modelName,
        filename,
        save_to_downloads: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 1000);
    return true;
  } catch (err) {
    console.warn('[PDF Download] Backend direct download failed, falling back to print dialog:', err);
    // Smooth fallback to print dialog
    exportTextOrHtmlToPDF(renderedHtml, options);
    return false;
  }
}

/**
 * Opens the native browser Print-to-PDF / Preview dialog
 */
export function exportTextOrHtmlToPDF(contentHtmlOrMd: string, options: PDFExportOptions = {}) {
  const contentHtml = markdownToPrintableHtml(contentHtmlOrMd);
  const title = options.title || 'R3 AI Report';
  const model = options.modelName || 'Google Gemini / ChatGPT';
  const author = options.author || 'R3 AI Workstation';
  const dateStr = new Date().toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isArabic = /[\u0600-\u06FF]/.test(contentHtml);
  const dir = isArabic ? 'rtl' : 'ltr';

  const printDocument = `
<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e1f20;
      background: #ffffff;
      line-height: 1.7;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 700;
      color: #1d4ed8;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-box {
      font-size: 11px;
      color: #64748b;
      text-align: ${isArabic ? 'left' : 'right'};
      line-height: 1.4;
    }
    h1, h2, h3, h4 {
      color: #0f172a;
      margin-top: 18px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    h1 { font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    h2 { font-size: 15px; }
    h3 { font-size: 13px; }
    p {
      margin-top: 6px;
      margin-bottom: 10px;
      text-align: justify;
    }
    ul, ol {
      padding-${isArabic ? 'right' : 'left'}: 20px;
      margin-top: 6px;
      margin-bottom: 10px;
    }
    li {
      margin-bottom: 4px;
    }
    pre {
      direction: ltr !important;
      text-align: left !important;
      background: #18191a !important;
      color: #f1f5f9 !important;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
      overflow-x: auto;
      margin: 14px 0;
      border: 1px solid #334155;
      page-break-inside: avoid;
    }
    code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 11px;
      direction: ltr !important;
    }
    p code {
      background: #f1f5f9;
      color: #2563eb;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    blockquote {
      border-${isArabic ? 'right' : 'left'}: 4px solid #3b82f6;
      background: #f8fafc;
      margin: 12px 0;
      padding: 8px 14px;
      color: #475569;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: ${isArabic ? 'right' : 'left'};
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
    }
    .footer-bar {
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div class="brand-title">
      <span>✨ R3 AI</span>
      <span style="font-size:12px;color:#64748b;font-weight:normal;">| Document &amp; Smart Export</span>
    </div>
    <div class="meta-box">
      <div><strong>النموذج:</strong> ${model}</div>
      <div><strong>التاريخ:</strong> ${dateStr}</div>
    </div>
  </div>

  <div class="content-body">
    ${contentHtml}
  </div>

  <div class="footer-bar">
    <span>تم إنشاء هذا المستند عبر ${author}</span>
    <span>وثيقة رقمية معتمدة</span>
  </div>
</body>
</html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(printDocument);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 400);
}
