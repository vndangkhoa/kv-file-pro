import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Grid,
  Layers,
  Box,
  Clock,
  Film,
} from 'lucide-react';
import { AeComposition } from '../decoders/aepDecoder';

interface AeCompositionStageProps {
  compositions: AeComposition[];
  fileName?: string;
  zoom?: number;
  onZoomChange?: (z: number) => void;
  onResetZoom?: () => void;
  onSwitchToInspector?: () => void;
}

function formatTimecode(frame: number, fps: number): string {
  const safeFps = Math.max(1, fps);
  const totalSeconds = Math.floor(frame / safeFps);
  const ff = Math.floor(frame % safeFps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

export const AeCompositionStage: React.FC<AeCompositionStageProps> = ({
  compositions,
  onSwitchToInspector,
}) => {
  const [activeCompIdx, setActiveCompIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showSafeGuides, setShowSafeGuides] = useState(true);
  const [isLooping, setIsLooping] = useState(true);

  const comp = compositions[activeCompIdx] || compositions[0];
  const fps = comp?.frameRate || 30;
  const durationSec = comp?.durationSec || 10;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));

  // Reset playhead on comp change
  useEffect(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
  }, [activeCompIdx]);

  // Animation playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 1000 / fps;
    const timer = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= totalFrames - 1) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, fps, totalFrames, isLooping]);

  // Spacebar toggle playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStep = useCallback((delta: number) => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.max(0, Math.min(totalFrames - 1, prev + delta)));
  }, [totalFrames]);

  const compWidth = comp?.width || 1920;
  const compHeight = comp?.height || 1080;
  const aspectRatio = compWidth / compHeight;

  // Normalized motion progress for animated preview elements
  const cycle = (currentFrame / (fps * 2)) % 1; // 2-second cycle
  const pulseScale = 1 + Math.sin(cycle * Math.PI * 2) * 0.04;
  const rotationDeg = Math.round(cycle * 360);

  return (
    <div className="w-full h-full flex flex-col bg-[#0e0e11] text-neutral-200 select-none overflow-hidden relative">
      {/* 1. Sub-bar: Comp Selector & Stage Specs */}
      <div className="h-10 bg-neutral-900/80 border-b border-neutral-800/80 px-4 flex items-center justify-between text-xs shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {compositions.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-medium">Composition:</span>
              <select
                value={activeCompIdx}
                onChange={(e) => setActiveCompIdx(parseInt(e.target.value, 10))}
                className="bg-neutral-950 border border-neutral-700 rounded-md px-2 py-0.5 text-xs text-white focus:outline-hidden focus:border-purple-500"
              >
                {compositions.map((c, i) => (
                  <option key={c.id || i} value={i}>
                    {c.name} ({c.width}x{c.height})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Layers size={13} />
              </span>
              <span className="font-semibold text-white">{comp?.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-neutral-400 text-[11px] font-mono border-l border-neutral-800 pl-3">
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-semibold">
              {compWidth} × {compHeight}
            </span>
            <span>{fps} fps</span>
            <span>•</span>
            <span>{comp?.layerCount || 0} Layers</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSafeGuides((g) => !g)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border ${
              showSafeGuides
                ? 'bg-purple-950/60 text-purple-300 border-purple-700/60'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
            }`}
            title="Toggle Action Safe & Title Safe Guides"
          >
            <Grid size={12} />
            <span className="hidden sm:inline">Safe Guides</span>
          </button>

          {onSwitchToInspector && (
            <button
              onClick={onSwitchToInspector}
              className="px-2 py-1 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors border border-neutral-700 flex items-center gap-1"
              title="Open Project Graph"
            >
              <Film size={12} />
              <span className="hidden sm:inline">Inspect Layers</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Motion Canvas Viewport Stage */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden relative bg-[#121215] bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:20px_20px]">
        {/* Composition Frame Outer Container */}
        <div
          style={{
            aspectRatio: `${aspectRatio}`,
            maxHeight: '100%',
            maxWidth: '100%',
          }}
          className="relative w-full h-full max-w-4xl max-h-[82vh] rounded-lg border border-neutral-700/80 shadow-2xl overflow-hidden bg-neutral-950 flex flex-col justify-between"
        >
          {/* Checkerboard Backdrop (Simulating After Effects Alpha Transparency) */}
          <div className="absolute inset-0 bg-[#16161a] bg-[radial-gradient(#222228_1px,transparent_1px)] [background-size:12px_12px] opacity-80" />

          {/* Simulated Composition Motion Canvas Layer Stack */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
            {/* Background Ambient Glow */}
            <div
              className="absolute w-72 h-72 rounded-full blur-3xl opacity-30 transition-all duration-300"
              style={{
                background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(59,130,246,0.2) 60%, transparent 80%)',
                transform: `scale(${pulseScale})`,
              }}
            />

            {/* Rendered Motion Graphics Simulation */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 space-y-4">
              {/* Animated Geometry Emblem */}
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-purple-500/50 bg-neutral-900/80 shadow-xl flex items-center justify-center relative backdrop-blur-xs transition-transform ease-out"
                style={{
                  transform: `scale(${pulseScale}) rotate(${isPlaying ? rotationDeg * 0.2 : 0}deg)`,
                }}
              >
                <div className="w-16 h-16 rounded-xl border border-blue-500/40 bg-purple-950/40 flex items-center justify-center">
                  <Box size={28} className="text-purple-400 animate-pulse" />
                </div>
                {/* 3D Indicator */}
                <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-600 text-white shadow-xs">
                  3D
                </div>
              </div>

              {/* Composition Title & Dynamic Layer Info */}
              <div className="space-y-1 max-w-md">
                <h3 className="font-bold text-base sm:text-lg text-white tracking-wide drop-shadow-md">
                  {comp?.name}
                </h3>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Motion Graphics Composition • {comp?.layerCount || 0} Animated Layers
                </p>
              </div>

              {/* Composition Layer Badges */}
              {comp?.layers && comp.layers.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-md">
                  {comp.layers.slice(0, 5).map((layer) => (
                    <span
                      key={layer.id}
                      className="px-2 py-0.5 rounded-md bg-neutral-900/90 border border-neutral-700/80 text-[10px] text-neutral-300 font-mono shadow-xs"
                    >
                      {layer.name}
                      {layer.is3D && <span className="ml-1 text-purple-400">3D</span>}
                    </span>
                  ))}
                  {comp.layers.length > 5 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-neutral-500 font-mono">
                      +{comp.layers.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title-Safe & Action-Safe Guides Overlay (Broadcast 80% & 90% Standards) */}
          {showSafeGuides && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Action Safe (90%) */}
              <div className="absolute inset-[5%] border border-cyan-500/20 border-dashed rounded-xs">
                <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-400/40 uppercase tracking-widest">
                  Action Safe 90%
                </span>
              </div>
              {/* Title Safe (80%) */}
              <div className="absolute inset-[10%] border border-amber-500/25 rounded-xs">
                <span className="absolute top-1 left-1.5 text-[8px] font-mono text-amber-400/50 uppercase tracking-widest">
                  Title Safe 80%
                </span>
              </div>
              {/* Center Crosshairs */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                <div className="w-full h-px bg-cyan-500/30" />
                <div className="h-full w-px bg-cyan-500/30 absolute" />
              </div>
            </div>
          )}

          {/* Top-Right Resolution & Spec Watermark */}
          <div className="absolute top-3 right-3 z-30 pointer-events-none bg-neutral-950/70 backdrop-blur-md px-2 py-1 rounded border border-neutral-800/80 text-[10px] font-mono text-neutral-400">
            {compWidth} × {compHeight} • {fps} FPS
          </div>
        </div>
      </div>

      {/* 3. Bottom Transport & Scrubbable Timeline Player Bar */}
      <div className="h-14 bg-neutral-900/95 border-t border-neutral-800 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20 backdrop-blur-md">
        {/* Left: Play/Pause, Step Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleStep(-1)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Step backward 1 frame"
          >
            <SkipBack size={15} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
            title={isPlaying ? 'Pause (Spacebar)' : 'Play (Spacebar)'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
          </button>

          <button
            onClick={() => handleStep(1)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Step forward 1 frame"
          >
            <SkipForward size={15} />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLooping
                ? 'text-purple-400 bg-purple-950/40 border border-purple-800/50'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title={isLooping ? 'Looping enabled' : 'Looping disabled'}
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* Center: Scrubber Track & Current Timecode */}
        <div className="flex-1 flex items-center gap-3 max-w-2xl">
          {/* Timecode Readout */}
          <div className="flex items-center gap-1 font-mono text-xs font-semibold text-purple-300 shrink-0 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 shadow-inner">
            <Clock size={12} className="text-purple-400" />
            <span>{formatTimecode(currentFrame, fps)}</span>
            <span className="text-neutral-600 font-normal">/</span>
            <span className="text-neutral-500 font-normal">{formatTimecode(totalFrames, fps)}</span>
          </div>

          {/* Interactive Range Scrubber */}
          <div className="flex-1 flex items-center relative group">
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={currentFrame}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentFrame(parseInt(e.target.value, 10));
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-hidden"
            />
          </div>

          {/* Frame Counter Pill */}
          <div className="hidden sm:block text-[11px] font-mono text-neutral-400 shrink-0">
            <span className="text-white font-medium">{currentFrame + 1}</span>
            <span className="text-neutral-600"> / </span>
            <span>{totalFrames} f</span>
          </div>
        </div>

        {/* Right: Quick Specs */}
        <div className="hidden md:flex items-center gap-2 shrink-0 text-xs text-neutral-400 font-mono">
          <span className="px-2 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 text-[11px]">
            {durationSec}s duration
          </span>
        </div>
      </div>
    </div>
  );
};
