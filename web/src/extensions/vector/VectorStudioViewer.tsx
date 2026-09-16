import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import * as pako from 'pako';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Copy,
  Check,
  Download,
  Eye,
  Code,
  Sparkles,
  Search,
  Palette,
  Loader2,
  FileDown,
  Info,
  Sliders,
  ChevronDown,
  X,
} from 'lucide-react';
import { PreviewExtensionProps } from '../../types';
import { formatHumanSize } from '../../utils/format';

type BackgroundType = 'checker' | 'slate' | 'white' | 'black';

interface SvgTelemetry {
  width: string;
  height: string;
  viewBox: string;
  pathCount: number;
  groupCount: number;
  circleCount: number;
  rectCount: number;
  textCount: number;
  gradientCount: number;
  palette: string[];
}

export const VectorStudioViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
  onDownload,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgText, setSvgText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [bgMode, setBgMode] = useState<BackgroundType>('checker');
  const [zoom, setZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Search state for Code mode
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  // Load and decode SVG / SVGZ
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadSvg = async () => {
      try {
        const res = await fetch(fileUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        const uint8 = new Uint8Array(buffer);
        let decodedText = '';

        // Check for gzip compression header (0x1f, 0x8b) for .svgz or compressed SVG
        if (uint8.length >= 2 && uint8[0] === 0x1f && uint8[1] === 0x8b) {
          try {
            const decompressed = pako.ungzip(uint8);
            decodedText = new TextDecoder('utf-8').decode(decompressed);
          } catch (gzErr) {
            console.warn('pako ungzip failed, trying DecompressionStream...', gzErr);
            if (typeof DecompressionStream !== 'undefined') {
              const stream = new Response(uint8).body?.pipeThrough(new DecompressionStream('gzip'));
              if (stream) {
                decodedText = await new Response(stream).text();
              }
            }
          }
        } else {
          decodedText = new TextDecoder('utf-8').decode(uint8);
        }

        if (!decodedText || !decodedText.includes('<svg')) {
          // If no <svg tag found, fallback to raw text decode
          decodedText = new TextDecoder('utf-8').decode(uint8);
        }

        if (!cancelled) {
          setSvgText(decodedText);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('VectorStudioViewer load error:', err);
          setError(err.message || 'Failed to load vector file');
          setLoading(false);
        }
      }
    };

    loadSvg();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Extract Vector Telemetry & Palette from SVG
  const telemetry: SvgTelemetry = useMemo(() => {
    if (!svgText) {
      return {
        width: 'Auto',
        height: 'Auto',
        viewBox: 'None',
        pathCount: 0,
        groupCount: 0,
        circleCount: 0,
        rectCount: 0,
        textCount: 0,
        gradientCount: 0,
        palette: [],
      };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');

      if (!svgEl) {
        return {
          width: 'Auto',
          height: 'Auto',
          viewBox: 'None',
          pathCount: 0,
          groupCount: 0,
          circleCount: 0,
          rectCount: 0,
          textCount: 0,
          gradientCount: 0,
          palette: [],
        };
      }

      const width = svgEl.getAttribute('width') || 'Auto';
      const height = svgEl.getAttribute('height') || 'Auto';
      const viewBox = svgEl.getAttribute('viewBox') || 'None';

      const pathCount = doc.querySelectorAll('path').length;
      const groupCount = doc.querySelectorAll('g').length;
      const circleCount = doc.querySelectorAll('circle, ellipse').length;
      const rectCount = doc.querySelectorAll('rect').length;
      const textCount = doc.querySelectorAll('text, tspan').length;
      const gradientCount = doc.querySelectorAll('linearGradient, radialGradient').length;

      // Extract unique color palette
      const colorSet = new Set<string>();
      const colorRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g;

      const elements = doc.querySelectorAll('*');
      elements.forEach((el) => {
        ['fill', 'stroke', 'stop-color', 'color'].forEach((attr) => {
          const val = el.getAttribute(attr);
          if (val && !['none', 'transparent', 'inherit', 'currentcolor'].includes(val.toLowerCase())) {
            const matches = val.match(colorRegex);
            if (matches) {
              matches.forEach((c) => colorSet.add(c.toLowerCase()));
            } else if (val.startsWith('#') || val.startsWith('rgb')) {
              colorSet.add(val.toLowerCase());
            }
          }
        });

        // Also check inline style attributes
        const style = el.getAttribute('style');
        if (style) {
          const matches = style.match(colorRegex);
          if (matches) {
            matches.forEach((c) => colorSet.add(c.toLowerCase()));
          }
        }
      });

      return {
        width,
        height,
        viewBox,
        pathCount,
        groupCount,
        circleCount,
        rectCount,
        textCount,
        gradientCount,
        palette: Array.from(colorSet).slice(0, 16),
      };
    } catch {
      return {
        width: 'Auto',
        height: 'Auto',
        viewBox: 'None',
        pathCount: 0,
        groupCount: 0,
        circleCount: 0,
        rectCount: 0,
        textCount: 0,
        gradientCount: 0,
        palette: [],
      };
    }
  }, [svgText]);

  // Clean / Sanitized SVG for visual rendering
  const sanitizedSvg = useMemo(() => {
    if (!svgText) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return svgText;

      // Ensure vector graphic scales cleanly within viewport container
      svgEl.setAttribute('style', 'max-width: 100%; max-height: 100%; display: block; overflow: visible;');
      return svgEl.outerHTML;
    } catch {
      return svgText;
    }
  }, [svgText]);

  // Handle Pan & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'visual') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== 'visual') return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode !== 'visual') return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 15 : -15;
    setZoom((prev) => Math.min(Math.max(prev + delta, 25), 1000));
  };

  // Reset Zoom and Pan
  const handleReset = useCallback(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFit = useCallback(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, []);

  // Copy SVG Code
  const handleCopySvg = () => {
    if (!svgText) return;
    navigator.clipboard.writeText(svgText);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  // Copy Color Swatch
  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 1800);
  };

  // Export as Raster PNG at given scale
  const handleExportPng = async (scale: number = 2) => {
    if (!svgText) return;
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = (img.naturalWidth || 800) * scale;
        const height = (img.naturalHeight || 800) * scale;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          setIsExporting(false);
          return;
        }

        // Fill background if not in checkerboard mode
        if (bgMode === 'white') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'slate') {
          ctx.fillStyle = '#18181b';
          ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'black') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${fileName.replace(/\.[^/.]+$/, '')}@${scale}x.png`;
            a.click();
            URL.revokeObjectURL(pngUrl);
          }
          setIsExporting(false);
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        setIsExporting(false);
      };

      img.src = url;
    } catch (err) {
      console.error('Export PNG failed:', err);
      setIsExporting(false);
    }
  };

  // Syntax-highlighted SVG XML
  const highlightedCode = useMemo(() => {
    if (!svgText || viewMode !== 'code') return '';
    try {
      return Prism.highlight(svgText, Prism.languages.markup, 'markup');
    } catch {
      return svgText;
    }
  }, [svgText, viewMode]);

  // Code line numbers
  const codeLines = useMemo(() => {
    if (!svgText) return [];
    return svgText.split('\n');
  }, [svgText]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#121316] text-gray-300 gap-3">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <span className="text-xs font-medium">Rendering vector viewport...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#121316] text-gray-300 text-center gap-3">
        <div className="p-3 bg-red-950/50 rounded-2xl border border-red-800/60 text-red-400">
          <Info size={24} />
        </div>
        <div className="font-semibold text-sm text-red-400">Unable to load vector graphic</div>
        <div className="text-xs text-gray-400 max-w-sm">{error}</div>
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all mt-2"
          >
            <Download size={14} />
            <span>Download Vector File</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#141417] text-gray-200 overflow-hidden select-none font-sans">
      {/* Studio Toolbar */}
      <div className="h-11 bg-[#1c1d22] border-b border-gray-800/80 px-3 flex items-center justify-between shrink-0 gap-2">
        {/* Left: View Mode Toggle & Telemetry Switch */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-[#25272e] p-0.5 rounded-lg border border-gray-700/60 text-xs">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'visual'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Eye size={13} />
              <span className="hidden sm:inline">Vector</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'code'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Code size={13} />
              <span className="hidden sm:inline">SVG Code</span>
            </button>
          </div>

          <button
            onClick={() => setShowTelemetry(!showTelemetry)}
            title="Toggle Vector Telemetry & Palette"
            className={`p-1.5 rounded-lg text-xs transition-colors hidden md:flex items-center gap-1 ${
              showTelemetry
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <Sliders size={13} />
            <span className="text-[11px]">Telemetry</span>
          </button>

          {viewMode === 'code' && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              title="Search within SVG markup"
              className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                showSearch
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <Search size={13} />
              <span className="text-[11px] hidden sm:inline">Search</span>
            </button>
          )}
        </div>

        {/* Center: Zoom & Viewport Controls (Visual Mode) */}
        {viewMode === 'visual' && (
          <div className="flex items-center gap-1 bg-[#25272e] px-2 py-0.5 rounded-lg border border-gray-700/60 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(z - 25, 25))}
              title="Zoom Out"
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <ZoomOut size={13} />
            </button>

            <button
              onClick={handleReset}
              title="Click to reset to 100%"
              className="px-1.5 py-0.5 font-mono text-[11px] text-gray-300 hover:text-blue-400 font-semibold min-w-[48px] text-center"
            >
              {zoom}%
            </button>

            <button
              onClick={() => setZoom((z) => Math.min(z + 25, 1000))}
              title="Zoom In"
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <ZoomIn size={13} />
            </button>

            <div className="w-[1px] h-3.5 bg-gray-700 mx-1" />

            <button
              onClick={handleFit}
              title="Fit to Screen"
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <Maximize2 size={13} />
            </button>

            <button
              onClick={handleReset}
              title="Center View"
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        )}

        {/* Right: Background Presets & Quick Actions */}
        <div className="flex items-center gap-1.5">
          {viewMode === 'visual' && (
            <div className="flex items-center bg-[#25272e] p-0.5 rounded-lg border border-gray-700/60 mr-1">
              <button
                onClick={() => setBgMode('checker')}
                title="Checkerboard (Transparent Canvas)"
                className={`p-1 rounded text-xs transition-all ${
                  bgMode === 'checker' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-xs checkerboard-light border border-gray-500/40" />
              </button>
              <button
                onClick={() => setBgMode('white')}
                title="Crisp White Canvas"
                className={`p-1 rounded text-xs transition-all ${
                  bgMode === 'white' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-xs bg-white border border-gray-300" />
              </button>
              <button
                onClick={() => setBgMode('slate')}
                title="Dark Slate Canvas"
                className={`p-1 rounded text-xs transition-all ${
                  bgMode === 'slate' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-xs bg-zinc-800 border border-gray-600" />
              </button>
              <button
                onClick={() => setBgMode('black')}
                title="Deep Black Canvas"
                className={`p-1 rounded text-xs transition-all ${
                  bgMode === 'black' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-xs bg-black border border-gray-700" />
              </button>
            </div>
          )}

          {/* Copy SVG XML */}
          <button
            onClick={handleCopySvg}
            title="Copy SVG Code to Clipboard"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-all"
          >
            {copiedSvg ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copiedSvg ? 'Copied' : 'Copy SVG'}</span>
          </button>

          {/* Export PNG Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              title="Export as High-Res PNG"
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-xs"
            >
              {isExporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              <span className="hidden sm:inline">Export PNG</span>
              <ChevronDown size={11} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-[#1e1e24] border border-gray-700 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Raster Resolution
                </div>
                <button
                  onClick={() => handleExportPng(1)}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between text-gray-200 transition-colors"
                >
                  <span>1x (Standard)</span>
                  <span className="text-[10px] text-gray-400 font-mono">Web</span>
                </button>
                <button
                  onClick={() => handleExportPng(2)}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between text-gray-200 transition-colors"
                >
                  <span>2x (High-DPI)</span>
                  <span className="text-[10px] text-gray-400 font-mono">Retina</span>
                </button>
                <button
                  onClick={() => handleExportPng(4)}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between text-gray-200 transition-colors"
                >
                  <span>4x (Ultra HD)</span>
                  <span className="text-[10px] text-gray-400 font-mono">Print</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Viewport Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {viewMode === 'visual' ? (
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className={`flex-1 w-full h-full relative overflow-hidden flex items-center justify-center ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            } ${
              bgMode === 'checker'
                ? 'checkerboard-dark'
                : bgMode === 'white'
                ? 'bg-[#ffffff]'
                : bgMode === 'slate'
                ? 'bg-[#18181b]'
                : 'bg-[#000000]'
            }`}
          >
            {/* Centered Scalable Vector Canvas */}
            <div
              ref={svgWrapperRef}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              }}
              className="flex items-center justify-center p-8 select-none pointer-events-none drop-shadow-md"
              dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
            />

            {/* Float Bottom Controls Hint */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-gray-400 pointer-events-none flex items-center gap-2 border border-white/5">
              <span>Scroll to zoom</span>
              <span>•</span>
              <span>Drag to pan</span>
              <span>•</span>
              <span className="text-gray-300 font-semibold">{zoom}%</span>
            </div>
          </div>
        ) : (
          /* SVG XML Code View */
          <div className="flex-1 w-full h-full bg-[#121316] overflow-auto flex flex-col font-mono text-xs">
            {/* Search Bar */}
            {showSearch && (
              <div className="px-4 py-2 bg-[#1b1c21] border-b border-gray-800 flex items-center gap-2 shrink-0">
                <Search size={14} className="text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find in SVG markup..."
                  className="bg-transparent border-0 text-xs text-gray-200 focus:outline-hidden w-full"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                  title="Close search"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex-1 flex overflow-auto">
              {/* Line Numbers */}
              <div className="py-3 px-3 bg-[#16171b] border-r border-gray-800/80 text-right select-none text-gray-600 text-[11px] font-mono shrink-0">
                {codeLines.map((_, i) => (
                  <div key={i} className="leading-5">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code Contents */}
              <div className="flex-1 p-3 overflow-x-auto">
                <pre className="m-0 font-mono text-[11.5px] leading-5 text-gray-200">
                  <code
                    className="language-markup"
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  />
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Telemetry & Extracted Palette Panel */}
        {showTelemetry && (
          <div className="bg-[#18191f] border-t border-gray-800/80 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 text-xs">
            {/* Vector Specs */}
            <div className="flex items-center gap-3 font-mono text-[11px] text-gray-400 flex-wrap">
              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                <Sparkles size={12} />
                <span>Vector SVG</span>
              </span>
              <span>
                Dimensions: <span className="text-gray-200">{telemetry.width} × {telemetry.height}</span>
              </span>
              <span>
                viewBox: <span className="text-gray-200">{telemetry.viewBox}</span>
              </span>
              <span>
                Size: <span className="text-gray-200">{formatHumanSize(fileSize)}</span>
              </span>
              <span className="text-gray-500">
                ({telemetry.pathCount} paths, {telemetry.groupCount} groups)
              </span>
            </div>

            {/* Extracted Color Palette Swatches */}
            {telemetry.palette.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-gray-500 mr-1 flex items-center gap-1">
                  <Palette size={11} />
                  <span>Palette:</span>
                </span>
                {telemetry.palette.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleCopyColor(color)}
                    title={`Click to copy ${color}`}
                    className="group relative flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#23242b] hover:bg-[#2b2c36] border border-gray-700/60 transition-all active:scale-95"
                  >
                    <span
                      style={{ backgroundColor: color }}
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                    />
                    <span className="font-mono text-[10px] text-gray-300 lowercase">
                      {copiedColor === color ? 'Copied!' : color}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
