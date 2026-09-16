import React, { useState, useMemo, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-hcl';
import {
  Copy,
  Check,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  WrapText,
  Download,
  Code2,
  FileCode,
  FileJson,
  Database,
  Terminal,
  Settings,
  LucideIcon,
} from 'lucide-react';
import { formatHumanSize } from '../../utils/format';

export interface CodeConfigViewerProps {
  content: string;
  fileName: string;
  fileSize: number;
  extension?: string;
  onDownload?: () => void;
}

interface LanguageMeta {
  name: string;
  prismLang: string;
  badgeBg: string;
  badgeText: string;
  icon: LucideIcon;
}

export function detectLanguage(ext: string, filename: string): LanguageMeta {
  const lowerExt = (ext || filename.split('.').pop() || '').toLowerCase().replace(/^\./, '');
  const lowerName = filename.toLowerCase();

  if (lowerName === 'dockerfile' || lowerExt === 'dockerfile') {
    return { name: 'Dockerfile', prismLang: 'bash', badgeBg: 'bg-blue-500/15', badgeText: 'text-blue-400', icon: Terminal };
  }

  switch (lowerExt) {
    case 'ts':
    case 'tsx':
      return { name: 'TypeScript', prismLang: 'typescript', badgeBg: 'bg-blue-500/15', badgeText: 'text-blue-400', icon: FileCode };
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return { name: 'JavaScript', prismLang: 'javascript', badgeBg: 'bg-yellow-500/15', badgeText: 'text-yellow-400', icon: FileCode };
    case 'json':
    case 'json5':
    case 'jsonc':
      return { name: 'JSON', prismLang: 'json', badgeBg: 'bg-amber-500/15', badgeText: 'text-amber-400', icon: FileJson };
    case 'yaml':
    case 'yml':
      return { name: 'YAML', prismLang: 'yaml', badgeBg: 'bg-rose-500/15', badgeText: 'text-rose-400', icon: Settings };
    case 'toml':
      return { name: 'TOML', prismLang: 'toml', badgeBg: 'bg-orange-500/15', badgeText: 'text-orange-400', icon: Settings };
    case 'py':
    case 'pyw':
      return { name: 'Python', prismLang: 'python', badgeBg: 'bg-emerald-500/15', badgeText: 'text-emerald-400', icon: Code2 };
    case 'rs':
      return { name: 'Rust', prismLang: 'rust', badgeBg: 'bg-orange-600/15', badgeText: 'text-orange-400', icon: Code2 };
    case 'sql':
      return { name: 'SQL', prismLang: 'sql', badgeBg: 'bg-purple-500/15', badgeText: 'text-purple-400', icon: Database };
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return { name: 'Shell', prismLang: 'bash', badgeBg: 'bg-green-500/15', badgeText: 'text-green-400', icon: Terminal };
    case 'tf':
    case 'tfvars':
    case 'hcl':
      return { name: 'Terraform (HCL)', prismLang: 'hcl', badgeBg: 'bg-indigo-500/15', badgeText: 'text-indigo-400', icon: Settings };
    case 'ini':
    case 'conf':
    case 'cfg':
    case 'env':
    case 'properties':
      return { name: 'Config / INI', prismLang: 'ini', badgeBg: 'bg-cyan-500/15', badgeText: 'text-cyan-400', icon: Settings };
    case 'xml':
    case 'html':
    case 'svg':
      return { name: 'Markup / XML', prismLang: 'markup', badgeBg: 'bg-teal-500/15', badgeText: 'text-teal-400', icon: FileCode };
    case 'css':
    case 'scss':
      return { name: 'CSS', prismLang: 'css', badgeBg: 'bg-sky-500/15', badgeText: 'text-sky-400', icon: FileCode };
    default:
      return { name: lowerExt ? lowerExt.toUpperCase() : 'Plain Text', prismLang: 'clike', badgeBg: 'bg-neutral-500/15', badgeText: 'text-neutral-400', icon: Code2 };
  }
}

export const CodeConfigViewer: React.FC<CodeConfigViewerProps> = ({
  content,
  fileName,
  fileSize,
  extension,
  onDownload,
}) => {
  const langMeta = useMemo(() => detectLanguage(extension || '', fileName), [extension, fileName]);

  // Code Display State
  const [isFormatted, setIsFormatted] = useState(false);
  const [formattedContent, setFormattedContent] = useState<string | null>(null);
  const [wrapLines, setWrapLines] = useState(false);
  const [fontSize, setFontSize] = useState<11 | 12 | 13 | 14>(12);
  const [copied, setCopied] = useState(false);

  // In-Document Search State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Format Code Logic
  const handleToggleFormat = () => {
    if (isFormatted) {
      setIsFormatted(false);
      return;
    }

    // 1. JSON Prettify
    try {
      const parsed = JSON.parse(content);
      setFormattedContent(JSON.stringify(parsed, null, 2));
      setIsFormatted(true);
      return;
    } catch {}

    // 2. SQL Prettify
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'LEFT JOIN', 'RIGHT JOIN',
      'INNER JOIN', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
      'ALTER TABLE', 'DROP TABLE', 'UNION ALL', 'UNION'
    ];
    let isSql = false;
    let formattedSql = content;
    for (const kw of sqlKeywords) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(formattedSql)) {
        isSql = true;
        formattedSql = formattedSql.replace(new RegExp(`\\s*\\b(${kw})\\b\\s*`, 'gi'), '\n$1 ');
      }
    }
    if (isSql) {
      setFormattedContent(formattedSql.trim());
      setIsFormatted(true);
      return;
    }

    // 3. XML / HTML Prettify
    if (content.trim().startsWith('<') && content.trim().endsWith('>')) {
      let formattedXml = '';
      let indent = 0;
      const tab = '  ';
      content.split(/>\s*</).forEach((node) => {
        if (node.match(/^\/\w/)) indent = Math.max(0, indent - 1);
        formattedXml += tab.repeat(indent) + '<' + node + '>\r\n';
        if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('input') && !node.startsWith('meta')) {
          indent++;
        }
      });
      setFormattedContent(formattedXml.trim());
      setIsFormatted(true);
      return;
    }

    // Generic fallback: collapse excess blank lines
    setFormattedContent(content.replace(/\n{3,}/g, '\n\n'));
    setIsFormatted(true);
  };

  const activeText = isFormatted && formattedContent !== null ? formattedContent : content;
  const lines = useMemo(() => activeText.split('\n'), [activeText]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(activeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [activeText]);

  // Prism Highlighted Lines
  const highlightedLines = useMemo(() => {
    const grammar = Prism.languages[langMeta.prismLang] || Prism.languages.clike || Prism.languages.plain;
    return lines.map((line) => {
      if (!line) return '&nbsp;';
      try {
        return Prism.highlight(line, grammar, langMeta.prismLang);
      } catch {
        return line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    });
  }, [lines, langMeta.prismLang]);

  // Search Matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches: { line: number; col: number }[] = [];
    lines.forEach((l, lIdx) => {
      let col = l.toLowerCase().indexOf(q);
      while (col !== -1) {
        matches.push({ line: lIdx, col });
        col = l.toLowerCase().indexOf(q, col + q.length);
      }
    });
    return matches;
  }, [lines, searchQuery]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % searchMatches.length);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
  };

  const LangIcon = langMeta.icon;

  return (
    <div className="w-full h-full flex flex-col bg-[#141416] text-neutral-200 overflow-hidden font-mono select-text relative border border-neutral-800 rounded-xl shadow-2xl">
      {/* 1. Header Toolbar */}
      <header className="h-11 bg-neutral-900/95 border-b border-neutral-800 px-3.5 flex items-center justify-between text-xs select-none shrink-0 z-10">
        {/* Left: Language Badge & File Identity */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-neutral-700/60 font-semibold text-[11px] ${langMeta.badgeBg} ${langMeta.badgeText}`}
          >
            <LangIcon size={13} />
            <span>{langMeta.name}</span>
          </div>

          <span className="font-semibold text-neutral-200 text-xs truncate max-w-[200px] sm:max-w-[320px]">
            {fileName}
          </span>

          <span className="hidden sm:inline-block text-[11px] text-neutral-500 font-normal">
            ({formatHumanSize(fileSize)})
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Format / Minify */}
          <button
            onClick={handleToggleFormat}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              isFormatted
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700/70'
            }`}
            title={isFormatted ? 'Restore original formatting' : 'Prettify and auto-format'}
          >
            <Sparkles size={12} className={isFormatted ? 'text-amber-300' : 'text-purple-400'} />
            <span className="hidden md:inline">{isFormatted ? 'Formatted' : 'Format'}</span>
          </button>

          {/* Wrap Lines */}
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              wrapLines
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700/70'
            }`}
            title="Toggle Line Wrap"
          >
            <WrapText size={12} />
            <span className="hidden lg:inline">{wrapLines ? 'Wrap: On' : 'Wrap'}</span>
          </button>

          {/* Search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-md text-neutral-300 hover:text-white transition-colors ${
              showSearch ? 'bg-neutral-700 text-white' : 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/70'
            }`}
            title="Find in file (Ctrl+F)"
          >
            <Search size={13} />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/70 text-[11px] font-medium transition-colors"
            title="Copy all code"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download */}
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/70 transition-colors"
              title="Download original file"
            >
              <Download size={13} />
            </button>
          )}
        </div>
      </header>

      {/* 2. Embedded Search Bar (Slide Down) */}
      {showSearch && (
        <div className="h-9 bg-neutral-900 border-b border-neutral-800 px-3 flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-150 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search size={13} className="text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveMatchIndex(0);
              }}
              placeholder="Find in document..."
              autoFocus
              className="bg-neutral-800 border border-neutral-700 rounded px-2 py-0.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 w-full"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            {searchQuery && (
              <span>
                {searchMatches.length > 0
                  ? `${activeMatchIndex + 1} of ${searchMatches.length}`
                  : 'No matches'}
              </span>
            )}

            <button
              onClick={handlePrevMatch}
              disabled={searchMatches.length === 0}
              className="p-1 hover:bg-neutral-800 rounded disabled:opacity-30 text-neutral-300"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={searchMatches.length === 0}
              className="p-1 hover:bg-neutral-800 rounded disabled:opacity-30 text-neutral-300"
              title="Next match (Enter)"
            >
              <ChevronDown size={14} />
            </button>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Synchronized Code Canvas */}
      <div className="flex-1 overflow-auto bg-[#121214] text-[12px] leading-5 relative">
        <style>{`
          /* Prism VS Code Dark+ & OneDark Theme */
          .token.comment, .token.prolog, .token.doctype, .token.cdata {
            color: #768390;
            font-style: italic;
          }
          .token.punctuation {
            color: #abb2bf;
          }
          .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol {
            color: #f08d49;
          }
          .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin {
            color: #7ee787;
          }
          .token.operator, .token.entity, .token.url {
            color: #79c0ff;
          }
          .token.atrule, .token.attr-value, .token.keyword {
            color: #ff7b72;
          }
          .token.function, .token.class-name {
            color: #d2a8ff;
          }
          .token.variable {
            color: #ffa657;
          }
          .code-row:hover {
            background-color: rgba(255, 255, 255, 0.03);
          }
        `}</style>

        <div className="min-w-full inline-block py-2">
          {lines.map((_, idx) => {
            const isMatchLine = searchMatches.some((m) => m.line === idx);
            const isCurrentMatchLine =
              searchMatches.length > 0 && searchMatches[activeMatchIndex]?.line === idx;

            return (
              <div
                key={idx}
                className={`code-row flex items-baseline transition-colors ${
                  isCurrentMatchLine
                    ? 'bg-amber-500/20'
                    : isMatchLine
                    ? 'bg-blue-500/10'
                    : ''
                }`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {/* Line Number */}
                <span className="w-12 select-none text-right pr-4 text-neutral-600 text-[11px] font-mono shrink-0 hover:text-neutral-400 cursor-pointer">
                  {idx + 1}
                </span>

                {/* Line Token Content */}
                <span
                  className={`flex-1 pr-4 ${
                    wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                  }`}
                  dangerouslySetInnerHTML={{ __html: highlightedLines[idx] }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Footer Telemetry Status Bar */}
      <footer className="h-6 bg-neutral-900 border-t border-neutral-800/80 px-3 flex items-center justify-between text-[11px] text-neutral-400 select-none shrink-0 font-sans">
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>{lines.length} lines</span>
          <span>•</span>
          <span>{activeText.length.toLocaleString()} characters</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">UTF-8</span>
          <span>•</span>
          <span>{activeText.includes('\r\n') ? 'CRLF' : 'LF'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFontSize((s) => (s > 11 ? ((s - 1) as any) : s))}
            className="px-1.5 py-0.2 hover:bg-neutral-800 rounded text-[10px] text-neutral-400 hover:text-white"
            title="Decrease font size"
          >
            A-
          </button>
          <span className="text-[10px] font-mono text-neutral-500">{fontSize}px</span>
          <button
            onClick={() => setFontSize((s) => (s < 14 ? ((s + 1) as any) : s))}
            className="px-1.5 py-0.2 hover:bg-neutral-800 rounded text-[10px] text-neutral-400 hover:text-white"
            title="Increase font size"
          >
            A+
          </button>
        </div>
      </footer>
    </div>
  );
};
