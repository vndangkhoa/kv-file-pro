import React, { useState, useEffect, useMemo } from 'react';
import { PreviewExtensionProps } from '../../types';
import { formatHumanSize } from '../../utils/format';
import { AdobeToolbar, AdobeAppType } from './components/AdobeToolbar';
import { AdobeVisualViewport } from './components/AdobeVisualViewport';
import { AdobeProjectInspector } from './components/AdobeProjectInspector';
import { AeCompositionStage } from './components/AeCompositionStage';
import { decodeAiFile, DecodedAiResult, AiLayer, renderAiPage, renderDynamicAiCanvas } from './decoders/aiDecoder';
import { BackdropStyle } from './components/AdobeVisualViewport';
import { AdobeLayerTree } from './components/AdobeLayerTree';
import { decodeInddFile, DecodedInddResult } from './decoders/inddDecoder';
import { decodeXdFile, DecodedXdResult } from './decoders/xdDecoder';
import { decodePrprojFile, DecodedPrprojResult } from './decoders/prprojDecoder';
import { decodeAepFile, DecodedAepResult } from './decoders/aepDecoder';
import { decodeDngFile, DecodedDngResult } from './decoders/dngDecoder';
import { decodeEpsFile, DecodedEpsResult } from './decoders/epsDecoder';
import {
  decodePsdFile,
  renderDynamicLayers,
  DecodedPsdResult,
  DecodedLayer,
} from '../psd/psdDecoder';
import {
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

export const AdobeSuiteViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
  extension,
  onDownload,
}) => {
  const ext = (extension || fileName.split('.').pop() || '').toLowerCase().replace(/^\./, '');

  // Determine Adobe Application
  const appType: AdobeAppType = useMemo(() => {
    switch (ext) {
      case 'psd':
      case 'psb':
        return 'ps';
      case 'ai':
        return 'ai';
      case 'eps':
        return 'eps';
      case 'indd':
      case 'indt':
      case 'idml':
        return 'id';
      case 'xd':
        return 'xd';
      case 'prproj':
        return 'pr';
      case 'aep':
      case 'aepx':
        return 'ae';
      case 'dng':
        return 'lr';
      default:
        return 'adobe';
    }
  }, [ext]);

  // Loading & Error State
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Fetching Adobe document stream...');
  const [error, setError] = useState<string | null>(null);

  // Viewport & Mode
  const [viewMode, setViewMode] = useState<'visual' | 'inspector' | 'layers'>('visual');
  const [zoom, setZoom] = useState(1);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);

  // Decoded Data Stores
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [psdResult, setPsdResult] = useState<DecodedPsdResult | null>(null);
  const [aiResult, setAiResult] = useState<DecodedAiResult | null>(null);
  const [epsResult, setEpsResult] = useState<DecodedEpsResult | null>(null);
  const [inddResult, setInddResult] = useState<DecodedInddResult | null>(null);
  const [xdResult, setXdResult] = useState<DecodedXdResult | null>(null);
  const [prprojResult, setPrprojResult] = useState<DecodedPrprojResult | null>(null);
  const [aepResult, setAepResult] = useState<DecodedAepResult | null>(null);
  const [dngResult, setDngResult] = useState<DecodedDngResult | null>(null);

  // Layer visibility & Solo state
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(new Set());
  const [hiddenAiLayerIds, setHiddenAiLayerIds] = useState<Set<string>>(new Set());
  const [soloLayerId, setSoloLayerId] = useState<string | null>(null);
  const [soloAiLayerId, setSoloAiLayerId] = useState<string | null>(null);
  const [exportingAiLayerId, setExportingAiLayerId] = useState<string | null>(null);

  // Smart Viewer Tools
  const [backdrop, setBackdrop] = useState<BackdropStyle>('checker-dark');
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [currentArtboard, setCurrentArtboard] = useState(1);
  const [copiedImageToast, setCopiedImageToast] = useState(false);

  // 1. Fetch & Decode Adobe File
  useEffect(() => {
    let isCancelled = false;

    async function loadAdobeDocument() {
      try {
        setLoading(true);
        setError(null);
        setStatusMessage(`Downloading ${fileName}...`);

        const res = await fetch(fileUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load file`);

        const buffer = await res.arrayBuffer();
        if (isCancelled) return;

        // Reset previous state
        setCanvas(null);
        setImageUrl(null);
        setPdfUrl(null);
        setEpsResult(null);

        // Dispatch based on extension
        if (ext === 'psd' || ext === 'psb') {
          setStatusMessage('Decoding Photoshop composite & layer hierarchy...');
          const result = await decodePsdFile(buffer);
          if (isCancelled) return;
          setPsdResult(result);
          setCanvas(result.compositeCanvas);
          setViewMode('visual');
        } else if (ext === 'ai') {
          setStatusMessage('Parsing Illustrator artboards & vector layers...');
          const result = await decodeAiFile(buffer);
          if (isCancelled) return;
          setAiResult(result);
          if (result.canvas) {
            setCanvas(result.canvas);
            try {
              setImageUrl(result.canvas.toDataURL('image/png'));
            } catch {}
          } else if (result.thumbnailUrl) {
            setImageUrl(result.thumbnailUrl);
          }
          setViewMode('visual');
        } else if (ext === 'eps') {
          setStatusMessage('Decoding Encapsulated PostScript vector stream & preview...');
          const result = await decodeEpsFile(buffer);
          if (isCancelled) return;
          setEpsResult(result);
          if (result.canvas) {
            setCanvas(result.canvas);
            setViewMode('visual');
          } else if (result.previewUrl) {
            setImageUrl(result.previewUrl);
            setViewMode('visual');
          } else {
            setViewMode('inspector');
          }
        } else if (ext === 'indd' || ext === 'indt' || ext === 'idml') {
          setStatusMessage('Extracting InDesign layout spreads & XMP previews...');
          const isIdml = ext === 'idml';
          const result = await decodeInddFile(buffer, isIdml);
          if (isCancelled) return;
          setInddResult(result);
          if (result.previewUrl) {
            setImageUrl(result.previewUrl);
            setViewMode('visual');
          } else {
            setViewMode('inspector');
          }
        } else if (ext === 'xd') {
          setStatusMessage('Unpacking Adobe XD archive & artboards...');
          const result = await decodeXdFile(buffer);
          if (isCancelled) return;
          setXdResult(result);
          if (result.thumbnailUrl) {
            setImageUrl(result.thumbnailUrl);
            setViewMode('visual');
          } else {
            setViewMode('inspector');
          }
        } else if (ext === 'prproj') {
          setStatusMessage('Decompressing Premiere Pro sequence timelines & asset graph...');
          const result = await decodePrprojFile(buffer);
          if (isCancelled) return;
          setPrprojResult(result);
          setViewMode('inspector');
        } else if (ext === 'aep' || ext === 'aepx') {
          setStatusMessage('Scanning After Effects composition structures...');
          const isXml = ext === 'aepx';
          const result = await decodeAepFile(buffer, isXml);
          if (isCancelled) return;
          setAepResult(result);
          setViewMode('visual');
        } else if (ext === 'dng') {
          setStatusMessage('Reading Adobe DNG RAW preview & EXIF tags...');
          const result = decodeDngFile(buffer);
          if (isCancelled) return;
          setDngResult(result);
          if (result.previewUrl) {
            setImageUrl(result.previewUrl);
            setViewMode('visual');
          }
        } else {
          // General fallback
          setViewMode('inspector');
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to parse Adobe document:', err);
          setError(err.message || 'Unable to decode Adobe document.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadAdobeDocument();
    return () => {
      isCancelled = true;
    };
  }, [fileUrl, ext, fileName]);

  // Dynamic PSD layer re-rendering when layer visibility or solo mode changes
  useEffect(() => {
    if (!psdResult) return;
    const dynamicCanvas = renderDynamicLayers(psdResult, hiddenLayerIds, soloLayerId);
    setCanvas(dynamicCanvas);
  }, [psdResult, hiddenLayerIds, soloLayerId]);

  // Dynamic AI plate/layer re-rendering when plate visibility or solo mode changes
  useEffect(() => {
    if (!aiResult) return;
    let isCancelled = false;

    async function updateAiCanvas() {
      const dynamicCanvas = await renderDynamicAiCanvas(
        aiResult!,
        hiddenAiLayerIds,
        soloAiLayerId,
        currentArtboard
      );
      if (!isCancelled && dynamicCanvas) {
        setCanvas(dynamicCanvas);
      }
    }

    updateAiCanvas();
    return () => {
      isCancelled = true;
    };
  }, [aiResult, hiddenAiLayerIds, soloAiLayerId, currentArtboard]);

  // Copy Canvas Image to Clipboard
  const handleCopyImage = async () => {
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedImageToast(true);
        setTimeout(() => setCopiedImageToast(false), 2000);
      });
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  // Export Individual Layer PNG
  const handleExportLayerPng = (layer: DecodedLayer) => {
    if (!layer.canvas) return;
    const link = document.createElement('a');
    link.download = `${fileName.replace(/\.[^.]+$/, '')}-${layer.name.replace(/\s+/g, '_')}.png`;
    link.href = layer.canvas.toDataURL('image/png');
    link.click();
  };

  // Export Individual Illustrator Plate / Layer PNG
  const handleExportAiLayerPng = async (layer: AiLayer) => {
    if (!aiResult) return;
    try {
      setExportingAiLayerId(layer.id);
      const isolatedCanvas = await renderDynamicAiCanvas(
        aiResult,
        new Set(),
        layer.id,
        currentArtboard,
        2.0
      );
      if (!isolatedCanvas) return;

      const link = document.createElement('a');
      const safeLayerName = layer.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${fileName.replace(/\.[^.]+$/, '')}-plate-${safeLayerName}.png`;
      link.href = isolatedCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export AI plate PNG:', err);
    } finally {
      setExportingAiLayerId(null);
    }
  };

  // Change Artboard for Multi-page Illustrator
  const handleArtboardChange = async (pageNum: number) => {
    if (!aiResult?.pdfBytes) return;
    setCurrentArtboard(pageNum);
    const res = await renderAiPage(aiResult.pdfBytes, pageNum, 2.0);
    if (res) {
      setCanvas(res.canvas);
      try {
        setImageUrl(res.canvas.toDataURL('image/png'));
      } catch {}
    }
  };

  // Aggregate Metadata for Info Drawer
  const activeMetadata = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {
      'File Name': fileName,
      'File Size': formatHumanSize(fileSize),
      'Extension': `.${ext.toUpperCase()}`,
    };

    if (psdResult) {
      map['Dimensions'] = `${psdResult.width} x ${psdResult.height} px`;
      map['Color Mode'] = `${psdResult.colorModeName} (${psdResult.depth}-bit)`;
      map['Total Layers'] = `${psdResult.layerCount}`;
    } else if (aiResult) {
      Object.assign(map, aiResult.metadata);
    } else if (epsResult) {
      Object.assign(map, epsResult.metadata);
    } else if (inddResult) {
      Object.assign(map, inddResult.metadata);
    } else if (xdResult) {
      Object.assign(map, xdResult.metadata);
    } else if (prprojResult) {
      Object.assign(map, prprojResult.metadata);
    } else if (aepResult) {
      Object.assign(map, aepResult.metadata);
    } else if (dngResult) {
      Object.assign(map, dngResult.metadata);
    }

    return map;
  }, [fileName, fileSize, ext, psdResult, aiResult, epsResult, inddResult, xdResult, prprojResult, aepResult, dngResult]);

  // Spec Summary for Top Bar
  const specSummary = useMemo(() => {
    if (psdResult) return `${psdResult.width} x ${psdResult.height} • ${psdResult.colorModeName}`;
    if (aiResult?.artboards?.length) return `${aiResult.artboards[0].width} x ${aiResult.artboards[0].height} pt`;
    if (epsResult?.boundingBox) {
      const bW = Math.abs(epsResult.boundingBox[2] - epsResult.boundingBox[0]);
      const bH = Math.abs(epsResult.boundingBox[3] - epsResult.boundingBox[1]);
      return `${bW} × ${bH} pt • ${epsResult.languageLevel || 'PostScript'}`;
    }
    if (prprojResult) return `${prprojResult.sequences.length} sequence(s) • ${prprojResult.clips.length} clip(s)`;
    if (aepResult?.compositions?.length) {
      const mainComp = aepResult.compositions[0];
      return `${mainComp.width} × ${mainComp.height} • ${aepResult.compositions.length} comp(s)`;
    }
    if (inddResult) return `${inddResult.pageCount} page(s)`;
    if (xdResult) return `${xdResult.artboardCount} screen(s)`;
    if (dngResult?.cameraModel) return dngResult.cameraModel;
    return undefined;
  }, [psdResult, aiResult, epsResult, prprojResult, aepResult, inddResult, xdResult, dngResult]);

  // Export Composite PNG
  const handleExportPng = () => {
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${fileName.replace(/\.[^.]+$/, '')}-composite.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else if (imageUrl) {
      const link = document.createElement('a');
      link.download = `${fileName.replace(/\.[^.]+$/, '')}-preview.png`;
      link.href = imageUrl;
      link.click();
    }
  };

  // Toggle Layer visibility in PSD mode (with recursive group cascading)
  const handleTogglePsdLayer = (layerId: string, isGroup?: boolean) => {
    if (!psdResult) return;
    const isCurrentlyHidden = hiddenLayerIds.has(layerId);
    const idsToToggle = new Set<string>([layerId]);

    if (isGroup) {
      const collectChildren = (layers: DecodedLayer[]) => {
        for (const l of layers) {
          if (l.id === layerId) {
            const addDescendants = (children?: DecodedLayer[]) => {
              if (!children) return;
              for (const c of children) {
                idsToToggle.add(c.id);
                if (c.children) addDescendants(c.children);
              }
            };
            addDescendants(l.children);
            return true;
          }
          if (l.children && collectChildren(l.children)) return true;
        }
        return false;
      };
      collectChildren(psdResult.layers);
    }

    setHiddenLayerIds((prev) => {
      const next = new Set(prev);
      for (const id of idsToToggle) {
        if (isCurrentlyHidden) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  };

  // Toggle Layer/Plate visibility in AI mode
  const handleToggleAiLayer = (layerId: string) => {
    setHiddenAiLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  // Show all layers across PSD / AI
  const handleShowAllLayers = () => {
    if (psdResult) {
      setHiddenLayerIds(new Set());
      setSoloLayerId(null);
    }
    if (aiResult) {
      setHiddenAiLayerIds(new Set());
      setSoloAiLayerId(null);
    }
  };

  // Hide all layers across PSD / AI
  const handleHideAllLayers = () => {
    if (psdResult) {
      setHiddenLayerIds(new Set(psdResult.flatLayers.map((l) => l.id)));
      setSoloLayerId(null);
    }
    if (aiResult) {
      setHiddenAiLayerIds(new Set(aiResult.layers.map((l) => l.id)));
      setSoloAiLayerId(null);
    }
  };

  const hasLayers = Boolean(
    (psdResult && psdResult.layers.length > 0) ||
    (aiResult && aiResult.layers && aiResult.layers.length > 0)
  );

  const hasInspectorData = Boolean(
    prprojResult ||
    aepResult ||
    epsResult ||
    (inddResult && (inddResult.fonts.length > 0 || inddResult.stories?.length)) ||
    (aiResult && (aiResult.fonts.length > 0 || aiResult.swatches.length > 0))
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#141416] text-neutral-200 overflow-hidden relative font-sans">
      {/* 1. Universal Adobe Creative Cloud Header */}
      <AdobeToolbar
        appType={appType}
        fileName={fileName}
        fileSizeFormatted={formatHumanSize(fileSize)}
        specSummary={specSummary}
        activeViewMode={viewMode}
        onViewModeChange={setViewMode}
        canToggleLayers={hasLayers}
        hasInspectorData={hasInspectorData}
        zoom={viewMode === 'visual' && !pdfUrl ? zoom : undefined}
        onZoomIn={() => setZoom((z) => Math.min(z * 1.25, 10))}
        onZoomOut={() => setZoom((z) => Math.max(z * 0.8, 0.1))}
        onResetZoom={() => setZoom(1)}
        onFitView={() => setZoom(1)}
        onExportPng={canvas || imageUrl ? handleExportPng : undefined}
        onDownload={onDownload}
        onToggleInfo={() => setShowInfoDrawer(!showInfoDrawer)}
        showInfoDrawer={showInfoDrawer}
        backdrop={backdrop}
        onBackdropChange={setBackdrop}
        isEyedropperActive={isEyedropperActive}
        onToggleEyedropper={() => setIsEyedropperActive(!isEyedropperActive)}
        onCopyImage={canvas ? handleCopyImage : undefined}
        copiedImageToast={copiedImageToast}
        artboardCount={aiResult?.numPages || 1}
        currentArtboard={currentArtboard}
        onArtboardChange={handleArtboardChange}
      />

      {/* 2. Main Viewport Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-8 bg-neutral-950">
            <Loader2 size={32} className="text-blue-500 animate-spin" />
            <p className="text-xs font-medium text-neutral-300">{statusMessage}</p>
            <span className="text-[11px] text-neutral-500 font-mono">{fileName}</span>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-950">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-lg">
              <AlertCircle size={24} />
            </div>
            <h3 className="font-semibold text-sm text-white mb-1">Failed to Decode Document</h3>
            <p className="text-xs text-neutral-400 max-w-md mb-4">{error}</p>
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium transition-colors border border-neutral-700"
              >
                Download Original File ({formatHumanSize(fileSize)})
              </button>
            )}
          </div>
        ) : viewMode === 'inspector' ? (
          <AdobeProjectInspector
            sequences={prprojResult?.sequences}
            compositions={aepResult?.compositions}
            clips={prprojResult?.clips}
            footage={aepResult?.footage}
            markers={prprojResult?.markers}
            stories={inddResult?.stories}
            fonts={aiResult?.fonts || inddResult?.fonts}
            swatches={aiResult?.swatches || inddResult?.swatches || epsResult?.swatches}
            metadata={activeMetadata}
          />
        ) : (
          <div className="w-full h-full flex overflow-hidden">
            {/* Visual Viewport */}
            <div className="flex-1 h-full overflow-hidden relative">
              {aepResult && aepResult.compositions.length > 0 ? (
                <AeCompositionStage
                  compositions={aepResult.compositions}
                  fileName={fileName}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  onResetZoom={() => setZoom(1)}
                  onSwitchToInspector={() => setViewMode('inspector')}
                />
              ) : (
                <AdobeVisualViewport
                  canvas={canvas}
                  imageUrl={imageUrl}
                  pdfUrl={pdfUrl}
                  backdrop={backdrop}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  onResetZoom={() => setZoom(1)}
                  fileName={fileName}
                  onSwitchToInspector={() => setViewMode('inspector')}
                  isEyedropperActive={isEyedropperActive}
                  onColorPicked={(hex) => console.log('Picked color:', hex)}
                  layers={psdResult?.flatLayers || []}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                />
              )}
            </div>

            {/* Layers Drawer (When ViewMode is 'layers') */}
            {viewMode === 'layers' && hasLayers && (
              <AdobeLayerTree
                appType={appType}
                psdResult={psdResult}
                aiResult={aiResult}
                hiddenLayerIds={hiddenLayerIds}
                onToggleLayer={handleTogglePsdLayer}
                soloLayerId={soloLayerId}
                onToggleSoloLayer={(id) => setSoloLayerId(soloLayerId === id ? null : id)}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onExportLayerPng={handleExportLayerPng}
                hiddenAiLayerIds={hiddenAiLayerIds}
                onToggleAiLayer={handleToggleAiLayer}
                soloAiLayerId={soloAiLayerId}
                onToggleSoloAiLayer={(id) => setSoloAiLayerId(soloAiLayerId === id ? null : id)}
                onExportAiLayerPng={handleExportAiLayerPng}
                exportingAiLayerId={exportingAiLayerId}
                onShowAllLayers={handleShowAllLayers}
                onHideAllLayers={handleHideAllLayers}
                onClose={() => setViewMode('visual')}
              />
            )}
          </div>
        )}

        {/* 3. Metadata Slide-out Drawer */}
        {showInfoDrawer && (
          <aside className="w-80 bg-neutral-900/95 backdrop-blur-md border-l border-neutral-800 p-4 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right-10 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h4 className="font-semibold text-xs text-white uppercase tracking-wider">
                Document Telemetry
              </h4>
              <button
                onClick={() => setShowInfoDrawer(false)}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              {Object.entries(activeMetadata).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-400">{key}</span>
                  <span className="text-neutral-200 font-mono text-right max-w-[160px] truncate" title={val}>
                    {val}
                  </span>
                </div>
              ))}

              {aiResult?.fonts && aiResult.fonts.length > 0 && (
                <div className="pt-2">
                  <span className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1.5 font-semibold">
                    Detected Fonts
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {aiResult.fonts.map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
