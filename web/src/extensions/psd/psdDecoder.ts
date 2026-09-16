import { readPsd, Layer } from 'ag-psd';

export interface LayerTextInfo {
  text: string;
  fontName?: string;
  fontSize?: number;
  colorHex?: string;
}

export interface DecodedLayer {
  id: string;
  parentId?: string;
  name: string;
  type: 'image' | 'vector' | 'text' | 'group' | 'adjustment';
  visible: boolean;
  opacity: number; // 0..100
  blendMode: string;
  canvas?: HTMLCanvasElement;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  depth: number;
  children?: DecodedLayer[];
  isGroup?: boolean;
  childCount?: number;
  textInfo?: LayerTextInfo;
  thumbnailUrl?: string;
  order: number;
}

export interface DecodedPsdResult {
  width: number;
  height: number;
  channels: number;
  depth: number;
  colorMode: number;
  colorModeName: string;
  compositeCanvas: HTMLCanvasElement;
  layers: DecodedLayer[];
  flatLayers: DecodedLayer[];
  layerCount: number;
  source: 'composite' | 'fallback_rle' | 'fallback_thumbnail';
}

const COLOR_MODES: Record<number, string> = {
  0: 'Bitmap',
  1: 'Grayscale',
  2: 'Indexed',
  3: 'RGB',
  4: 'CMYK',
  7: 'Multichannel',
  8: 'Duotone',
  9: 'Lab',
};

function rgbToHex(r?: number, g?: number, b?: number): string | undefined {
  if (r === undefined || g === undefined || b === undefined) return undefined;
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Recursively extracts real layers from ag-psd's layer tree
 */
function extractLayersRecursive(
  layers: Layer[],
  depth = 0,
  parentId?: string,
  state = { orderCounter: 0 }
): { list: DecodedLayer[]; flat: DecodedLayer[]; count: number } {
  const list: DecodedLayer[] = [];
  const flat: DecodedLayer[] = [];
  let count = 0;

  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const id = parentId ? `${parentId}_${i}` : `l_${i}_${(l.name || 'layer').replace(/\s+/g, '_')}`;
    const isGroup = Array.isArray(l.children) && l.children.length > 0;
    const isText = !!l.text;
    const layerType: DecodedLayer['type'] = isGroup
      ? 'group'
      : isText
      ? 'text'
      : l.canvas
      ? 'image'
      : 'adjustment';

    let textInfo: LayerTextInfo | undefined = undefined;
    if (l.text) {
      const txt = (l.text.text || '').replace(/\r\n|\r/g, '\n').trim();
      const style = l.text.style;
      const font = style?.font?.name;
      const fontSize = style?.fontSize;
      const fc = style?.fillColor as any;
      const colorHex =
        fc && typeof fc.r === 'number' ? rgbToHex(fc.r, fc.g, fc.b) : undefined;
      textInfo = {
        text: txt,
        fontName: font,
        fontSize: fontSize ? Math.round(fontSize) : undefined,
        colorHex,
      };
    }

    let subChildren: DecodedLayer[] | undefined = undefined;
    let groupChildCount = 0;

    if (isGroup && l.children) {
      const sub = extractLayersRecursive(l.children, depth + 1, id, state);
      subChildren = sub.list;
      groupChildCount = sub.count;
      count += sub.count;
      flat.push(...sub.flat);
    }

    count += 1;
    const order = state.orderCounter++;

    let thumbnailUrl: string | undefined = undefined;
    if (l.canvas && l.canvas.width > 0 && l.canvas.height > 0) {
      try {
        const thumbCanvas = document.createElement('canvas');
        const maxThumb = 36;
        const scale = Math.min(maxThumb / l.canvas.width, maxThumb / l.canvas.height, 1);
        const tw = Math.max(1, Math.round(l.canvas.width * scale));
        const th = Math.max(1, Math.round(l.canvas.height * scale));
        thumbCanvas.width = tw;
        thumbCanvas.height = th;
        const tctx = thumbCanvas.getContext('2d');
        if (tctx) {
          tctx.drawImage(l.canvas, 0, 0, tw, th);
          thumbnailUrl = thumbCanvas.toDataURL();
        }
      } catch {
        // ignore thumbnail generation failure
      }
    }

    const decoded: DecodedLayer = {
      id,
      parentId,
      name: l.name || (isGroup ? 'Group' : `Layer ${i + 1}`),
      type: layerType,
      visible: !l.hidden,
      opacity: Math.round((l.opacity ?? 1) * 100),
      blendMode: (l.blendMode || 'normal').toUpperCase(),
      canvas: l.canvas,
      left: l.left,
      top: l.top,
      width: l.right !== undefined && l.left !== undefined ? Math.max(0, l.right - l.left) : undefined,
      height: l.bottom !== undefined && l.top !== undefined ? Math.max(0, l.bottom - l.top) : undefined,
      depth,
      children: subChildren,
      isGroup,
      childCount: groupChildCount,
      textInfo,
      thumbnailUrl,
      order,
    };

    list.push(decoded);
    flat.push(decoded);
  }

  return { list, flat, count };
}

/**
 * PackBits RLE unpacker (Apple / TIFF standard)
 */
function unpackPackBits(data: Uint8Array, expectedLen: number): Uint8Array {
  const out = new Uint8Array(expectedLen);
  let inIdx = 0;
  let outIdx = 0;

  while (inIdx < data.length && outIdx < expectedLen) {
    const b = data[inIdx++];
    if (b < 128) {
      const count = b + 1;
      for (let k = 0; k < count && inIdx < data.length && outIdx < expectedLen; k++) {
        out[outIdx++] = data[inIdx++];
      }
    } else if (b > 128) {
      const count = 256 - b + 1;
      if (inIdx < data.length) {
        const val = data[inIdx++];
        for (let k = 0; k < count && outIdx < expectedLen; k++) {
          out[outIdx++] = val;
        }
      }
    }
  }
  return out;
}

/**
 * Fallback: Pure TypeScript PackBits RLE composite decoder for Section 5
 */
export function decodePackBitsComposite(buffer: ArrayBuffer): HTMLCanvasElement | null {
  try {
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);

    const channels = view.getUint16(12);
    const height = view.getUint32(14);
    const width = view.getUint32(18);

    // Color mode section
    let offset = 26;
    const colorModeLen = view.getUint32(offset);
    offset += 4 + colorModeLen;

    // Image resources section
    const resLen = view.getUint32(offset);
    offset += 4 + resLen;

    // Layer & mask section
    const lmLen = view.getUint32(offset);
    offset += 4 + lmLen;

    // Section 5: Composite image data
    const compression = view.getUint16(offset);
    offset += 2;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let i = 3; i < pixels.length; i += 4) {
      pixels[i] = 255;
    }

    if (compression === 0) {
      const planeSize = width * height;
      const rPlane = offset;
      const gPlane = offset + planeSize;
      const bPlane = offset + planeSize * 2;
      for (let i = 0; i < planeSize; i++) {
        pixels[i * 4] = u8[rPlane + i] ?? 0;
        pixels[i * 4 + 1] = u8[gPlane + i] ?? 0;
        pixels[i * 4 + 2] = u8[bPlane + i] ?? 0;
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas;
    }

    if (compression === 1) {
      const numLines = height * channels;
      const scanlineByteCounts: number[] = [];
      for (let i = 0; i < numLines; i++) {
        scanlineByteCounts.push(view.getUint16(offset));
        offset += 2;
      }

      const planeBuffers: Uint8Array[] = [];
      for (let c = 0; c < Math.min(channels, 4); c++) {
        const planeData = new Uint8Array(width * height);
        let planeOffset = 0;
        for (let y = 0; y < height; y++) {
          const bc = scanlineByteCounts[c * height + y];
          const chunk = u8.subarray(offset, offset + bc);
          offset += bc;
          const unpacked = unpackPackBits(chunk, width);
          planeData.set(unpacked, planeOffset);
          planeOffset += width;
        }
        planeBuffers.push(planeData);
      }

      const r = planeBuffers[0];
      const g = planeBuffers[1] || r;
      const b = planeBuffers[2] || r;
      const a = planeBuffers[3];

      for (let i = 0; i < width * height; i++) {
        pixels[i * 4] = r[i] ?? 0;
        pixels[i * 4 + 1] = g[i] ?? 0;
        pixels[i * 4 + 2] = b[i] ?? 0;
        if (a) {
          pixels[i * 4 + 3] = a[i];
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas;
    }
  } catch (err) {
    console.warn('PackBits composite fallback decode failed:', err);
  }
  return null;
}

/**
 * Fallback: Extract embedded JPEG thumbnail from Resource 1036 (0x040c)
 */
export function extractEmbeddedJpegThumbnail(buffer: ArrayBuffer): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    try {
      const view = new DataView(buffer);
      const u8 = new Uint8Array(buffer);

      let offset = 26;
      const colorModeLen = view.getUint32(offset);
      offset += 4 + colorModeLen;

      const resLen = view.getUint32(offset);
      const resEnd = offset + 4 + resLen;
      offset += 4;

      while (offset < resEnd - 12) {
        const sig = String.fromCharCode(u8[offset], u8[offset + 1], u8[offset + 2], u8[offset + 3]);
        if (sig !== '8BIM') {
          offset++;
          continue;
        }
        const resId = view.getUint16(offset + 4);
        const nameLen = u8[offset + 6];
        const nameTotal = nameLen + 1 + ((nameLen + 1) % 2 !== 0 ? 1 : 0);
        const dataSizeIdx = offset + 6 + nameTotal;
        const dataSize = view.getUint32(dataSizeIdx);
        const dataStart = dataSizeIdx + 4;

        if (resId === 1036 && dataSize > 28) {
          const jpegLen = view.getUint32(dataStart + 20);
          const jpegData = u8.subarray(dataStart + 28, dataStart + 28 + jpegLen);
          const blob = new Blob([jpegData], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              URL.revokeObjectURL(url);
              resolve(canvas);
            } else {
              URL.revokeObjectURL(url);
              resolve(null);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
          return;
        }
        offset = dataStart + dataSize + (dataSize % 2 !== 0 ? 1 : 0);
      }
      resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Main PSD parser with ag-psd and automatic fallbacks
 */
export async function decodePsdFile(buffer: ArrayBuffer): Promise<DecodedPsdResult> {
  const view = new DataView(buffer);
  const channels = view.getUint16(12);
  const height = view.getUint32(14);
  const width = view.getUint32(18);
  const depth = view.getUint16(22);
  const colorMode = view.getUint16(24);
  const colorModeName = COLOR_MODES[colorMode] || 'RGB';

  let compositeCanvas: HTMLCanvasElement | null = null;
  let decodedLayers: DecodedLayer[] = [];
  let flatLayers: DecodedLayer[] = [];
  let totalLayerCount = 0;
  let source: DecodedPsdResult['source'] = 'composite';

  // 1. Primary decoder: ag-psd
  try {
    const psd = readPsd(buffer, {
      skipLayerImageData: false,
      skipThumbnail: true,
    });

    if (psd.canvas) {
      compositeCanvas = psd.canvas;
      source = 'composite';
    }

    if (psd.children && psd.children.length > 0) {
      const extracted = extractLayersRecursive(psd.children);
      decodedLayers = extracted.list;
      flatLayers = extracted.flat;
      totalLayerCount = extracted.count;
    }
  } catch (agErr) {
    console.warn('ag-psd parsing failed, attempting fallback decoders:', agErr);
  }

  // 2. Fallback: Native PackBits RLE composite decoder if canvas wasn't parsed
  if (!compositeCanvas) {
    compositeCanvas = decodePackBitsComposite(buffer);
    if (compositeCanvas) {
      source = 'fallback_rle';
    }
  }

  // 3. Fallback: Embedded JPEG thumbnail if composite wasn't decoded
  if (!compositeCanvas) {
    compositeCanvas = await extractEmbeddedJpegThumbnail(buffer);
    if (compositeCanvas) {
      source = 'fallback_thumbnail';
    }
  }

  if (!compositeCanvas) {
    throw new Error('Could not decode PSD composite image or embedded thumbnail.');
  }

  return {
    width: width || compositeCanvas.width,
    height: height || compositeCanvas.height,
    channels: channels || 3,
    depth: depth || 8,
    colorMode,
    colorModeName,
    compositeCanvas,
    layers: decodedLayers,
    flatLayers,
    layerCount: totalLayerCount,
    source,
  };
}

/**
 * Map Photoshop blend modes to HTML5 Canvas globalCompositeOperation
 */
export function mapBlendModeToCompositeOp(blendMode: string): GlobalCompositeOperation {
  const mode = (blendMode || 'normal').toLowerCase().replace(/[\s_-]+/g, '');
  switch (mode) {
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'overlay':
      return 'overlay';
    case 'darken':
      return 'darken';
    case 'lighten':
      return 'lighten';
    case 'colordodge':
      return 'color-dodge';
    case 'colorburn':
      return 'color-burn';
    case 'hardlight':
      return 'hard-light';
    case 'softlight':
      return 'soft-light';
    case 'difference':
      return 'difference';
    case 'exclusion':
      return 'exclusion';
    case 'hue':
      return 'hue';
    case 'saturation':
      return 'saturation';
    case 'color':
      return 'color';
    case 'luminosity':
      return 'luminosity';
    case 'normal':
    case 'passthrough':
    default:
      return 'source-over';
  }
}

/**
 * Dynamically re-composites visible layers in bottom-to-top drawing order
 */
export function renderDynamicLayers(
  psd: DecodedPsdResult,
  hiddenLayerIds: Set<string>,
  soloLayerId: string | null
): HTMLCanvasElement {
  const { width, height, layers } = psd;

  // When all layers are visible and no solo mode: return pristine Adobe composite
  if (hiddenLayerIds.size === 0 && !soloLayerId) {
    return psd.compositeCanvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return psd.compositeCanvas;

  // Keep canvas transparent so artboard checkerboard frame shows through
  ctx.clearRect(0, 0, width, height);

  const isSoloActive = !!soloLayerId;

  // Collect raster items in draw order
  const drawQueue: {
    layer: DecodedLayer;
    effectiveOpacity: number;
  }[] = [];

  function walk(
    list: DecodedLayer[],
    parentVisible: boolean,
    parentOpacity: number,
    inSoloBranch: boolean
  ) {
    for (const l of list) {
      const selfHidden = hiddenLayerIds.has(l.id);
      const isVisible = parentVisible && !selfHidden;
      const isSoloMatch = isSoloActive && (l.id === soloLayerId || inSoloBranch);
      const effectiveOpacity = parentOpacity * (l.opacity / 100);

      if (l.isGroup && l.children) {
        walk(l.children, isVisible, effectiveOpacity, inSoloBranch || l.id === soloLayerId);
      } else if (l.canvas) {
        const shouldDraw = isSoloActive ? isSoloMatch : isVisible;
        if (shouldDraw) {
          drawQueue.push({
            layer: l,
            effectiveOpacity,
          });
        }
      }
    }
  }

  walk(layers, true, 1, false);

  for (const item of drawQueue) {
    const { layer, effectiveOpacity } = item;
    if (!layer.canvas) continue;

    const x = layer.left ?? 0;
    const y = layer.top ?? 0;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, effectiveOpacity));
    ctx.globalCompositeOperation = mapBlendModeToCompositeOp(layer.blendMode);
    ctx.drawImage(layer.canvas, x, y);
    ctx.restore();
  }

  return canvas;
}
