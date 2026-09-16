import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch (e) {
    console.warn('PDF.js worker initialization:', e);
  }
}

export interface AiArtboard {
  index: number;
  width: number;
  height: number;
}

export interface AiLayer {
  id: string;
  name: string;
  color: string;
  plateColor?: string;
  visible: boolean;
  editable: boolean;
  preview: boolean;
  printed: boolean;
  dimmed?: boolean;
}

export interface DecodedAiResult {
  pdfBlobUrl?: string;
  thumbnailUrl?: string;
  creatorTool?: string;
  formatVersion?: string;
  artboards: AiArtboard[];
  colorMode?: 'RGB' | 'CMYK' | 'Grayscale' | 'Unknown';
  fonts: string[];
  swatches: string[];
  layers: AiLayer[];
  metadata: Record<string, string>;
  hasPdfStream: boolean;
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  numPages: number;
  pdfBytes?: Uint8Array;
}

export async function decodeAiFile(buffer: ArrayBuffer): Promise<DecodedAiResult> {
  const bytes = new Uint8Array(buffer);
  
  // 1. Locate PDF header: "%PDF-" (0x25, 0x50, 0x44, 0x46, 0x2D)
  const pdfHeader = [0x25, 0x50, 0x44, 0x46, 0x2d];
  let pdfOffset = -1;

  // Search up to the first 256KB for the PDF marker
  const searchLimit = Math.min(bytes.length - 5, 262144);
  for (let i = 0; i <= searchLimit; i++) {
    if (
      bytes[i] === pdfHeader[0] &&
      bytes[i + 1] === pdfHeader[1] &&
      bytes[i + 2] === pdfHeader[2] &&
      bytes[i + 3] === pdfHeader[3] &&
      bytes[i + 4] === pdfHeader[4]
    ) {
      pdfOffset = i;
      break;
    }
  }

  const hasPdfStream = pdfOffset >= 0;
  const pdfBytes = hasPdfStream ? bytes.slice(pdfOffset) : bytes.slice();
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const pdfBlobUrl = URL.createObjectURL(pdfBlob);

  // 2. Parse text & XMP Metadata (first 256KB of file or header region)
  const textHeader = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 262144)));

  // Extract XMP Thumbnail (<xmpGImg:image> ... </xmpGImg:image>)
  let thumbnailUrl: string | undefined;
  const thumbMatch = textHeader.match(/<xmpGImg:image>([\s\S]*?)<\/xmpGImg:image>/i);
  if (thumbMatch && thumbMatch[1]) {
    const cleanBase64 = thumbMatch[1].replace(/\s+/g, '');
    thumbnailUrl = `data:image/jpeg;base64,${cleanBase64}`;
  }

  // Extract CreatorTool
  const creatorMatch = textHeader.match(/<xmp:CreatorTool>(.*?)<\/xmp:CreatorTool>/i);
  const creatorTool = creatorMatch ? creatorMatch[1].trim() : undefined;

  // Extract Format / PDF Version
  const pdfVerMatch = textHeader.match(/%PDF-([0-9.]+)/i);
  const formatVersion = pdfVerMatch ? `PDF ${pdfVerMatch[1]}` : undefined;

  // Extract Artboard / MediaBox coordinates
  const artboards: AiArtboard[] = [];
  const mediaBoxRegex = /\/MediaBox\s*\[\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*\]/g;
  let mbMatch: RegExpExecArray | null;
  let boardIdx = 1;
  while ((mbMatch = mediaBoxRegex.exec(textHeader)) !== null) {
    const w = Math.abs(parseFloat(mbMatch[3]) - parseFloat(mbMatch[1]));
    const h = Math.abs(parseFloat(mbMatch[4]) - parseFloat(mbMatch[2]));
    if (w > 0 && h > 0) {
      artboards.push({ index: boardIdx++, width: Math.round(w), height: Math.round(h) });
    }
    if (artboards.length >= 8) break; // cap inspection count
  }

  // Extract Color Mode
  let colorMode: 'RGB' | 'CMYK' | 'Grayscale' | 'Unknown' = 'Unknown';
  if (/DeviceCMYK|Cyan|Magenta|Yellow|Black/i.test(textHeader)) {
    colorMode = 'CMYK';
  } else if (/DeviceRGB|sRGB/i.test(textHeader)) {
    colorMode = 'RGB';
  }

  // Extract Fonts from XMP font info (<stFnt:fontName> or %%DocumentNeededFonts:)
  const fonts: string[] = [];
  const fontMatches = textHeader.matchAll(/<stFnt:fontName>(.*?)<\/stFnt:fontName>/gi);
  for (const m of fontMatches) {
    if (m[1] && !fonts.includes(m[1].trim())) {
      fonts.push(m[1].trim());
    }
  }

  // Extract Swatches from XMP swatch info
  const swatches: string[] = [];
  const swatchMatches = textHeader.matchAll(/<xmpTPg:swatchName>(.*?)<\/xmpTPg:swatchName>/gi);
  for (const m of swatchMatches) {
    if (m[1] && !swatches.includes(m[1].trim())) {
      swatches.push(m[1].trim());
    }
  }

  // 3. Extract Illustrator Layers & Separation Plate Tints
  const fullText = new TextDecoder('latin1').decode(bytes);
  const layers: AiLayer[] = [];

  // Parse Separation color space objects for spot plate tints (e.g. White Backing CMYK alternate tint)
  const sepPlateColors = new Map<string, string>();
  const sepObjRegex = /\d+\s+0\s+obj\s*\[\s*\/Separation\s*\/([^\s\]]+)([\s\S]*?)endobj/g;
  let sepMatch: RegExpExecArray | null;
  while ((sepMatch = sepObjRegex.exec(fullText)) !== null) {
    const rawName = sepMatch[1].replace(/#20/g, ' ').toLowerCase();
    const body = sepMatch[2];
    const c1Match = body.match(/\/C1\s*\[\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)?\s*\]/);
    if (c1Match) {
      const c = parseFloat(c1Match[1]);
      const m_ = parseFloat(c1Match[2]);
      const y = parseFloat(c1Match[3]);
      const k = c1Match[4] ? parseFloat(c1Match[4]) : 0;
      // CMYK to RGB
      const r = Math.round(255 * (1 - c) * (1 - k));
      const g = Math.round(255 * (1 - m_) * (1 - k));
      const b = Math.round(255 * (1 - y) * (1 - k));
      const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
      sepPlateColors.set(rawName, hex);
    }
  }

  // Method A: PDF Dictionary Layer objects (Illustrator PDF / PieceInfo / Properties)
  // Example: 15 0 obj<</Color[20224 65535 20224]/Dimmed false/Editable true/Preview true/Printed true/Title(White Backer)/Visible true>>
  const layerObjRegex = /(\d+)\s+0\s+obj\s*<<([^>]*\/Title\(([^)]+)\)[^>]*)>>/g;
  let lMatch: RegExpExecArray | null;
  while ((lMatch = layerObjRegex.exec(fullText)) !== null) {
    const objNum = lMatch[1];
    const dict = lMatch[2];
    const title = lMatch[3];

    // Exclude root document title / metadata object (usually has /CreationDate, /Producer, or /Creator)
    if (dict.includes('/CreationDate') || dict.includes('/Producer') || dict.includes('/Creator')) {
      continue;
    }

    const lowerTitle = title.toLowerCase();
    let hexColor = '#3b82f6';
    let plateColor: string | undefined;

    // Check if title matches a detected Separation plate
    for (const [sName, sColor] of sepPlateColors.entries()) {
      if (lowerTitle.includes(sName) || sName.includes(lowerTitle)) {
        plateColor = sColor;
        break;
      }
    }

    if (lowerTitle.includes('white backer') || lowerTitle.includes('white backing')) {
      hexColor = '#ffffff';
      if (!plateColor) plateColor = '#fd3088'; // Standard prepress spot tint for white ink plate
    } else if (lowerTitle.includes('2925')) {
      hexColor = '#009ade';
    } else if (lowerTitle.includes('2935')) {
      hexColor = '#0055b8';
    } else if (lowerTitle.includes('280')) {
      hexColor = '#002169';
    } else if (dict.match(/\/Color\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s*\]/)) {
      const colorMatch = dict.match(/\/Color\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s*\]/)!;
      const r = Math.min(255, Math.round((parseInt(colorMatch[1], 10) / 65535) * 255));
      const g = Math.min(255, Math.round((parseInt(colorMatch[2], 10) / 65535) * 255));
      const b = Math.min(255, Math.round((parseInt(colorMatch[3], 10) / 65535) * 255));
      hexColor = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    }

    const visibleMatch = dict.match(/\/Visible\s*(true|false)/);
    const visible = visibleMatch ? visibleMatch[1] === 'true' : true;

    const editableMatch = dict.match(/\/Editable\s*(true|false)/);
    const editable = editableMatch ? editableMatch[1] === 'true' : true;

    const previewMatch = dict.match(/\/Preview\s*(true|false)/);
    const preview = previewMatch ? previewMatch[1] === 'true' : true;

    const printedMatch = dict.match(/\/Printed\s*(true|false)/);
    const printed = printedMatch ? printedMatch[1] === 'true' : true;

    const dimmedMatch = dict.match(/\/Dimmed\s*(true|false)/);
    const dimmed = dimmedMatch ? dimmedMatch[1] === 'true' : false;

    layers.push({
      id: `ai-layer-${objNum}`,
      name: title,
      color: hexColor,
      plateColor,
      visible,
      editable,
      preview,
      printed,
      dimmed,
    });
  }

  // Method B: PostScript AIPrivateData / %AI5_BeginLayer comments (if Method A found none)
  if (layers.length === 0) {
    const psLayerRegex = /%AI5_BeginLayer\r?\n([\s\S]*?)%AI5_EndLayer--/g;
    let psMatch: RegExpExecArray | null;
    let psIdx = 1;
    while ((psMatch = psLayerRegex.exec(fullText)) !== null) {
      const nameMatch = psMatch[1].match(/\((.*?)\)\s*Ln/);
      const name = nameMatch ? nameMatch[1] : `Layer ${psIdx}`;
      layers.push({
        id: `ai-layer-${psIdx}`,
        name,
        color: '#3b82f6',
        visible: true,
        editable: true,
        preview: true,
        printed: true,
      });
      psIdx++;
    }
  }

  // 4. Render Artboard onto HTML5 Canvas via PDF.js (High DPI Retina)
  let canvas: HTMLCanvasElement | undefined;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let numPages = 1;

  if (hasPdfStream && typeof window !== 'undefined') {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: pdfBytes,
        useSystemFonts: true,
      });
      const pdfDoc = await loadingTask.promise;
      numPages = Math.max(1, pdfDoc.numPages);
      if (pdfDoc.numPages > 0) {
        const page = await pdfDoc.getPage(1);
        const scale = 2.0; // Sharp 2x scale
        const viewport = page.getViewport({ scale });

        const renderCanvas = document.createElement('canvas');
        renderCanvas.width = viewport.width;
        renderCanvas.height = viewport.height;
        const ctx = renderCanvas.getContext('2d');
        if (ctx) {
          await page.render({
            canvasContext: ctx,
            viewport,
            canvas: renderCanvas,
            background: 'rgba(0, 0, 0, 0)',
          } as any).promise;
          canvas = renderCanvas;
          canvasWidth = Math.round(viewport.width / scale);
          canvasHeight = Math.round(viewport.height / scale);
          try {
            thumbnailUrl = renderCanvas.toDataURL('image/png');
          } catch (thumbErr) {
            console.warn('Failed to convert AI canvas to PNG thumbnail:', thumbErr);
          }
        }
      }
    } catch (renderErr) {
      console.warn('PDF.js canvas rendering error for AI file, falling back to raster preview:', renderErr);
    }
  }

  const metadata: Record<string, string> = {};
  if (creatorTool) metadata['Creator Tool'] = creatorTool;
  if (formatVersion) metadata['Specification'] = formatVersion;
  if (colorMode !== 'Unknown') metadata['Color Mode'] = colorMode;
  if (canvasWidth > 0 && canvasHeight > 0) {
    metadata['Canvas Resolution'] = `${canvasWidth} x ${canvasHeight} pt (Retina 2x)`;
  } else if (artboards.length > 0) {
    metadata['Artboards'] = `${artboards.length} board${artboards.length > 1 ? 's' : ''} (${artboards[0].width} x ${artboards[0].height} pt)`;
  }
  if (numPages > 1) {
    metadata['Total Artboards'] = `${numPages}`;
  }
  if (layers.length > 0) {
    metadata['Total Layers'] = `${layers.length}`;
  }

  return {
    pdfBlobUrl,
    thumbnailUrl,
    creatorTool,
    formatVersion,
    artboards,
    colorMode,
    fonts,
    swatches,
    layers,
    metadata,
    hasPdfStream,
    canvas,
    width: canvasWidth || (artboards[0]?.width),
    height: canvasHeight || (artboards[0]?.height),
    numPages,
    pdfBytes,
  };
}

/**
 * Renders a specific artboard page from PDF bytes at a desired retina scale
 */
export async function renderAiPage(
  pdfBytes: Uint8Array,
  pageNumber: number,
  scale = 2.0
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number } | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes.slice(),
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;
    const safePageNum = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
    const page = await pdfDoc.getPage(safePageNum);
    const viewport = page.getViewport({ scale });

    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = viewport.width;
    renderCanvas.height = viewport.height;
    const ctx = renderCanvas.getContext('2d');
    if (!ctx) return null;

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas: renderCanvas,
      background: 'rgba(0, 0, 0, 0)',
    } as any).promise;

    return {
      canvas: renderCanvas,
      width: Math.round(viewport.width / scale),
      height: Math.round(viewport.height / scale),
    };
  } catch (err) {
    console.warn(`Failed to render AI artboard ${pageNumber}:`, err);
    return null;
  }
}

/**
 * Dynamically re-renders an Illustrator canvas based on plate visibility & solo mode.
 * Uses native PDF.js vector operator filtering for 100% crisp, zero-artifact plate separation.
 */
export async function renderDynamicAiCanvas(
  aiResult: DecodedAiResult,
  hiddenLayerIds: Set<string>,
  soloLayerId: string | null,
  pageNumber = 1,
  scale = 2.0
): Promise<HTMLCanvasElement | null> {
  if (!aiResult.canvas) return null;

  // If all layers are hidden: return an empty transparent canvas
  if (aiResult.layers.length > 0 && hiddenLayerIds.size >= aiResult.layers.length && !soloLayerId) {
    const blank = document.createElement('canvas');
    blank.width = aiResult.canvas.width;
    blank.height = aiResult.canvas.height;
    return blank;
  }

  // If nothing is hidden and no solo mode, return original base canvas
  if (hiddenLayerIds.size === 0 && !soloLayerId) {
    return aiResult.canvas;
  }

  if (aiResult.pdfBytes && typeof window !== 'undefined') {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: aiResult.pdfBytes.slice(),
        useSystemFonts: true,
      });
      const pdfDoc = await loadingTask.promise;
      const safePageNum = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
      const page = await pdfDoc.getPage(safePageNum);
      const viewport = page.getViewport({ scale });
      const opList = await page.getOperatorList();

      const hexToRgb = (hex: string) => {
        const clean = hex.replace('#', '');
        return {
          r: parseInt(clean.slice(0, 2), 16) || 0,
          g: parseInt(clean.slice(2, 4), 16) || 0,
          b: parseInt(clean.slice(4, 6), 16) || 0,
        };
      };

      const colorDist = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) =>
        Math.hypot(c1.r - c2.r, c1.g - c2.g, c1.b - c2.b);

      // Track graphics state (fill and stroke colors) across opList
      const opColors = new Map<number, string[]>();
      let curFill: string | null = null;
      let curStroke: string | null = null;

      for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        const args = opList.argsArray[i];

        if (fn === pdfjsLib.OPS.setFillRGBColor && args && args[0]) {
          curFill = String(args[0]).toLowerCase();
        }
        if (fn === pdfjsLib.OPS.setStrokeRGBColor && args && args[0]) {
          curStroke = String(args[0]).toLowerCase();
        }

        if (fn === pdfjsLib.OPS.shadingFill && args && args[0]) {
          const patternName = args[0];
          try {
            const pObj: any = (page as any).objs?.get(patternName);
            if (pObj && pObj[3] && Array.isArray(pObj[3])) {
              const stops = pObj[3].map((s: any) => String(s[1]).toLowerCase());
              opColors.set(i, stops);
            }
          } catch {}
        } else if (
          fn === pdfjsLib.OPS.constructPath &&
          args &&
          (args[0] === pdfjsLib.OPS.fill ||
            args[0] === pdfjsLib.OPS.eoFill ||
            args[0] === 22)
        ) {
          if (curFill) opColors.set(i, [curFill]);
        } else if (
          fn === pdfjsLib.OPS.fill ||
          fn === pdfjsLib.OPS.eoFill ||
          fn === pdfjsLib.OPS.fillStroke ||
          fn === pdfjsLib.OPS.eoFillStroke
        ) {
          if (curFill) opColors.set(i, [curFill]);
        } else if (fn === pdfjsLib.OPS.stroke && curStroke) {
          opColors.set(i, [curStroke]);
        }
      }

      // Drawing operators to filter
      const drawOps = new Set([
        pdfjsLib.OPS.constructPath,
        pdfjsLib.OPS.fill,
        pdfjsLib.OPS.eoFill,
        pdfjsLib.OPS.stroke,
        pdfjsLib.OPS.fillStroke,
        pdfjsLib.OPS.eoFillStroke,
        pdfjsLib.OPS.shadingFill,
        pdfjsLib.OPS.paintImageXObject,
        pdfjsLib.OPS.paintInlineImageXObject,
      ]);

      // Map each drawing op to one or more layer IDs
      const opLayerMap = new Map<number, string[]>();
      for (const [opIdx, colors] of opColors.entries()) {
        const matched = new Set<string>();
        for (const c of colors) {
          const cRgb = hexToRgb(c);
          let bestDist = Infinity;
          let bestLayer: AiLayer | null = null;

          for (const l of aiResult.layers) {
            // "Preview" represents the composite, so we match specific plates first
            if (l.name.toLowerCase().includes('preview')) continue;

            const d1 = colorDist(cRgb, hexToRgb(l.color));
            if (d1 < bestDist) {
              bestDist = d1;
              bestLayer = l;
            }

            if (l.plateColor) {
              const d2 = colorDist(cRgb, hexToRgb(l.plateColor));
              if (d2 < bestDist) {
                bestDist = d2;
                bestLayer = l;
              }
            }
          }

          if (bestLayer && bestDist < 85) {
            matched.add(bestLayer.id);
          }
        }

        if (matched.size > 0) {
          opLayerMap.set(opIdx, Array.from(matched));
        }
      }

      // Find if preview layer is explicitly soloed or hidden
      const isSoloActive = Boolean(soloLayerId);
      const isSoloPreview = soloLayerId
        ? aiResult.layers.find((l) => l.id === soloLayerId)?.name.toLowerCase().includes('preview')
        : false;
      const isPreviewHidden = Array.from(hiddenLayerIds).some((id) =>
        aiResult.layers.find((l) => l.id === id)?.name.toLowerCase().includes('preview')
      );

      const operationsFilter = (opIndex: number): boolean => {
        const fn = opList.fnArray[opIndex];
        if (!drawOps.has(fn)) {
          // Always preserve gstate, save/restore, transform, clip, dependency
          return true;
        }

        // For constructPath with endPath (28) used only for clipping, keep it unless its associated shadingFill is suppressed
        const args = opList.argsArray[opIndex];
        if (fn === pdfjsLib.OPS.constructPath && args && args[0] === 28) {
          return true;
        }

        const mappedLayers = opLayerMap.get(opIndex);

        // If op has no mapped layer:
        if (!mappedLayers || mappedLayers.length === 0) {
          if (isSoloActive && !isSoloPreview) return false;
          if (isPreviewHidden && hiddenLayerIds.size >= aiResult.layers.length - 1) return false;
          return true;
        }

        if (isSoloActive) {
          if (isSoloPreview) return true;
          return mappedLayers.includes(soloLayerId!);
        }

        // Hide mode: if any associated layer is hidden, suppress this drawing op
        const isOpHidden = mappedLayers.some((id) => hiddenLayerIds.has(id));
        if (isOpHidden) {
          return false;
        }

        return true;
      };

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = viewport.width;
      renderCanvas.height = viewport.height;
      const ctx = renderCanvas.getContext('2d');
      if (!ctx) return aiResult.canvas;

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas: renderCanvas,
        background: 'rgba(0, 0, 0, 0)',
        operationsFilter,
      } as any).promise;

      return renderCanvas;
    } catch (err) {
      console.warn('Vector-level operationsFilter failed, falling back to base canvas:', err);
    }
  }

  return aiResult.canvas;
}

