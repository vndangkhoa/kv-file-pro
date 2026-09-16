import React, { useEffect, useState, useRef } from 'react';
import { PreviewExtensionProps } from '../../types';
import { decodeCdrFile, DecodedCdrResult } from './cdrDecoder';
import { formatHumanSize } from '../../utils/format';
import {
  Loader2,
  Download,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  Palette,
  Layers,
  Sparkles,
  Grid,
  Copy,
  Check,
} from 'lucide-react';

export type BackdropStyle = 'checker-dark' | 'checker-light' | 'dark' | 'light';

export const CorelDrawViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
  extension,
  onDownload,
}) => {
  const ext = (extension || fileName.split('.').pop() || 'cdr').toLowerCase().replace(/^\./, '');
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Fetching CorelDRAW file stream...');
  const [cdrData, setCdrData] = useState<DecodedCdrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // UI state
  const [backdrop, setBackdrop] = useState<BackdropStyle>('checker-dark');
  const [showInfo, setShowInfo] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      try {
        setLoading(true);
        setError(null);
        setStatusMessage('Downloading CorelDRAW vector stream...');

        const res = await fetch(fileUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load file`);

        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        setStatusMessage('Unpacking container & extracting raster artwork...');
        const result = await decodeCdrFile(buffer);
        if (cancelled) return;

        setCdrData(result);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to decode CorelDRAW file');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDocument();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Pan handlers
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

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.15), 8));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCopyPreview = async () => {
    if (!cdrData?.previewUrl) return;
    try {
      const res = await fetch(cdrData.previewUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob }),
      ]);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getBackdropClass = () => {
    switch (backdrop) {
      case 'checker-dark':
        return 'bg-[#121214] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]';
      case 'checker-light':
        return 'bg-[#f4f4f5] bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:16px_16px]';
      case 'light':
        return 'bg-white';
      case 'dark':
      default:
        return 'bg-[#09090b]';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#141416] text-zinc-400 gap-3">
        <Loader2 size={26} className="animate-spin text-emerald-500" />
        <span className="text-xs font-mono">{statusMessage}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#141416] text-zinc-300 text-center">
        <AlertCircle size={36} className="text-red-400 mb-3" />
        <h3 className="text-sm font-semibold text-white mb-1">CorelDRAW Parse Error</h3>
        <p className="text-xs text-zinc-400 max-w-md mb-4">{error}</p>
        {onDownload && (
          <button
            onClick={onDownload}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Download Raw File ({formatHumanSize(fileSize)})</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#121214] text-white select-none overflow-hidden font-sans">
      {/* 1. Header Toolbar */}
      <div className="h-11 px-3 border-b border-zinc-800/80 bg-[#18181b] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {ext}
          </span>
          <span className="text-xs font-semibold text-zinc-200 truncate" title={fileName}>
            {cdrData?.title && cdrData.title !== 'CorelDRAW Vector Graphic' ? cdrData.title : fileName}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
            ({formatHumanSize(fileSize)})
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center bg-zinc-900/80 rounded-lg border border-zinc-800/80 px-1 py-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.15, z - 0.2))}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono w-11 text-center text-zinc-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(8, z + 0.2))}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors ml-0.5"
              title="Fit / Reset 100%"
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Backdrop style switcher */}
          <button
            onClick={() => {
              const styles: BackdropStyle[] = ['checker-dark', 'checker-light', 'dark', 'light'];
              const next = styles[(styles.indexOf(backdrop) + 1) % styles.length];
              setBackdrop(next);
            }}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors ml-1"
            title={`Backdrop: ${backdrop}`}
          >
            <Grid size={14} />
          </button>

          {/* Copy Preview to Clipboard */}
          {cdrData?.previewUrl && (
            <button
              onClick={handleCopyPreview}
              className={`p-1.5 rounded transition-colors ${
                copiedToast ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Copy Preview to Clipboard"
            >
              {copiedToast ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          )}

          {/* Info Drawer Toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded transition-colors ${
              showInfo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle CorelDRAW Telemetry Drawer"
          >
            <Info size={14} />
          </button>

          {/* Download Original File */}
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-1.5 hover:bg-zinc-800 rounded text-emerald-400 hover:text-emerald-300 transition-colors ml-0.5"
              title="Download Original CorelDRAW File"
            >
              <Download size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Artboard Stage */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${getBackdropClass()}`}
      >
        {cdrData?.previewUrl ? (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            }}
            className="flex items-center justify-center select-none"
          >
            <img
              src={cdrData.previewUrl}
              alt={fileName}
              draggable={false}
              className="max-w-none shadow-2xl rounded border border-zinc-800/80 bg-white"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-center max-w-md bg-zinc-900/70 backdrop-blur-md rounded-2xl border border-zinc-800">
            <AlertCircle size={40} className="text-amber-400" />
            <h4 className="text-sm font-semibold text-white">CorelDRAW Document Loaded</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This CDR file does not have an embedded raster preview stream saved inside its container.
              You can inspect the document properties, version, and page metadata in the side drawer.
            </p>
            <button
              onClick={() => setShowInfo(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-colors mt-1"
            >
              <Info size={13} className="text-emerald-400" />
              <span>Inspect Telemetry</span>
            </button>
          </div>
        )}

        {/* Floating Telemetry Badge */}
        {cdrData && (
          <div className="absolute bottom-3 left-3 bg-zinc-900/85 backdrop-blur-md border border-zinc-800/80 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-zinc-400 flex items-center gap-3 shadow-lg pointer-events-none">
            <div className="flex items-center gap-1 text-emerald-400">
              <Palette size={12} />
              <span className="font-semibold">{cdrData.version}</span>
            </div>
            {cdrData.pageCount > 1 && (
              <div className="flex items-center gap-1 text-zinc-300">
                <Layers size={12} />
                <span>{cdrData.pageCount} Pages</span>
              </div>
            )}
            {cdrData.width && cdrData.height && (
              <span className="text-zinc-400">{cdrData.width} × {cdrData.height}</span>
            )}
          </div>
        )}

        {/* 3. Slide-out Telemetry Inspector Drawer */}
        {showInfo && cdrData && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 p-4 overflow-y-auto z-20 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  CorelDRAW Telemetry
                </h3>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Application</span>
                <p className="font-semibold text-white">{cdrData.version}</p>
                {cdrData.creator && cdrData.creator !== 'Unknown' && (
                  <p className="text-[11px] text-zinc-400">Created by: {cdrData.creator}</p>
                )}
              </div>

              {Object.entries(cdrData.metadata).map(([key, value]) => (
                <div key={key} className="flex flex-col py-1.5 border-b border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">{key}</span>
                  <span className="text-[11px] font-mono text-zinc-200 mt-0.5 break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
