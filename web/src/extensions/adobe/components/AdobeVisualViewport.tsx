import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Maximize2,
  Sparkles,
  Image as ImageIcon,
  Layers,
  Check,
  Copy,
  Type,
  Pipette,
} from 'lucide-react';
import { DecodedLayer } from '../../psd/psdDecoder';

export type BackdropStyle = 'checker-light' | 'checker-dark' | 'solid-dark' | 'solid-white';

interface AdobeVisualViewportProps {
  canvas?: HTMLCanvasElement | null;
  imageUrl?: string | null;
  pdfUrl?: string | null;
  backdrop?: BackdropStyle;
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetZoom: () => void;
  fileName: string;
  onSwitchToInspector?: () => void;
  // Smart Tools
  isEyedropperActive?: boolean;
  onColorPicked?: (hex: string) => void;
  layers?: DecodedLayer[];
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string | null) => void;
}

export const AdobeVisualViewport: React.FC<AdobeVisualViewportProps> = ({
  canvas,
  imageUrl,
  pdfUrl,
  backdrop = 'checker-dark',
  zoom,
  onZoomChange,
  onResetZoom,
  fileName,
  onSwitchToInspector,
  isEyedropperActive = false,
  onColorPicked,
  layers = [],
  selectedLayerId,
  onSelectLayer,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [dragDist, setDragDist] = useState(0);

  // Eyedropper & Color Loupe state
  const [loupe, setLoupe] = useState<{
    hex: string;
    r: number;
    g: number;
    b: number;
    c: number;
    m: number;
    y: number;
    k: number;
    screenX: number;
    screenY: number;
  } | null>(null);
  const [copiedLoupeToast, setCopiedLoupeToast] = useState(false);
  const [copiedTextToast, setCopiedTextToast] = useState(false);

  // Selected layer reference
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  // When canvas element changes, mount it cleanly
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !canvas) return;

    host.innerHTML = '';
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    host.appendChild(canvas);

    return () => {
      if (host.contains(canvas)) {
        host.removeChild(canvas);
      }
    };
  }, [canvas]);

  // Center pan on file change
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [fileName, canvas, imageUrl, pdfUrl]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (pdfUrl) return;
    if (isEyedropperActive) return; // Prevent panning while sampling colors

    setIsPanning(true);
    setDragDist(0);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Color Loupe Tracking (when eyedropper is active)
    if (isEyedropperActive && canvas) {
      const rect = canvas.getBoundingClientRect();
      const inCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (inCanvas) {
        const cx = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
        const cy = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
        try {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const pixel = ctx.getImageData(cx, cy, 1, 1).data;
            const r = pixel[0];
            const g = pixel[1];
            const b = pixel[2];
            const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();

            // Calculate CMYK
            const r_ = r / 255;
            const g_ = g / 255;
            const b_ = b / 255;
            const k = 1 - Math.max(r_, g_, b_);
            const c = k === 1 ? 0 : Math.round(((1 - r_ - k) / (1 - k)) * 100);
            const m = k === 1 ? 0 : Math.round(((1 - g_ - k) / (1 - k)) * 100);
            const y = k === 1 ? 0 : Math.round(((1 - b_ - k) / (1 - k)) * 100);
            const kPct = Math.round(k * 100);

            setLoupe({
              hex,
              r,
              g,
              b,
              c,
              m,
              y,
              k: kPct,
              screenX: e.clientX,
              screenY: e.clientY,
            });
          }
        } catch {
          // ignore context read errors
        }
      } else {
        setLoupe(null);
      }
      return;
    }

    // 2. Viewport Panning
    if (!isPanning) return;
    const dx = e.clientX - startPan.x - pan.x;
    const dy = e.clientY - startPan.y - pan.y;
    setDragDist((d) => d + Math.abs(dx) + Math.abs(dy));
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);

    // If eyedropper is active: sample & copy color
    if (isEyedropperActive && loupe) {
      navigator.clipboard.writeText(loupe.hex).catch(() => {});
      if (onColorPicked) onColorPicked(loupe.hex);
      setCopiedLoupeToast(true);
      setTimeout(() => setCopiedLoupeToast(false), 2000);
      return;
    }

    // Hit-testing for Photoshop layer selection (only on discrete click without pan)
    if (dragDist < 6 && canvas && layers.length > 0 && onSelectLayer) {
      const rect = canvas.getBoundingClientRect();
      const inCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (inCanvas) {
        const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

        // Traverse layers in reverse (topmost drawn layer first)
        let hitLayerId: string | null = null;
        for (let i = layers.length - 1; i >= 0; i--) {
          const l = layers[i];
          if (!l.visible || l.isGroup) continue;
          const left = l.left ?? 0;
          const top = l.top ?? 0;
          const width = l.width ?? 0;
          const height = l.height ?? 0;

          if (clickX >= left && clickX <= left + width && clickY >= top && clickY <= top + height) {
            hitLayerId = l.id;
            break;
          }
        }
        onSelectLayer(hitLayerId);
      }
    }
  };

  // Wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (pdfUrl) return;
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.05), 25);
      onZoomChange(newZoom);
    },
    [zoom, onZoomChange, pdfUrl]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Background style classes
  const getBackdropClass = () => {
    switch (backdrop) {
      case 'checker-light':
        return 'bg-[#e5e5e5] bg-[radial-gradient(#cbcbcb_1px,transparent_1px)] [background-size:16px_16px]';
      case 'solid-white':
        return 'bg-[#ffffff]';
      case 'solid-dark':
        return 'bg-[#0a0a0c]';
      case 'checker-dark':
      default:
        return 'bg-[#181818] bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:16px_16px]';
    }
  };

  // Native PDF fallback if neither canvas nor raster is present
  if (pdfUrl && !canvas && !imageUrl) {
    return (
      <div className="w-full h-full relative bg-neutral-900 flex flex-col items-center justify-center p-2">
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full h-full rounded-xl border border-neutral-800 shadow-2xl bg-neutral-950"
          title={fileName}
        >
          {imageUrl ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-neutral-400">
              <img
                src={imageUrl}
                alt={fileName}
                className="max-h-[80%] max-w-[80%] object-contain rounded-lg shadow-lg mb-3"
              />
              <p className="text-xs">Illustrator embedded raster preview</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
              <Sparkles size={32} className="text-amber-500" />
              <p className="text-sm font-semibold text-neutral-200">
                Adobe Illustrator Vector Stream Loaded
              </p>
              <p className="text-xs text-neutral-400">
                Click download or open in a new tab to inspect full artboards.
              </p>
            </div>
          )}
        </object>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsPanning(false);
        setLoupe(null);
      }}
      className={`w-full h-full relative overflow-hidden flex items-center justify-center select-none ${
        isEyedropperActive
          ? 'cursor-crosshair'
          : isPanning
          ? 'cursor-grabbing'
          : 'cursor-grab'
      } ${getBackdropClass()}`}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.05s ease-out',
        }}
        className="flex items-center justify-center relative shadow-2xl rounded-xs"
      >
        {/* Render Canvas */}
        {canvas && <div ref={canvasHostRef} className="select-none pointer-events-none" />}

        {/* Raster Image Fallback */}
        {!canvas && imageUrl && (
          <img
            src={imageUrl}
            alt={fileName}
            draggable={false}
            className="max-w-none select-none rounded-xs shadow-2xl"
          />
        )}

        {/* Selected Layer Bounding Box Overlay */}
        {canvas && selectedLayer && selectedLayer.left !== undefined && selectedLayer.top !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: `${selectedLayer.left}px`,
              top: `${selectedLayer.top}px`,
              width: `${selectedLayer.width ?? 0}px`,
              height: `${selectedLayer.height ?? 0}px`,
            }}
            className="border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-20 rounded-xs shadow-md animate-in fade-in duration-150"
          >
            {/* Top Bounding Pill */}
            <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1.5 whitespace-nowrap">
              <span>{selectedLayer.name}</span>
              <span className="text-blue-200">
                ({selectedLayer.width} × {selectedLayer.height})
              </span>
            </div>
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-600 shadow-xs" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-600 shadow-xs" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-600 shadow-xs" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-600 shadow-xs" />
          </div>
        )}

        {/* Empty State */}
        {!canvas && !imageUrl && (
          <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center max-w-sm flex flex-col items-center shadow-xl">
            <ImageIcon size={36} className="mx-auto text-neutral-500 mb-2" />
            <h4 className="text-xs font-semibold text-neutral-200">No Visual Stream</h4>
            <p className="text-[11px] text-neutral-400 mt-1 mb-3">
              Switch to Project Inspector to browse timeline, markers, and media assets.
            </p>
            {onSwitchToInspector && (
              <button
                onClick={onSwitchToInspector}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
              >
                <Layers size={13} />
                Open Project Inspector
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Selected Text Typography Banner */}
      {selectedLayer?.textInfo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/90 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2">
            <Type size={14} className="text-blue-400 shrink-0" />
            <span className="font-semibold text-white">{selectedLayer.textInfo.fontName || 'Text Layer'}</span>
            {selectedLayer.textInfo.fontSize && (
              <span className="text-neutral-400 font-mono text-[11px] bg-neutral-800 px-1.5 py-0.5 rounded">
                {selectedLayer.textInfo.fontSize} pt
              </span>
            )}
            {selectedLayer.textInfo.colorHex && (
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                style={{ backgroundColor: selectedLayer.textInfo.colorHex }}
                title={selectedLayer.textInfo.colorHex}
              />
            )}
          </div>

          <button
            onClick={() => {
              if (selectedLayer.textInfo?.text) {
                navigator.clipboard.writeText(selectedLayer.textInfo.text).catch(() => {});
                setCopiedTextToast(true);
                setTimeout(() => setCopiedTextToast(false), 2000);
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors cursor-pointer shadow-xs"
            title="Copy layer string to clipboard"
          >
            {copiedTextToast ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedTextToast ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
      )}

      {/* Floating Color Eyedropper Loupe HUD */}
      {isEyedropperActive && loupe && (
        <div
          style={{
            position: 'fixed',
            left: `${loupe.screenX + 16}px`,
            top: `${loupe.screenY + 16}px`,
          }}
          className="pointer-events-none z-50 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/90 p-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs animate-in fade-in duration-100"
        >
          {/* Swatch */}
          <div
            className="w-8 h-8 rounded-lg border border-white/20 shadow-inner shrink-0"
            style={{ backgroundColor: loupe.hex }}
          />

          {/* Color Values */}
          <div className="space-y-0.5 font-mono text-[11px]">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>{loupe.hex}</span>
              {copiedLoupeToast && <span className="text-[10px] text-emerald-400 font-sans font-medium">Copied!</span>}
            </div>
            <div className="text-neutral-400 text-[10px]">
              RGB: {loupe.r}, {loupe.g}, {loupe.b}
            </div>
            <div className="text-neutral-500 text-[9px]">
              CMYK: {loupe.c}%, {loupe.m}%, {loupe.y}%, {loupe.k}%
            </div>
          </div>
        </div>
      )}

      {/* Center View Floating Pill */}
      {(pan.x !== 0 || pan.y !== 0 || zoom !== 1) && (
        <button
          onClick={() => {
            setPan({ x: 0, y: 0 });
            onResetZoom();
          }}
          className="absolute bottom-4 left-4 z-10 px-2.5 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-[11px] text-neutral-300 backdrop-blur-md shadow-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Reset position & zoom"
        >
          <Maximize2 size={12} />
          <span>Center View</span>
        </button>
      )}

      {/* Eyedropper Active Banner */}
      {isEyedropperActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-blue-600/90 text-white text-xs font-medium backdrop-blur-md shadow-lg flex items-center gap-1.5 pointer-events-none">
          <Pipette size={13} />
          <span>Click anywhere to sample & copy color</span>
        </div>
      )}
    </div>
  );
};
