import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  List,
  Code,
  Eye,
  Columns,
  Copy,
  Check,
  Download,
  Clock,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { marked, Tokens } from 'marked';
import { PreviewExtensionProps } from '../../types';
import { formatHumanSize } from '../../utils/format';

interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

// Custom Marked Renderer tailored for Markdown Studio
class MarkdownStudioRenderer extends marked.Renderer {
  heading(token: Tokens.Heading): string {
    const text = this.parser.parseInline(token.tokens);
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    let slug = cleanText
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    if (!slug) slug = `section-${token.depth}`;

    const headingClasses: Record<number, string> = {
      1: 'text-2xl font-bold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-800 mt-6 mb-3 flex items-center gap-2 group',
      2: 'text-xl font-bold text-gray-900 dark:text-gray-100 pb-1.5 border-b border-gray-200 dark:border-gray-800 mt-5 mb-2.5 flex items-center gap-2 group',
      3: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2 flex items-center gap-1.5 group',
      4: 'text-base font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1.5',
      5: 'text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-2 mb-1',
      6: 'text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500 mt-2 mb-1',
    };

    const cls = headingClasses[token.depth] || headingClasses[3];

    return `<h${token.depth} id="${slug}" class="${cls}">
      <span>${text}</span>
      <a href="#${slug}" class="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity text-blue-500 text-xs font-mono select-none" title="Permalink">#</a>
    </h${token.depth}>`;
  }

  code(token: Tokens.Code): string {
    const language = (token.lang || 'text').toLowerCase();
    const escapedCode = escapeHtml(token.text);

    if (language === 'mermaid') {
      return `
        <div class="my-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-[#13141f] p-4 text-center overflow-x-auto shadow-xs">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100 dark:border-indigo-950 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
            <span class="flex items-center gap-1.5 font-semibold">
              <span class="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Mermaid Diagram
            </span>
            <span class="uppercase font-bold text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40">diagram</span>
          </div>
          <pre class="font-mono text-xs text-left overflow-x-auto text-indigo-950 dark:text-indigo-200 bg-white/70 dark:bg-black/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40"><code>${escapedCode}</code></pre>
        </div>
      `;
    }

    return `
      <div class="my-3 rounded-xl border border-gray-200 dark:border-[#333333] bg-[#f8f9fa] dark:bg-[#141414] overflow-hidden shadow-xs group">
        <div class="flex items-center justify-between px-3.5 py-1.5 bg-gray-100/80 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#2e2e2e] text-[11px] font-mono text-gray-500 dark:text-gray-400">
          <span class="uppercase tracking-wider font-semibold text-[10px] text-gray-600 dark:text-gray-300">${language}</span>
          <button 
            type="button"
            onclick="window.__copyMarkdownSnippet && window.__copyMarkdownSnippet(this)"
            class="code-copy-btn flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#333] text-gray-600 dark:text-gray-300 transition-colors"
            title="Copy code"
          >
            <span>Copy</span>
          </button>
        </div>
        <pre class="p-3.5 font-mono text-xs overflow-x-auto text-gray-800 dark:text-gray-200 leading-relaxed"><code>${escapedCode}</code></pre>
      </div>
    `;
  }

  blockquote(token: Tokens.Blockquote): string {
    const body = this.parser.parse(token.tokens);
    return `<blockquote class="border-l-4 border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 px-4 py-2.5 my-3 rounded-r-lg text-sm text-gray-700 dark:text-gray-300 italic">${body}</blockquote>`;
  }

  table(token: Tokens.Table): string {
    const tableHtml = super.table(token);
    return `<div class="my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-[#333333] shadow-xs">${tableHtml}</div>`;
  }

  codespan(token: Tokens.Codespan): string {
    return `<code class="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-[#282828] text-purple-600 dark:text-purple-400 font-mono text-[12px] border border-gray-200 dark:border-[#3a3a3a]">${escapeHtml(token.text)}</code>`;
  }

  hr(_token: Tokens.Hr): string {
    return `<hr class="my-6 border-0 border-t border-gray-200 dark:border-[#333333]" />`;
  }
}

export const MarkdownViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
  extension,
  onDownload,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Studio controls
  const [viewMode, setViewMode] = useState<'rendered' | 'split' | 'raw'>('rendered');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showToc, setShowToc] = useState(true);
  const [copiedDoc, setCopiedDoc] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const renderedContentRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Markdown Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetch(fileUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Unable to load markdown file`);
        return res.text();
      })
      .then((text) => {
        if (!isCancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || 'Failed to load markdown content');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // 2. Extract Table of Contents from Markdown Tokens
  const headings = useMemo<TocHeading[]>(() => {
    if (!content) return [];
    try {
      const tokens = marked.lexer(content);
      const items: TocHeading[] = [];
      const slugCounts = new Map<string, number>();

      for (const token of tokens) {
        if (token.type === 'heading') {
          const rawText = token.text.replace(/<[^>]*>/g, '').trim();
          let slug = rawText
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
          if (!slug) slug = `heading-${items.length + 1}`;

          const count = slugCounts.get(slug) || 0;
          slugCounts.set(slug, count + 1);
          const finalId = count > 0 ? `${slug}-${count}` : slug;

          items.push({
            id: finalId,
            text: rawText,
            depth: token.depth,
          });
        }
      }
      return items;
    } catch {
      return [];
    }
  }, [content]);

  // 3. Document Telemetry & Statistics
  const stats = useMemo(() => {
    if (!content) return { words: 0, characters: 0, lines: 0, readingTimeMin: 0 };
    const lines = content.split('\n');
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readingTimeMin = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      characters: content.length,
      lines: lines.length,
      readingTimeMin,
    };
  }, [content]);

  // 4. Parse Markdown with Custom Renderer
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Process GitHub-style alerts before parsing
    const processedContent = content.replace(
      /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*?)(?=\n\n|\n(?=[^>])|$)/gim,
      (_match, alertType, alertBody) => {
        const type = alertType.toUpperCase();
        return `:::alert-${type.toLowerCase()}\n${alertBody.trim()}\n:::`;
      }
    );

    const renderer = new MarkdownStudioRenderer();

    try {
      let html = marked.parse(processedContent, {
        renderer,
        gfm: true,
        breaks: true,
      }) as string;

      // Replace alert placeholders with styled callout cards
      html = html.replace(
        /<p>:::alert-(note|tip|important|warning|caution)\s*([\s\S]*?)\s*:::<\/p>/gim,
        (_m, alertType, alertBody) => renderAlertBox(alertType, alertBody)
      );

      return html;
    } catch {
      return `<pre class="font-mono p-4 text-xs">${escapeHtml(content)}</pre>`;
    }
  }, [content]);

  // Bind code block copy listener to window for dynamically rendered buttons
  useEffect(() => {
    (window as any).__copyMarkdownSnippet = (btn: HTMLElement) => {
      const codeBlock = btn.closest('.group')?.querySelector('pre code');
      if (codeBlock) {
        navigator.clipboard.writeText(codeBlock.textContent || '');
        const span = btn.querySelector('span');
        if (span) {
          const original = span.textContent;
          span.textContent = 'Copied!';
          setTimeout(() => {
            span.textContent = original;
          }, 2000);
        }
      }
    };
    return () => {
      delete (window as any).__copyMarkdownSnippet;
    };
  }, []);

  // Smooth scroll to heading when clicked in Table of Contents
  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Copy entire document
  const handleCopyDocument = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopiedDoc(true);
      setTimeout(() => setCopiedDoc(false), 2000);
    }
  };

  const fontSizeClasses = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-[#181818] text-gray-500">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-medium">Loading Markdown Studio preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-[#181818] text-center">
        <AlertTriangle size={36} className="text-amber-500 mb-2" />
        <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">
          Unable to Load Markdown Document
        </h4>
        <p className="text-xs text-gray-400 max-w-sm mb-4">{error}</p>
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all"
          >
            <Download size={14} />
            <span>Download Raw File</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col bg-white dark:bg-[#181818] overflow-hidden select-text text-xs"
    >
      {/* Scoped styles for rich Markdown typography */}
      <style>{`
        .markdown-studio-content table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          margin: 1rem 0;
        }
        .markdown-studio-content th {
          background-color: rgba(150, 150, 150, 0.1);
          padding: 0.6rem 0.8rem;
          font-weight: 600;
          border: 1px solid rgba(150, 150, 150, 0.2);
          text-align: left;
        }
        .markdown-studio-content td {
          padding: 0.5rem 0.8rem;
          border: 1px solid rgba(150, 150, 150, 0.2);
        }
        .markdown-studio-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .markdown-studio-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .markdown-studio-content li {
          margin: 0.25rem 0;
          line-height: 1.6;
        }
        .markdown-studio-content p {
          margin: 0.6rem 0;
          line-height: 1.65;
        }
        .markdown-studio-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
      `}</style>

      {/* Studio Header Toolbar */}
      <div className="h-10 bg-gray-50 dark:bg-[#202020] border-b border-gray-200 dark:border-[#2e2e2e] flex items-center justify-between px-3 shrink-0 gap-2 select-none">
        {/* Left: View Mode Segmented Controls */}
        <div className="flex items-center gap-1 bg-gray-200/70 dark:bg-[#2b2b2b] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('rendered')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'rendered'
                ? 'bg-white dark:bg-[#181818] text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Rich Markdown Preview"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Rendered</span>
          </button>

          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-white dark:bg-[#181818] text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Side-by-side Split View"
          >
            <Columns size={13} />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            onClick={() => setViewMode('raw')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'raw'
                ? 'bg-white dark:bg-[#181818] text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Raw Markdown Source"
          >
            <Code size={13} />
            <span className="hidden sm:inline">Source</span>
          </button>
        </div>

        {/* Center: Document Stats Pill */}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[160px]" title={fileName}>
            {fileName}
          </span>
          <span>•</span>
          <span>{formatHumanSize(fileSize)}</span>
          <span>•</span>
          <span>{stats.words.toLocaleString()} words</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-gray-400" />
            {stats.readingTimeMin} min
          </span>
        </div>

        {/* Right: Studio Utility Controls */}
        <div className="flex items-center gap-1.5">
          {/* Font Size Adjuster */}
          {viewMode !== 'raw' && (
            <div className="flex items-center bg-gray-200/70 dark:bg-[#2b2b2b] rounded-lg p-0.5">
              {(['sm', 'base', 'lg'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    fontSize === size
                      ? 'bg-white dark:bg-[#181818] text-gray-900 dark:text-gray-100 shadow-xs font-semibold'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                  }`}
                  title={`Font size: ${size}`}
                >
                  {size === 'sm' ? 'A-' : size === 'base' ? 'A' : 'A+'}
                </button>
              ))}
            </div>
          )}

          {/* Table of Contents Drawer Toggle */}
          {headings.length > 0 && viewMode !== 'raw' && (
            <button
              onClick={() => setShowToc(!showToc)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                showToc
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-100 dark:bg-[#2b2b2b] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'
              }`}
              title="Toggle Table of Contents"
            >
              <List size={13} />
              <span className="hidden sm:inline">TOC</span>
            </button>
          )}

          {/* Copy Markdown Text */}
          <button
            onClick={handleCopyDocument}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#2b2b2b] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 transition-colors"
            title="Copy entire document"
          >
            {copiedDoc ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copiedDoc ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Content Display */}
        <div className="flex-1 flex overflow-hidden">
          {/* Split Mode: Raw Source (Left pane) */}
          {(viewMode === 'split' || viewMode === 'raw') && (
            <div
              className={`${
                viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-[#2e2e2e]' : 'w-full'
              } h-full flex flex-col bg-gray-50 dark:bg-[#161616] overflow-hidden`}
            >
              <div className="px-4 py-1.5 bg-gray-100 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#2e2e2e] text-[11px] font-mono text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>RAW MARKDOWN SOURCE ({extension.toUpperCase()})</span>
                <span>{stats.lines} lines</span>
              </div>
              <div className="flex-1 overflow-auto flex font-mono text-xs">
                {/* Line Gutter */}
                <div className="bg-gray-100/70 dark:bg-[#141414] border-r border-gray-200 dark:border-[#2a2a2a] py-4 px-2.5 select-none text-right text-gray-400 font-mono text-[11px] shrink-0">
                  {content.split('\n').map((_, idx) => (
                    <div key={idx} className="leading-5">
                      {idx + 1}
                    </div>
                  ))}
                </div>
                {/* Source pre */}
                <pre className="flex-1 py-4 px-4 font-mono overflow-auto whitespace-pre leading-5 text-gray-800 dark:text-gray-200">
                  {content}
                </pre>
              </div>
            </div>
          )}

          {/* Rendered Mode (or right pane in split mode) */}
          {(viewMode === 'rendered' || viewMode === 'split') && (
            <div
              ref={renderedContentRef}
              className={`${
                viewMode === 'split' ? 'w-1/2' : 'w-full'
              } h-full overflow-y-auto p-6 md:p-10 flex justify-center bg-white dark:bg-[#181818]`}
            >
              <div className={`w-full max-w-3xl ${fontSizeClasses[fontSize]} transition-all`}>
                <div
                  className="markdown-studio-content text-gray-800 dark:text-gray-200 select-text"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Drawer: Table of Contents */}
        {showToc && headings.length > 0 && viewMode !== 'raw' && (
          <div className="w-64 border-l border-gray-200 dark:border-[#2e2e2e] bg-gray-50/70 dark:bg-[#1a1a1a] flex flex-col shrink-0 overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-gray-200 dark:border-[#2e2e2e] flex items-center justify-between">
              <span className="font-semibold text-xs text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <List size={13} className="text-purple-600 dark:text-purple-400" />
                <span>Table of Contents</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#282828]">
                {headings.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {headings.map((h, idx) => (
                <button
                  key={`${h.id}-${idx}`}
                  onClick={() => scrollToHeading(h.id)}
                  style={{ paddingLeft: `${Math.max(8, (h.depth - 1) * 12 + 8)}px` }}
                  className="w-full text-left py-1.5 pr-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/60 dark:hover:bg-purple-950/30 transition-colors truncate flex items-center gap-1 group"
                >
                  <ChevronRight
                    size={11}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 shrink-0"
                  />
                  <span className="truncate">{h.text}</span>
                </button>
              ))}
            </div>

            {/* Footer Telemetry Badge */}
            <div className="p-3 border-t border-gray-200 dark:border-[#2e2e2e] bg-gray-100/50 dark:bg-[#161616] text-[10px] text-gray-400 flex items-center justify-between font-mono">
              <span>Markdown Studio</span>
              <span className="text-purple-500 font-semibold">v1.0.4</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper: Escape HTML in raw code blocks
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper: Render GitHub-style callout alert boxes
function renderAlertBox(type: string, content: string): string {
  const alertStyles: Record<string, { bg: string; border: string; text: string; icon: string; title: string }> = {
    note: {
      bg: 'bg-blue-50/70 dark:bg-blue-950/20',
      border: 'border-blue-500',
      text: 'text-blue-900 dark:text-blue-200',
      icon: 'ℹ️',
      title: 'Note',
    },
    tip: {
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
      border: 'border-emerald-500',
      text: 'text-emerald-900 dark:text-emerald-200',
      icon: '💡',
      title: 'Tip',
    },
    important: {
      bg: 'bg-purple-50/70 dark:bg-purple-950/20',
      border: 'border-purple-500',
      text: 'text-purple-900 dark:text-purple-200',
      icon: '✨',
      title: 'Important',
    },
    warning: {
      bg: 'bg-amber-50/70 dark:bg-amber-950/20',
      border: 'border-amber-500',
      text: 'text-amber-900 dark:text-amber-200',
      icon: '⚠️',
      title: 'Warning',
    },
    caution: {
      bg: 'bg-rose-50/70 dark:bg-rose-950/20',
      border: 'border-rose-500',
      text: 'text-rose-900 dark:text-rose-200',
      icon: '🛑',
      title: 'Caution',
    },
  };

  const style = alertStyles[type] || alertStyles.note;

  return `
    <div class="my-4 p-3.5 rounded-xl border-l-4 ${style.border} ${style.bg} ${style.text} shadow-xs">
      <div class="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-1">
        <span>${style.icon}</span>
        <span>${style.title}</span>
      </div>
      <div class="text-xs leading-relaxed">${content}</div>
    </div>
  `;
}
