import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Layers,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Check,
  Folder,
  FolderOpen,
  Type,
  Maximize2,
  Sliders,
  Sparkles,
  Search,
  Focus,
  RotateCcw,
  ChevronsDown,
  ChevronsUp,
  Copy,
} from 'lucide-react';
import { PreviewExtensionProps } from '../../types';
import { formatHumanSize } from '../../utils/format';
import {
  decodePsdFile,
  renderDynamicLayers,
  DecodedLayer,
  DecodedPsdResult,
} from './psdDecoder';

type LayerFilter = 'all' | 'groups' | 'text' | 'images';
type BackdropMode = 'checker-light' | 'checker-dark' | 'white' | 'black';

export const PsdViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
}) => {
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Downloading & Parsing PSD...');
  const [error, setError] = useState<string | null>(null);
  const [psdData, setPsdData] = useState<DecodedPsdResult | null>(null);

  // Viewport & Transform State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [showLayers, setShowLayers] = useState(true);
  const [backdropMode, setBackdropMode] = useState<BackdropMode>('checker-light');
  const [copiedExport, setCopiedExport] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Smart Organization State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LayerFilter>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Dynamic Visibility & Solo State
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(new Set());
  const [soloLayerId, setSoloLayerId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch & Parse PSD
  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadingMessage('Downloading PSD binary stream...');
        setError(null);

        const res = await fetch(fileUrl, { credentials: 'include' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch file`);
        }

        const buffer = await res.arrayBuffer();
        if (isCancelled) return;

        setLoadingMessage('Decompressing PSD composite & layer records...');
        const result = await decodePsdFile(buffer);
        if (isCancelled) return;

        setPsdData(result);

        // Auto-expand all top-level groups by default
        const initialExpanded: Record<string, boolean> = {};
        result.layers.forEach((l) => {
          if (l.isGroup) {
            initialExpanded[l.id] = true;
          }
        });
        setExpandedGroups(initialExpanded);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to parse PSD:', err);
          setError(err.message || 'Unable to parse Adobe Photoshop file.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // 2. Dynamic Layer Compositor Effect
  // Updates canvas in real time when any layer/folder visibility or solo mode changes
  useEffect(() => {
    if (!psdData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = psdData;
    canvas.width = width;
    canvas.height = height;

    // Render either the pristine Adobe composite or the dynamically composited layer stack
    const renderedCanvas = renderDynamicLayers(psdData, hiddenLayerIds, soloLayerId);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(renderedCanvas, 0, 0, width, height);

    // Selected layer bounding box highlight
    if (selectedLayerId) {
      const selected = psdData.flatLayers.find((l) => l.id === selectedLayerId);
      if (
        selected &&
        selected.left !== undefined &&
        selected.top !== undefined &&
        selected.width !== undefined &&
        selected.height !== undefined &&
        selected.width > 0 &&
        selected.height > 0
      ) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(2, Math.round(width / 700));
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(selected.left, selected.top, selected.width, selected.height);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(selected.left, selected.top, selected.width, selected.height);
        ctx.restore();
      }
    }
  }, [psdData, hiddenLayerIds, soloLayerId, selectedLayerId]);

  // 3. Auto-fit to viewport upon initial load and container resize
  const fitToScreen = useCallback(() => {
    if (!psdData || !containerRef.current) return;
    const container = containerRef.current;
    const padding = 60;
    const availW = Math.max(200, container.clientWidth - padding);
    const availH = Math.max(200, container.clientHeight - padding);

    const scaleX = availW / psdData.width;
    const scaleY = availH / psdData.height;
    const initialZoom = Math.min(1, Math.min(scaleX, scaleY));

    setZoom(Number(initialZoom.toFixed(2)));
    setPan({ x: 0, y: 0 });
  }, [psdData]);

  useEffect(() => {
    if (!psdData || !containerRef.current) return;
    fitToScreen();

    const ro = new ResizeObserver(() => {
      fitToScreen();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [psdData, fitToScreen]);

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  // Wheel zoom centered around cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.min(6, Math.max(0.1, Number((z + delta).toFixed(2)))));
  };

  // Export current canvas artwork (respects toggled layers!)
  const handleExportPng = () => {
    if (!canvasRef.current || !psdData) return;
    const link = document.createElement('a');
    const suffix = soloLayerId ? '-solo' : hiddenLayerIds.size > 0 ? '-custom' : '-composite';
    link.download = `${fileName.replace(/\.(psd|psb)$/i, '')}${suffix}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  // Expand / Collapse All
  const expandAll = () => {
    if (!psdData) return;
    const allExp: Record<string, boolean> = {};
    psdData.flatLayers.forEach((l) => {
      if (l.isGroup) allExp[l.id] = true;
    });
    setExpandedGroups(allExp);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Layer Visibility Toggle
  const toggleLayerVisibility = (layer: DecodedLayer, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenLayerIds((prev) => {
      const next = new Set(prev);
      const isCurrentlyHidden = next.has(layer.id);

      // Recursive helper to toggle group and all children
      const setBranchVisibility = (l: DecodedLayer, hide: boolean) => {
        if (hide) {
          next.add(l.id);
        } else {
          next.delete(l.id);
        }
        if (l.children) {
          l.children.forEach((c) => setBranchVisibility(c, hide));
        }
      };

      setBranchVisibility(layer, !isCurrentlyHidden);
      return next;
    });
  };

  // Solo / Isolate Mode Toggle
  const toggleSolo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSoloLayerId((prev) => (prev === id ? null : id));
  };

  // Reset all visibility
  const resetAllVisibility = () => {
    setHiddenLayerIds(new Set());
    setSoloLayerId(null);
  };

  // Copy text to clipboard
  const copyTextContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1800);
  };

  // Selected layer info
  const selectedLayer = useMemo(() => {
    if (!psdData || !selectedLayerId) return null;
    return psdData.flatLayers.find((l) => l.id === selectedLayerId) || null;
  }, [psdData, selectedLayerId]);

  // Counts for filter pills
  const filterCounts = useMemo(() => {
    if (!psdData) return { all: 0, groups: 0, text: 0, images: 0 };
    const flat = psdData.flatLayers;
    return {
      all: flat.length,
      groups: flat.filter((l) => l.isGroup).length,
      text: flat.filter((l) => l.type === 'text').length,
      images: flat.filter((l) => l.type === 'image' || l.type === 'vector').length,
    };
  }, [psdData]);

  // Filtered layer list based on search and category filter
  const isSearchActive = searchQuery.trim().length > 0;

  const matchesSearch = useCallback(
    (layer: DecodedLayer): boolean => {
      if (!isSearchActive) return true;
      const q = searchQuery.toLowerCase();
      const matchName = layer.name.toLowerCase().includes(q);
      const matchText = layer.textInfo?.text.toLowerCase().includes(q);
      const matchFont = layer.textInfo?.fontName?.toLowerCase().includes(q);
      return !!(matchName || matchText || matchFont);
    },
    [isSearchActive, searchQuery]
  );

  const matchesCategory = useCallback(
    (layer: DecodedLayer): boolean => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'groups') return !!layer.isGroup;
      if (activeFilter === 'text') return layer.type === 'text';
      if (activeFilter === 'images') return layer.type === 'image' || layer.type === 'vector';
      return true;
    },
    [activeFilter]
  );

  // Render tree row recursively
  const renderLayerRow = (layer: DecodedLayer, depth = 0) => {
    const isExpanded = !!expandedGroups[layer.id];
    const isHidden = hiddenLayerIds.has(layer.id);
    const isSolo = soloLayerId === layer.id;
    const isSelected = selectedLayerId === layer.id;

    // Filter check when search or category filter is active
    const selfMatches = matchesSearch(layer) && matchesCategory(layer);
    const childMatches =
      layer.children && layer.children.some((c) => matchesSearch(c) && matchesCategory(c));

    if (isSearchActive || activeFilter !== 'all') {
      if (!selfMatches && !childMatches) return null;
    }

    return (
      <div key={layer.id} className="space-y-0.5">
        <div
          onClick={() => setSelectedLayerId(isSelected ? null : layer.id)}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded text-xs transition-colors cursor-pointer select-none group relative ${
            isSelected
              ? 'bg-blue-600/30 border border-blue-500/50 text-blue-200 font-medium'
              : isSolo
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 font-medium'
              : isHidden
              ? 'text-gray-500 hover:bg-gray-800/40 opacity-50'
              : 'text-gray-200 hover:bg-gray-800/60'
          }`}
        >
          {/* Guide Line for Nested Hierarchy */}
          {depth > 0 && (
            <span
              style={{ left: `${(depth - 1) * 14 + 10}px` }}
              className="absolute top-0 bottom-0 w-px bg-gray-800/80"
            />
          )}

          <div className="flex items-center gap-1.5 truncate mr-2 min-w-0">
            {/* Eye Visibility Toggle */}
            <button
              onClick={(e) => toggleLayerVisibility(layer, e)}
              className="text-gray-400 hover:text-white p-0.5 shrink-0 transition-colors"
              title={isHidden ? 'Hidden (Click to Show)' : 'Visible (Click to Hide)'}
            >
              {isHidden ? (
                <EyeOff size={13} className="text-gray-500" />
              ) : (
                <Eye size={13} className="text-sky-400 group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Folder Toggle or Type Icon / Thumbnail Badge */}
            {layer.isGroup ? (
              <button
                onClick={(e) => toggleGroup(layer.id, e)}
                className="text-amber-400 hover:text-amber-300 shrink-0 p-0.5"
                title={isExpanded ? 'Collapse Folder' : 'Expand Folder'}
              >
                {isExpanded ? <FolderOpen size={13} /> : <Folder size={13} />}
              </button>
            ) : layer.thumbnailUrl ? (
              <div
                className="w-5 h-5 rounded-xs shrink-0 overflow-hidden bg-gray-800 border border-gray-700/80 flex items-center justify-center checkerboard-light shadow-2xs"
                title="Raster Layer Thumbnail"
              >
                <img
                  src={layer.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            ) : layer.type === 'text' ? (
              <div
                className="w-5 h-5 rounded-xs shrink-0 bg-purple-950/80 border border-purple-800/80 flex items-center justify-center text-purple-400"
                title="Text Layer"
              >
                <Type size={11} />
              </div>
            ) : layer.type === 'image' ? (
              <div
                className="w-5 h-5 rounded-xs shrink-0 bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400"
                title="Raster Layer"
              >
                <ImageIcon size={11} />
              </div>
            ) : (
              <div
                className="w-5 h-5 rounded-xs shrink-0 bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-300"
                title="Adjustment / Vector Layer"
              >
                <Sliders size={11} />
              </div>
            )}

            {/* Layer Name & Group Count Badge */}
            <span className="truncate text-[11px]" title={layer.name}>
              {layer.name}
            </span>

            {layer.isGroup && layer.childCount !== undefined && (
              <span className="text-[10px] text-gray-400 bg-gray-800/80 px-1 py-0.2 rounded shrink-0 font-mono">
                {layer.childCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Solo / Isolate Button */}
            <button
              onClick={(e) => toggleSolo(layer.id, e)}
              title={isSolo ? 'Exit Solo Mode' : 'Solo / Isolate Layer'}
              className={`p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 ${
                isSolo
                  ? 'opacity-100 bg-amber-500/30 text-amber-300'
                  : 'text-gray-400 hover:text-amber-300 hover:bg-gray-700/50'
              }`}
            >
              <Focus size={12} />
            </button>

            {/* Opacity & Blend Mode */}
            <span className="text-[10px] font-mono text-gray-400">{layer.opacity}%</span>
            {layer.blendMode && layer.blendMode !== 'NORMAL' && (
              <span className="px-1 py-0.2 bg-gray-700/60 rounded text-[9px] text-gray-300 font-mono uppercase">
                {layer.blendMode}
              </span>
            )}
          </div>
        </div>

        {/* Sub-layers */}
        {layer.isGroup && (isExpanded || isSearchActive) && layer.children && (
          <div className="space-y-0.5">
            {layer.children.map((child) => renderLayerRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const isCustomRenderingActive = hiddenLayerIds.size > 0 || !!soloLayerId;

  return (
    <div className="w-full h-full flex flex-col bg-[#121417] select-none overflow-hidden relative font-sans">
      {/* Top Extension Toolbar */}
      <div className="h-10 bg-[#191c22] border-b border-gray-800 flex items-center justify-between px-3 shrink-0 text-xs text-gray-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-sky-400">
            <Sparkles size={14} />
            <span>PSD Studio</span>
          </div>

          <div className="h-4 w-px bg-gray-700 mx-1 hidden sm:block" />

          {psdData && (
            <div className="hidden md:flex items-center gap-2 text-gray-400 font-mono text-[11px]">
              <span className="text-gray-200 font-semibold">
                {psdData.width} × {psdData.height}
              </span>
              <span>•</span>
              <span className="text-sky-300">{psdData.colorModeName}</span>
              <span>•</span>
              <span>{psdData.channels} Channels</span>
              <span>•</span>
              <span className="text-emerald-400">{psdData.layerCount} Layers</span>
              <span>•</span>
              <span>{formatHumanSize(fileSize)}</span>
            </div>
          )}

          {/* Active Mode Indicator */}
          {isCustomRenderingActive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/70 text-amber-300 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{soloLayerId ? 'Solo Mode Active' : 'Custom Layer Blend'}</span>
              <button
                onClick={resetAllVisibility}
                title="Reset All Layers"
                className="ml-1 text-amber-200 hover:text-white underline"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Viewport & Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Canvas Backdrop Selector */}
          <div className="hidden lg:flex items-center bg-gray-800/80 rounded p-0.5 border border-gray-700/60 text-[11px]">
            <button
              onClick={() => setBackdropMode('checker-light')}
              title="Photoshop Light Checkerboard"
              className={`px-2 py-0.5 rounded transition-colors ${
                backdropMode === 'checker-light'
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Light Grid
            </button>
            <button
              onClick={() => setBackdropMode('checker-dark')}
              title="Dark Checkerboard"
              className={`px-2 py-0.5 rounded transition-colors ${
                backdropMode === 'checker-dark'
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Dark Grid
            </button>
            <button
              onClick={() => setBackdropMode('white')}
              title="Solid White Canvas"
              className={`px-2 py-0.5 rounded transition-colors ${
                backdropMode === 'white'
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              White
            </button>
          </div>

          {/* Zoom Controls & Presets */}
          <div className="flex items-center bg-gray-800/80 rounded p-0.5 border border-gray-700/60">
            <button
              onClick={() => setZoom((z) => Math.max(0.1, Number((z - 0.2).toFixed(2))))}
              title="Zoom Out"
              className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
            >
              <ZoomOut size={13} />
            </button>
            <span className="px-2 font-mono text-[11px] min-w-[42px] text-center text-gray-200">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(6, Number((z + 0.2).toFixed(2))))}
              title="Zoom In"
              className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={fitToScreen}
              title="Fit to Viewport"
              className="px-2 py-0.5 hover:bg-gray-700 rounded text-[11px] text-gray-300 hover:text-white border-l border-gray-700 flex items-center gap-1"
            >
              <Maximize2 size={11} />
              <span>Fit</span>
            </button>
            <button
              onClick={() => {
                setZoom(0.5);
                setPan({ x: 0, y: 0 });
              }}
              title="50% Half Size"
              className="px-1.5 py-0.5 hover:bg-gray-700 rounded text-[11px] text-gray-300 hover:text-white border-l border-gray-700"
            >
              50%
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="100% Actual Pixels"
              className="px-1.5 py-0.5 hover:bg-gray-700 rounded text-[11px] text-gray-300 hover:text-white border-l border-gray-700"
            >
              100%
            </button>
            <button
              onClick={() => {
                setZoom(2);
                setPan({ x: 0, y: 0 });
              }}
              title="200% Zoom"
              className="px-1.5 py-0.5 hover:bg-gray-700 rounded text-[11px] text-gray-300 hover:text-white border-l border-gray-700"
            >
              200%
            </button>
          </div>

          {/* Toggle Layer Panel */}
          <button
            onClick={() => setShowLayers(!showLayers)}
            title="Toggle Layer Inspector"
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors text-xs ${
              showLayers
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Layers size={13} />
            <span className="hidden sm:inline">
              Layers {psdData ? `(${psdData.layerCount})` : ''}
            </span>
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            disabled={!psdData}
            title="Export Current Artwork as PNG"
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-medium shadow-sm transition-all"
          >
            {copiedExport ? <Check size={13} /> : <Download size={13} />}
            <span className="hidden sm:inline">{copiedExport ? 'Exported!' : 'Export PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Area (Canvas + Smart Layers Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Interactive Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 overflow-hidden flex items-center justify-center p-4 bg-[#111317] relative select-none ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-gray-300">
              <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">{loadingMessage}</span>
            </div>
          ) : error ? (
            <div className="p-5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs text-center max-w-md">
              <p className="font-semibold text-sm mb-1 text-red-300">Failed to Parse Photoshop File</p>
              <p className="text-red-400 font-mono text-[11px] mb-3">{error}</p>
              <div className="text-[11px] text-gray-400 bg-black/40 p-2 rounded text-left font-mono">
                Hint: Ensure the file is a valid .psd or .psb file.
              </div>
            </div>
          ) : (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.08s ease-out',
              }}
              className={`relative shadow-[0_25px_60px_rgba(0,0,0,0.7)] ring-1 ring-white/10 rounded-xs overflow-hidden flex items-center justify-center ${
                backdropMode === 'checker-light'
                  ? 'checkerboard-light'
                  : backdropMode === 'checker-dark'
                  ? 'checkerboard-dark'
                  : backdropMode === 'white'
                  ? 'bg-white'
                  : 'bg-black'
              }`}
            >
              <canvas
                ref={canvasRef}
                className="max-w-none block"
                style={{ imageRendering: zoom > 2 ? 'pixelated' : 'auto' }}
              />
            </div>
          )}

          {/* Floating Selected Layer Quick Details */}
          {selectedLayer && (
            <div className="absolute bottom-4 left-4 max-w-md bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-lg p-3 text-xs text-gray-200 shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-3 border-b border-gray-800 pb-1.5">
                <div className="flex items-center gap-1.5 truncate">
                  {selectedLayer.type === 'text' ? (
                    <Type size={13} className="text-purple-400 shrink-0" />
                  ) : selectedLayer.isGroup ? (
                    <Folder size={13} className="text-amber-400 shrink-0" />
                  ) : (
                    <ImageIcon size={13} className="text-emerald-400 shrink-0" />
                  )}
                  <span className="font-semibold text-white truncate">{selectedLayer.name}</span>
                </div>
                <button
                  onClick={() => setSelectedLayerId(null)}
                  className="text-gray-400 hover:text-white p-0.5 rounded text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Text Layer Typography Inspector */}
              {selectedLayer.textInfo && (
                <div className="space-y-1.5 bg-gray-950/60 p-2 rounded border border-gray-800 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Typography:</span>
                    <button
                      onClick={() => copyTextContent(selectedLayer.textInfo?.text || '')}
                      className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-sans"
                    >
                      {copiedText ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>
                  <div className="text-white font-sans text-xs bg-gray-900/90 p-1.5 rounded border border-gray-700/40 select-text">
                    "{selectedLayer.textInfo.text}"
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-gray-300 pt-1">
                    {selectedLayer.textInfo.fontName && (
                      <span className="px-1.5 py-0.5 bg-gray-800 rounded">
                        Font: {selectedLayer.textInfo.fontName}
                      </span>
                    )}
                    {selectedLayer.textInfo.fontSize && (
                      <span className="px-1.5 py-0.5 bg-gray-800 rounded">
                        Size: {selectedLayer.textInfo.fontSize}px
                      </span>
                    )}
                    {selectedLayer.textInfo.colorHex && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-800 rounded">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block"
                          style={{ backgroundColor: selectedLayer.textInfo.colorHex }}
                        />
                        {selectedLayer.textInfo.colorHex}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Position & Size Details */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                {selectedLayer.width !== undefined && selectedLayer.height !== undefined && (
                  <span>
                    Size: {selectedLayer.width} × {selectedLayer.height} px
                  </span>
                )}
                {selectedLayer.left !== undefined && selectedLayer.top !== undefined && (
                  <span>
                    Pos: ({selectedLayer.left}, {selectedLayer.top})
                  </span>
                )}
                <span>Opacity: {selectedLayer.opacity}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Smart Organized Layers Drawer */}
        {showLayers && psdData && (
          <div className="w-80 bg-[#16181e] border-l border-gray-800 flex flex-col shrink-0 text-xs shadow-2xl">
            {/* Header & Quick Action Bar */}
            <div className="p-2.5 border-b border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-gray-300 font-medium">
                <div className="flex items-center gap-1.5">
                  <Layers size={14} className="text-sky-400" />
                  <span>Layers & Groups ({psdData.layerCount})</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={expandAll}
                    title="Expand All Groups"
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronsDown size={13} />
                  </button>
                  <button
                    onClick={collapseAll}
                    title="Collapse All Groups"
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronsUp size={13} />
                  </button>
                  {isCustomRenderingActive && (
                    <button
                      onClick={resetAllVisibility}
                      title="Reset All Layers to Visible"
                      className="p-1 hover:bg-gray-800 rounded text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={12} className="absolute left-2 top-2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search layers or text content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-700/60 rounded px-2.5 pl-6 py-1 text-[11px] text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap font-medium ${
                    activeFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  All ({filterCounts.all})
                </button>
                <button
                  onClick={() => setActiveFilter('groups')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap font-medium ${
                    activeFilter === 'groups'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Folders ({filterCounts.groups})
                </button>
                <button
                  onClick={() => setActiveFilter('text')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap font-medium ${
                    activeFilter === 'text'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Text ({filterCounts.text})
                </button>
                <button
                  onClick={() => setActiveFilter('images')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap font-medium ${
                    activeFilter === 'images'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Graphics ({filterCounts.images})
                </button>
              </div>
            </div>

            {/* Layer Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {psdData.layers.length > 0 ? (
                psdData.layers.map((l) => renderLayerRow(l, 0))
              ) : (
                <div className="text-center text-gray-500 py-6 text-[11px]">
                  Flat PSD (Single Merged Layer)
                </div>
              )}
            </div>

            {/* Bottom Status Footer */}
            <div className="p-2.5 border-t border-gray-800 bg-[#121418] text-[11px] text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Compositing Mode:</span>
                <span className="font-mono text-sky-400 font-medium">
                  {soloLayerId
                    ? 'Isolated Layer'
                    : hiddenLayerIds.size > 0
                    ? 'Dynamic Blend Stack'
                    : 'Adobe Flattened Composite'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Color Engine:</span>
                <span className="text-gray-300 font-mono">
                  {psdData.colorModeName} ({psdData.depth}-bit)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
