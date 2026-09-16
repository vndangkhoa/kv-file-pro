import React, { useEffect, useState, useRef } from 'react';
import {
  Eye,
  Box,
  Layers,
  FolderArchive,
  Film,
  Music,
  Play,
  Type,
  Workflow,
  Loader2,
} from 'lucide-react';
import { FileItem } from '../../types';
import { api } from '../../services/api';
import { FileIcon } from '../common/FileIcon';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Prism language loaders for safe syntax highlighting
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';

const WEB_IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
  'ico',
]);

interface UniversalInspectorPreviewProps {
  item: FileItem;
  onOpenQuickLook: () => void;
  className?: string;
}

export const UniversalInspectorPreview: React.FC<UniversalInspectorPreviewProps> = ({
  item,
  onOpenQuickLook,
  className = '',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [fontFamilyName, setFontFamilyName] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<string>('typescript');
  const [archiveSummary, setArchiveSummary] = useState<{
    fileCount: number;
    sampleFiles: string[];
  } | null>(null);
  const [adobeProjectSummary, setAdobeProjectSummary] = useState<{
    app: 'pr' | 'ae';
    title: string;
    details: string[];
  } | null>(null);
  const [cad3dSummary, setCad3dSummary] = useState<{
    format: string;
    title: string;
  } | null>(null);
  const [sysvisSummary, setSysvisSummary] = useState<{
    format: string;
    diagramType: string;
  } | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const ext = (
    item.extension ||
    (item.name ? item.name.split('.').pop() : '') ||
    ''
  ).toLowerCase();

  // Mount canvas element when available
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (container && canvasElement) {
      container.innerHTML = '';
      canvasElement.style.maxWidth = '100%';
      canvasElement.style.maxHeight = '100%';
      canvasElement.style.objectFit = 'contain';
      container.appendChild(canvasElement);
    }
  }, [canvasElement]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setPreviewUrl(null);
    setCanvasElement(null);
    setFontFamilyName(null);
    setTextContent(null);
    setArchiveSummary(null);
    setAdobeProjectSummary(null);
    setCad3dSummary(null);
    setSysvisSummary(null);

    const fileUrl = api.getRawFileUrl(item.root_name, item.path);

    async function generatePreview() {
      try {
        // 1. Native Web Images
        if (item.media_type === 'image' && WEB_IMAGE_EXTS.has(ext)) {
          if (!cancelled) {
            setPreviewUrl(fileUrl);
            setLoading(false);
          }
          return;
        }

        // 2. Video Files
        if (
          item.media_type === 'video' ||
          ['mp4', 'mov', 'webm', 'mkv', 'm4v', '3gp'].includes(ext)
        ) {
          if (!cancelled) {
            setPreviewUrl(fileUrl);
            setLoading(false);
          }
          return;
        }

        // 3. Audio Files
        if (item.media_type === 'audio') {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        // 4. Code & Configuration Files
        const isCodeOrConfig =
          item.media_type === 'code' ||
          [
            'ts',
            'tsx',
            'js',
            'jsx',
            'json',
            'yaml',
            'yml',
            'toml',
            'py',
            'rs',
            'sql',
            'sh',
            'bash',
            'zsh',
            'tf',
            'ini',
            'conf',
            'env',
            'xml',
            'html',
            'css',
            'md',
            'markdown',
            'log',
            'txt',
          ].includes(ext);

        const isSysvis = ['mmd', 'mermaid', 'flow', 'arch', 'diag'].includes(ext);

        if (isCodeOrConfig && !isSysvis) {
          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error('Fetch failed');
          const text = await res.text();
          if (cancelled) return;

          let lang = 'typescript';
          if (['json'].includes(ext)) lang = 'json';
          else if (['yaml', 'yml'].includes(ext)) lang = 'yaml';
          else if (['toml'].includes(ext)) lang = 'toml';
          else if (['py'].includes(ext)) lang = 'python';
          else if (['rs'].includes(ext)) lang = 'rust';
          else if (['sql'].includes(ext)) lang = 'sql';
          else if (['sh', 'bash', 'zsh'].includes(ext)) lang = 'bash';

          const sample = text.split('\n').slice(0, 24).join('\n');
          setTextContent(sample);
          setCodeLanguage(lang);
          setLoading(false);
          return;
        }

        // 5. SysVis Diagrams
        if (isSysvis) {
          const res = await fetch(fileUrl);
          if (res.ok) {
            const text = await res.text();
            if (!cancelled) {
              setSysvisSummary({
                format: ext.toUpperCase(),
                diagramType: text.includes('graph')
                  ? 'Flowchart Diagram'
                  : text.includes('sequenceDiagram')
                  ? 'Sequence Diagram'
                  : text.includes('classDiagram')
                  ? 'Class Diagram'
                  : 'Architecture Diagram',
              });
              setLoading(false);
              return;
            }
          }
        }

        // 6. Binary formats: Fetch array buffer
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`Fetch failed with HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        // --- Adobe Digital Negative (DNG / RAW) ---
        if (['dng', 'cr2', 'nef', 'raw', 'arw'].includes(ext)) {
          const { decodeDngFile } = await import(
            '../../extensions/adobe/decoders/dngDecoder'
          );
          const result = decodeDngFile(buffer);
          if (cancelled) return;

          if (result.previewUrl) {
            setPreviewUrl(result.previewUrl);
          } else {
            setError(true);
          }
          setLoading(false);
          return;
        }

        // --- Adobe Photoshop (PSD / PSB) ---
        if (['psd', 'psb'].includes(ext)) {
          const { extractEmbeddedJpegThumbnail, decodePackBitsComposite } =
            await import('../../extensions/psd/psdDecoder');
          let cvs = await extractEmbeddedJpegThumbnail(buffer);
          if (!cvs && !cancelled) {
            cvs = decodePackBitsComposite(buffer);
          }
          if (!cvs && !cancelled) {
            const { readPsd } = await import('ag-psd');
            const psd = readPsd(buffer, { skipLayerImageData: true });
            if (psd.canvas) cvs = psd.canvas;
          }
          if (cancelled) return;

          if (cvs) {
            setPreviewUrl(cvs.toDataURL('image/png'));
          } else {
            setError(true);
          }
          setLoading(false);
          return;
        }

        // --- Adobe Illustrator (AI) ---
        if (ext === 'ai') {
          const { decodeAiFile } = await import(
            '../../extensions/adobe/decoders/aiDecoder'
          );
          const result = await decodeAiFile(buffer);
          if (cancelled) return;

          if (result.canvas) {
            setPreviewUrl(result.canvas.toDataURL('image/png'));
            setCanvasElement(result.canvas);
          } else if (result.thumbnailUrl) {
            setPreviewUrl(result.thumbnailUrl);
          } else {
            setError(true);
          }
          setLoading(false);
          return;
        }

        // --- Encapsulated PostScript (EPS) ---
        if (ext === 'eps') {
          const { decodeEpsFile } = await import(
            '../../extensions/adobe/decoders/epsDecoder'
          );
          const result = await decodeEpsFile(buffer);
          if (cancelled) return;

          if (result.previewUrl) {
            setPreviewUrl(result.previewUrl);
          } else if (result.canvas) {
            setCanvasElement(result.canvas);
          } else {
            setError(true);
          }
          setLoading(false);
          return;
        }

        // --- Adobe XD ---
        if (ext === 'xd') {
          const { decodeXdFile } = await import(
            '../../extensions/adobe/decoders/xdDecoder'
          );
          const result = await decodeXdFile(buffer);
          if (cancelled) return;

          if (result.thumbnailUrl) {
            setPreviewUrl(result.thumbnailUrl);
          } else {
            setError(true);
          }
          setLoading(false);
          return;
        }

        // --- Adobe InDesign (INDD / IDML) ---
        if (['indd', 'indt', 'idml'].includes(ext)) {
          const { decodeInddFile } = await import(
            '../../extensions/adobe/decoders/inddDecoder'
          );
          const result = await decodeInddFile(buffer, ext === 'idml');
          if (cancelled) return;

          if (result.previewUrl) {
            setPreviewUrl(result.previewUrl);
          } else {
            setError(true);
          }
          setLoading(false);
          return;
        }

        // --- Adobe Premiere Pro (PRPROJ) ---
        if (ext === 'prproj') {
          const { decodePrprojFile } = await import(
            '../../extensions/adobe/decoders/prprojDecoder'
          );
          const result = await decodePrprojFile(buffer);
          if (cancelled) return;

          const seq = result.sequences[0];
          setAdobeProjectSummary({
            app: 'pr',
            title: result.projectName || item.name,
            details: [
              seq ? `Seq: ${seq.name}` : 'Premiere Pro Project',
              seq
                ? `${seq.width || 1920}x${seq.height || 1080} @ ${seq.frameRate || 24}fps`
                : '',
              `${result.clips.length} Media Clips linked`,
            ].filter(Boolean),
          });
          setLoading(false);
          return;
        }

        // --- Adobe After Effects (AEP / AEPX) ---
        if (['aep', 'aepx'].includes(ext)) {
          const { decodeAepFile } = await import(
            '../../extensions/adobe/decoders/aepDecoder'
          );
          const result = await decodeAepFile(buffer, ext === 'aepx');
          if (cancelled) return;

          const comp = result.compositions[0];
          setAdobeProjectSummary({
            app: 'ae',
            title: result.projectName || item.name,
            details: [
              comp ? `Comp: ${comp.name}` : 'After Effects Project',
              comp ? `${comp.width}x${comp.height} @ ${comp.frameRate}fps` : '',
              comp ? `${comp.layerCount} Composed Layers` : '',
            ].filter(Boolean),
          });
          setLoading(false);
          return;
        }

        // --- Typography & Fonts (TTF, OTF, WOFF, WOFF2) ---
        if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) {
          const fontId = `kv-font-${Math.random().toString(36).substring(2, 9)}`;
          const fontFace = new FontFace(fontId, buffer);
          await fontFace.load();
          document.fonts.add(fontFace);
          if (cancelled) return;

          setFontFamilyName(fontId);
          setLoading(false);
          return;
        }

        // --- CAD 2D Blueprints (DXF, DWG) ---
        if (['dxf', 'dwg'].includes(ext)) {
          const { parseCad2dFile } = await import(
            '../../extensions/cad/cad2dParser'
          );
          const cadModel = await parseCad2dFile(buffer, ext);
          if (cancelled) return;

          // Render miniature blueprint canvas
          const cvs = renderMiniCadBlueprint(cadModel, 300, 160);
          setCanvasElement(cvs);
          setLoading(false);
          return;
        }

        // --- CAD 3D & Meshes (STL, OBJ, STEP, IFC, 3MF) ---
        if (
          ['step', 'stp', 'iges', 'igs', 'stl', 'obj', 'ifc', '3mf', 'ply'].includes(
            ext
          )
        ) {
          setCad3dSummary({
            format: ext.toUpperCase(),
            title: item.name,
          });
          setLoading(false);
          return;
        }

        // --- Compressed Archives (ZIP, TAR, GZ) ---
        if (['zip', 'tar', 'gz', 'tgz', '7z'].includes(ext)) {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(buffer);
          if (cancelled) return;

          const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
          setArchiveSummary({
            fileCount: Object.keys(zip.files).length,
            sampleFiles: files.slice(0, 3),
          });
          setLoading(false);
          return;
        }

        // Default fallback
        setError(true);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.warn('Universal inline preview error:', err);
          setError(true);
          setLoading(false);
        }
      }
    }

    generatePreview();
    return () => {
      cancelled = true;
    };
  }, [item.path, item.root_name, ext]);

  // Loading indicator
  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-2 p-4">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <span className="text-[11px] font-mono text-gray-400">
          Decoding {ext.toUpperCase()} stream...
        </span>
      </div>
    );
  }

  // Error fallback: standard FileIcon
  if (error) {
    return (
      <div
        onClick={onOpenQuickLook}
        className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 group"
        title="Click for Quick Look"
      >
        <FileIcon item={item} size={54} />
        <span className="text-[10px] text-gray-400 mt-2 group-hover:text-blue-500 transition-colors">
          Click for Quick Look
        </span>
      </div>
    );
  }

  // 1. Render Image or Decoded Raster Preview (JPG, PNG, DNG, PSD, AI, EPS, XD, IDML)
  if (previewUrl && item.media_type !== 'video') {
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex items-center justify-center cursor-pointer group/preview select-none overflow-hidden ${className}`}
        title="Click to open full Quick Look"
      >
        <div className="w-full h-full flex items-center justify-center checkerboard-light dark:checkerboard-dark rounded overflow-hidden">
          <img
            src={previewUrl}
            alt={item.name}
            onError={() => setError(true)}
            className="w-full h-full object-contain filter transition-transform duration-200 group-hover/preview:scale-105"
          />
        </div>

        {/* Format Tag Badge */}
        {ext && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white uppercase tracking-wider font-mono pointer-events-none shadow-xs">
            {['dng', 'cr2', 'nef', 'raw'].includes(ext)
              ? 'RAW DNG'
              : ext.toUpperCase()}
          </div>
        )}

        {/* Hover Quick Look Action Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/30 flex items-center justify-center transition-colors">
          <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity bg-blue-600/90 hover:bg-blue-600 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <Eye size={13} />
            <span>Open Quick Look</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Canvas Viewport (CAD 2D Blueprints, vector EPS, AI PDF pages)
  if (canvasElement) {
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex items-center justify-center cursor-pointer group/preview select-none overflow-hidden bg-[#0f172a] rounded ${className}`}
        title="Click to open full Quick Look"
      >
        <div
          ref={canvasContainerRef}
          className="w-full h-full flex items-center justify-center overflow-hidden p-1.5"
        />
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-bold text-cyan-300 uppercase tracking-wider font-mono pointer-events-none shadow-xs">
          {ext.toUpperCase()} Blueprint
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/30 flex items-center justify-center transition-colors">
          <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity bg-cyan-600/90 hover:bg-cyan-600 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <Eye size={13} />
            <span>Open CAD Studio</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Live Typography Font Specimen (TTF, OTF, WOFF, WOFF2)
  if (fontFamilyName) {
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex flex-col items-center justify-center cursor-pointer group/preview select-none p-3 bg-gradient-to-b from-amber-500/5 to-amber-500/15 dark:from-amber-950/20 dark:to-amber-900/10 text-center rounded border border-amber-500/20 overflow-hidden ${className}`}
        title="Click to open Typography Studio"
      >
        <div
          style={{ fontFamily: fontFamilyName }}
          className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-1.5 transition-transform group-hover/preview:scale-105"
        >
          Aa Gg
        </div>
        <div
          style={{ fontFamily: fontFamilyName }}
          className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-full px-2"
        >
          Sphinx of black quartz, judge my vow
        </div>
        <div className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mt-2 flex items-center gap-1">
          <Type size={11} />
          <span>{ext.toUpperCase()} Live Specimen</span>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/30 flex items-center justify-center transition-colors">
          <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity bg-amber-600/90 hover:bg-amber-600 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <Eye size={13} />
            <span>Open Font Studio</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Render Video Preview
  if (item.media_type === 'video' && previewUrl) {
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex items-center justify-center cursor-pointer group/preview bg-black overflow-hidden rounded ${className}`}
        title="Click to play in Video Player"
      >
        <video
          src={previewUrl}
          className="w-full h-full object-contain"
          controls={false}
          muted
        />
        <div className="absolute inset-0 bg-black/20 group-hover/preview:bg-black/40 flex items-center justify-center transition-colors">
          <div className="w-10 h-10 rounded-full bg-blue-600/90 group-hover/preview:bg-blue-600 text-white flex items-center justify-center shadow-lg transform group-hover/preview:scale-110 transition-transform">
            <Play size={18} className="translate-x-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // 5. Render Audio Card
  if (item.media_type === 'audio') {
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex flex-col items-center justify-center cursor-pointer group/preview bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 text-white p-4 rounded overflow-hidden ${className}`}
        title="Click to play in Music Player"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-lg group-hover/preview:scale-110 transition-transform mb-2">
          <Music size={28} />
        </div>
        <div className="flex items-end gap-1 h-4">
          <span className="w-1 h-3 bg-white/80 rounded-full animate-pulse" />
          <span className="w-1 h-4 bg-white rounded-full" />
          <span className="w-1 h-2 bg-white/70 rounded-full" />
          <span className="w-1 h-4 bg-white/90 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  // 6. Render Premiere Pro / After Effects Project Card
  if (adobeProjectSummary) {
    const isPr = adobeProjectSummary.app === 'pr';
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex flex-col justify-center cursor-pointer group/preview p-4 rounded select-none border overflow-hidden ${
          isPr
            ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
            : 'bg-indigo-950/20 border-indigo-500/30 text-indigo-200'
        } ${className}`}
        title="Click to open Timeline Inspector"
      >
        <div className="flex items-center gap-2 mb-2">
          {isPr ? (
            <Film size={16} className="text-purple-400 shrink-0" />
          ) : (
            <Layers size={16} className="text-indigo-400 shrink-0" />
          )}
          <span className="font-semibold text-xs text-white truncate">
            {adobeProjectSummary.title}
          </span>
        </div>
        <div className="space-y-1 font-mono text-[10px] text-gray-300">
          {adobeProjectSummary.details.map((line, idx) => (
            <div key={idx} className="truncate text-gray-400 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
              <span>{line}</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/30 flex items-center justify-center transition-colors">
          <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity bg-purple-600/90 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <Eye size={13} />
            <span>Open Timeline Studio</span>
          </div>
        </div>
      </div>
    );
  }

  // 7. Render CAD 3D Mesh Card (STEP, STL, OBJ, IFC)
  if (cad3dSummary) {
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex flex-col items-center justify-center cursor-pointer group/preview p-4 rounded bg-sky-950/20 border border-sky-500/20 text-center select-none overflow-hidden ${className}`}
        title="Click to open 3D CAD Viewport"
      >
        <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 mb-2 group-hover/preview:scale-110 transition-transform">
          <Box size={26} />
        </div>
        <div className="text-xs font-semibold text-white truncate max-w-full px-2">
          {cad3dSummary.title}
        </div>
        <div className="text-[10px] font-mono text-sky-400 font-bold uppercase tracking-wider mt-1">
          {cad3dSummary.format} 3D Mesh
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/30 flex items-center justify-center transition-colors">
          <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity bg-sky-600/90 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <Eye size={13} />
            <span>Open 3D Studio</span>
          </div>
        </div>
      </div>
    );
  }

  // 8. Render SysVis Diagrams Card (MMD, FLOW, ARCH)
  if (sysvisSummary) {
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex flex-col items-center justify-center cursor-pointer group/preview p-4 rounded bg-indigo-500/10 dark:bg-indigo-950/20 border border-indigo-500/20 text-center select-none overflow-hidden ${className}`}
        title="Click to open Diagram Studio"
      >
        <div className="w-12 h-12 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2 group-hover/preview:scale-110 transition-transform">
          <Workflow size={26} />
        </div>
        <div className="text-xs font-semibold text-slate-800 dark:text-white truncate max-w-full px-2">
          {sysvisSummary.diagramType}
        </div>
        <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mt-1">
          {sysvisSummary.format} Flow Animator
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/30 flex items-center justify-center transition-colors">
          <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity bg-indigo-600/90 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <Eye size={13} />
            <span>Open Flow Chart</span>
          </div>
        </div>
      </div>
    );
  }

  // 9. Render Archive Directory Card (ZIP, TAR, GZ)
  if (archiveSummary) {
    return (
      <div
        onClick={onOpenQuickLook}
        className={`relative w-full h-full flex flex-col justify-center cursor-pointer group/preview p-3.5 rounded bg-amber-500/5 border border-amber-500/20 select-none overflow-hidden ${className}`}
        title="Click to inspect archive contents"
      >
        <div className="flex items-center gap-2 mb-2 text-amber-500 font-semibold text-xs">
          <FolderArchive size={16} />
          <span>{archiveSummary.fileCount} items compressed</span>
        </div>
        <div className="space-y-1 font-mono text-[10px] text-gray-300">
          {archiveSummary.sampleFiles.map((fname, i) => (
            <div key={i} className="truncate flex items-center gap-1.5 text-gray-400">
              <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">{fname}</span>
            </div>
          ))}
          {archiveSummary.fileCount > 3 && (
            <div className="text-[9px] text-gray-500 italic">
              +{archiveSummary.fileCount - 3} more files...
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/30 flex items-center justify-center transition-colors">
          <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity bg-amber-600/90 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <Eye size={13} />
            <span>Inspect Archive</span>
          </div>
        </div>
      </div>
    );
  }

  // 10. Render Code & Config Snippet with Prism Highlighting
  if (textContent) {
    const highlightedCode = (() => {
      try {
        const grammar = Prism.languages[codeLanguage] || Prism.languages.javascript;
        return Prism.highlight(textContent, grammar, codeLanguage);
      } catch {
        return textContent;
      }
    })();

    return (
      <div
        onClick={onOpenQuickLook}
        className={`w-full h-full bg-[#181818] p-2.5 overflow-hidden text-[10px] font-mono leading-relaxed text-gray-300 select-text cursor-pointer relative group ${className}`}
        title="Click to view full preview"
      >
        <pre
          className="overflow-hidden whitespace-pre-wrap break-all font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#181818] to-transparent pointer-events-none flex items-end justify-center pb-0.5">
          <span className="text-[9px] text-blue-400 font-sans font-medium bg-[#252526]/90 px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Click for Full Code Studio
          </span>
        </div>
      </div>
    );
  }

  return <FileIcon item={item} size={54} />;
};

/**
 * Renders scaled vector paths of 2D CAD blueprint (DXF / DWG) onto an offscreen canvas
 */
function renderMiniCadBlueprint(
  model: any,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(2, 2);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Subtle CAD Blueprint Grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.5;
  const gridSize = 16;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const { minX, minY, width: bWidth, height: bHeight } = model.bounds;
  if (!bWidth || !bHeight || bWidth <= 0 || bHeight <= 0) return canvas;

  const padding = 14;
  const scale = Math.min(
    (width - padding * 2) / bWidth,
    (height - padding * 2) / bHeight
  );
  const offsetX = (width - bWidth * scale) / 2 - minX * scale;
  const offsetY = (height - bHeight * scale) / 2 + (minY + bHeight) * scale;

  ctx.lineWidth = 1;
  const entities = model.entities || [];

  for (const ent of entities) {
    ctx.strokeStyle = ent.color || '#38bdf8';

    if (ent.type === 'LINE' && ent.vertices && ent.vertices.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(
        ent.vertices[0].x * scale + offsetX,
        offsetY - ent.vertices[0].y * scale
      );
      ctx.lineTo(
        ent.vertices[1].x * scale + offsetX,
        offsetY - ent.vertices[1].y * scale
      );
      ctx.stroke();
    } else if (ent.type === 'CIRCLE' && ent.center && ent.radius) {
      ctx.beginPath();
      ctx.arc(
        ent.center.x * scale + offsetX,
        offsetY - ent.center.y * scale,
        ent.radius * scale,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    } else if (ent.type === 'ARC' && ent.center && ent.radius) {
      ctx.beginPath();
      ctx.arc(
        ent.center.x * scale + offsetX,
        offsetY - ent.center.y * scale,
        ent.radius * scale,
        ent.startAngle || 0,
        ent.endAngle || Math.PI * 2
      );
      ctx.stroke();
    } else if (
      (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') &&
      ent.vertices &&
      ent.vertices.length > 0
    ) {
      ctx.beginPath();
      ent.vertices.forEach((v: any, i: number) => {
        const px = v.x * scale + offsetX;
        const py = offsetY - v.y * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }

  return canvas;
}
