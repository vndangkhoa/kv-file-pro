import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Info,
  Layers,
  Sparkles,
  Film,
  Pipette,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { BackdropStyle } from './AdobeVisualViewport';

export type AdobeAppType = 'ps' | 'ai' | 'eps' | 'id' | 'xd' | 'pr' | 'ae' | 'lr' | 'adobe';

export interface AdobeAppBadgeInfo {
  tag: string;
  name: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const ADOBE_APP_BADGES: Record<AdobeAppType, AdobeAppBadgeInfo> = {
  ps: { tag: 'Ps', name: 'Photoshop', bgColor: 'bg-[#001E36]', textColor: 'text-[#31A8FF]', borderColor: 'border-[#31A8FF]/40' },
  ai: { tag: 'Ai', name: 'Illustrator', bgColor: 'bg-[#330000]', textColor: 'text-[#FF9A00]', borderColor: 'border-[#FF9A00]/40' },
  eps: { tag: 'Eps', name: 'Vector PostScript', bgColor: 'bg-[#2E1A00]', textColor: 'text-[#F59E0B]', borderColor: 'border-[#F59E0B]/40' },
  id: { tag: 'Id', name: 'InDesign', bgColor: 'bg-[#2B0014]', textColor: 'text-[#FF3366]', borderColor: 'border-[#FF3366]/40' },
  xd: { tag: 'Xd', name: 'Adobe XD', bgColor: 'bg-[#2E001F]', textColor: 'text-[#FF61F6]', borderColor: 'border-[#FF61F6]/40' },
  pr: { tag: 'Pr', name: 'Premiere Pro', bgColor: 'bg-[#00005B]', textColor: 'text-[#9999FF]', borderColor: 'border-[#9999FF]/40' },
  ae: { tag: 'Ae', name: 'After Effects', bgColor: 'bg-[#00005B]', textColor: 'text-[#9999FF]', borderColor: 'border-[#D291FF]/40' },
  lr: { tag: 'Lr', name: 'Lightroom RAW', bgColor: 'bg-[#001E36]', textColor: 'text-[#31A8FF]', borderColor: 'border-[#31A8FF]/40' },
  adobe: { tag: 'CC', name: 'Creative Cloud', bgColor: 'bg-[#2B0000]', textColor: 'text-[#FF0000]', borderColor: 'border-red-500/40' },
};

interface AdobeToolbarProps {
  appType: AdobeAppType;
  fileName: string;
  fileSizeFormatted: string;
  specSummary?: string;
  activeViewMode?: 'visual' | 'inspector' | 'layers';
  onViewModeChange?: (mode: 'visual' | 'inspector' | 'layers') => void;
  canToggleLayers?: boolean;
  hasInspectorData?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitView?: () => void;
  onExportPng?: () => void;
  onDownload?: () => void;
  onToggleInfo?: () => void;
  showInfoDrawer?: boolean;
  // Smart Tools
  backdrop?: BackdropStyle;
  onBackdropChange?: (style: BackdropStyle) => void;
  isEyedropperActive?: boolean;
  onToggleEyedropper?: () => void;
  onCopyImage?: () => void;
  copiedImageToast?: boolean;
  artboardCount?: number;
  currentArtboard?: number;
  onArtboardChange?: (page: number) => void;
}

export const AdobeToolbar: React.FC<AdobeToolbarProps> = ({
  appType,
  fileName,
  fileSizeFormatted,
  specSummary,
  activeViewMode,
  onViewModeChange,
  canToggleLayers,
  hasInspectorData,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitView,
  onExportPng,
  onDownload,
  onToggleInfo,
  showInfoDrawer,
  backdrop = 'checker-dark',
  onBackdropChange,
  isEyedropperActive,
  onToggleEyedropper,
  onCopyImage,
  copiedImageToast,
  artboardCount = 1,
  currentArtboard = 1,
  onArtboardChange,
}) => {
  const badge = ADOBE_APP_BADGES[appType] || ADOBE_APP_BADGES.adobe;

  const cycleBackdrop = () => {
    if (!onBackdropChange) return;
    const styles: BackdropStyle[] = ['checker-dark', 'checker-light', 'solid-white', 'solid-dark'];
    const currentIdx = styles.indexOf(backdrop);
    const next = styles[(currentIdx + 1) % styles.length];
    onBackdropChange(next);
  };

  const getBackdropLabel = () => {
    switch (backdrop) {
      case 'checker-light':
        return 'Backdrop: Light Grid';
      case 'solid-white':
        return 'Backdrop: Studio White (Print Proof)';
      case 'solid-dark':
        return 'Backdrop: Solid Dark';
      case 'checker-dark':
      default:
        return 'Backdrop: Dark Grid';
    }
  };

  return (
    <header className="h-12 bg-neutral-900/95 border-b border-neutral-800 px-3 sm:px-4 flex items-center justify-between text-neutral-200 select-none shrink-0 z-20 backdrop-blur-md">
      {/* Left: Adobe App Badge & File Identity */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div
          className={`w-8 h-8 rounded-lg ${badge.bgColor} border ${badge.borderColor} flex items-center justify-center font-bold text-xs ${badge.textColor} shadow-inner shrink-0`}
        >
          {badge.tag}
        </div>
        <div className="truncate">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-white truncate max-w-[180px] sm:max-w-[300px]">
              {fileName}
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
              {badge.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
            <span>{fileSizeFormatted}</span>
            {specSummary && (
              <>
                <span>•</span>
                <span className="text-neutral-300 font-mono">{specSummary}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center: View Switcher & Multi-Artboard Navigation */}
      <div className="flex items-center gap-2">
        {/* Multi-Artboard Pagination (Illustrator & InDesign) */}
        {artboardCount > 1 && onArtboardChange && (
          <div className="hidden md:flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => onArtboardChange(Math.max(1, currentArtboard - 1))}
              disabled={currentArtboard <= 1}
              className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400"
              title="Previous Artboard"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-2 font-mono text-[11px] text-neutral-300">
              Artboard {currentArtboard} / {artboardCount}
            </span>
            <button
              onClick={() => onArtboardChange(Math.min(artboardCount, currentArtboard + 1))}
              disabled={currentArtboard >= artboardCount}
              className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400"
              title="Next Artboard"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}

        {/* View Switcher (Viewport vs Layers vs Project Graph) */}
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
          {activeViewMode && onViewModeChange && (
            <>
              <button
                onClick={() => onViewModeChange('visual')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeViewMode === 'visual'
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Visual viewport"
              >
                <Sparkles size={12} />
                <span className="hidden md:inline">Viewport</span>
              </button>

              {canToggleLayers && (
                <button
                  onClick={() => onViewModeChange('layers')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeViewMode === 'layers'
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Layer hierarchy & visibility"
                >
                  <Layers size={12} />
                  <span className="hidden md:inline">Layers</span>
                </button>
              )}

              {hasInspectorData && (
                <button
                  onClick={() => onViewModeChange('inspector')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeViewMode === 'inspector'
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Project timeline & asset graph"
                >
                  <Film size={12} />
                  <span className="hidden md:inline">Project Graph</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: View Controls, Precision Tools & Export Actions */}
      <div className="flex items-center gap-1.5">
        {/* Backdrop Switcher (Dark Grid / Light Grid / Studio White / OLED Dark) */}
        {onBackdropChange && (
          <button
            onClick={cycleBackdrop}
            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title={getBackdropLabel()}
          >
            <Palette size={14} />
          </button>
        )}

        {/* Color Eyedropper / Loupe */}
        {onToggleEyedropper && (
          <button
            onClick={onToggleEyedropper}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isEyedropperActive
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border-neutral-800'
            }`}
            title={isEyedropperActive ? 'Eyedropper active (Click on canvas to sample)' : 'Color Eyedropper'}
          >
            <Pipette size={14} />
          </button>
        )}

        {/* Zoom Controls */}
        {zoom !== undefined && onZoomIn && onZoomOut && (
          <div className="hidden sm:flex items-center bg-neutral-950 rounded-lg border border-neutral-800 p-0.5 mr-1">
            <button
              onClick={onZoomOut}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
              title="Zoom out (Ctrl -)"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={onResetZoom}
              className="px-2 py-0.5 text-[10px] font-mono font-medium text-neutral-300 hover:text-white cursor-pointer"
              title="Reset 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
              title="Zoom in (Ctrl +)"
            >
              <ZoomIn size={13} />
            </button>
            {onFitView && (
              <button
                onClick={onFitView}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 ml-0.5 cursor-pointer"
                title="Fit to screen"
              >
                <Maximize2 size={13} />
              </button>
            )}
          </div>
        )}

        {/* Copy Canvas to Clipboard */}
        {onCopyImage && (
          <button
            onClick={onCopyImage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium transition-colors border border-neutral-700 cursor-pointer"
            title="Copy rendered image to clipboard"
          >
            {copiedImageToast ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span className="hidden xl:inline">{copiedImageToast ? 'Copied!' : 'Copy Image'}</span>
          </button>
        )}

        {/* Export Composite PNG */}
        {onExportPng && (
          <button
            onClick={onExportPng}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium transition-colors border border-neutral-700 cursor-pointer"
            title="Export composite PNG"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export PNG</span>
          </button>
        )}

        {/* Download Original File */}
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
            title="Download source file"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Download</span>
          </button>
        )}

        {/* Telemetry Drawer Toggle */}
        {onToggleInfo && (
          <button
            onClick={onToggleInfo}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showInfoDrawer
                ? 'bg-neutral-700 text-white border-neutral-600'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border-neutral-800'
            }`}
            title="Document metadata & specifications"
          >
            <Info size={14} />
          </button>
        )}
      </div>
    </header>
  );
};
