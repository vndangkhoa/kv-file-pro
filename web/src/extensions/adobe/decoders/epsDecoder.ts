/**
 * Encapsulated PostScript (.eps) Decoder
 * Multi-tier engine supporting:
 * 1. Embedded XMP High-Res Thumbnail (<xmpGImg:image>)
 * 2. DOS Binary EPS Header (0xC5D0D3C6) with TIFF IFD unpacker (Uncompressed, PackBits, JPEG)
 * 3. EPSI ASCII Hex Bitmap Preview (%%BeginPreview)
 * 4. Embedded Raw JPEG Stream Scanner (FF D8 FF)
 * 5. Document Structuring Conventions (DSC) Metadata Parser
 * 6. Client-Side PostScript 2D Vector Path Canvas Interpreter Fallback
 */

export interface DecodedEpsResult {
  previewUrl?: string;
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  hasBinaryHeader: boolean;
  previewType: 'xmp' | 'tiff' | 'epsi' | 'jpeg-stream' | 'vector-render' | 'none';
  creator?: string;
  title?: string;
  creationDate?: string;
  forUser?: string;
  languageLevel?: string;
  boundingBox?: [number, number, number, number];
  hiResBoundingBox?: [number, number, number, number];
  colors: string[];
  swatches: string[];
  metadata: Record<string, string>;
}

export async function decodeEpsFile(buffer: ArrayBuffer): Promise<DecodedEpsResult> {
  const bytes = new Uint8Array(buffer);
  const metadata: Record<string, string> = {
    Format: 'Encapsulated PostScript (EPS)',
  };

  let previewUrl: string | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let previewType: DecodedEpsResult['previewType'] = 'none';

  // -------------------------------------------------------------
  // 1. Inspect DOS EPS 30-byte Binary Header (0xC5D0D3C6)
  // -------------------------------------------------------------
  let psOffset = 0;
  let psLength = bytes.length;
  let isBinaryHeader = false;

  if (bytes.length >= 30) {
    // Check magic signature: C5 D0 D3 C6
    if (bytes[0] === 0xc5 && bytes[1] === 0xd0 && bytes[2] === 0xd3 && bytes[3] === 0xc6) {
      isBinaryHeader = true;
      const view = new DataView(buffer);
      psOffset = view.getUint32(4, true);
      psLength = view.getUint32(8, true);
      const wmfOffset = view.getUint32(12, true);
      const wmfLength = view.getUint32(16, true);
      const tiffOffset = view.getUint32(20, true);
      const tiffLength = view.getUint32(24, true);

      metadata['Binary Header'] = 'DOS EPS Binary (0xC5D0D3C6)';
      metadata['PostScript Offset'] = `${psOffset} bytes (${psLength} bytes long)`;

      if (tiffOffset > 0 && tiffLength > 0 && tiffOffset + tiffLength <= bytes.length) {
        metadata['Embedded TIFF Preview'] = `${tiffLength} bytes at offset ${tiffOffset}`;
        const tiffBytes = bytes.subarray(tiffOffset, tiffOffset + tiffLength);
        
        // Attempt decoding TIFF
        const decodedTiff = decodeTiffPreview(tiffBytes);
        if (decodedTiff) {
          canvas = decodedTiff.canvas;
          width = decodedTiff.width;
          height = decodedTiff.height;
          previewType = 'tiff';
        } else {
          // Fallback: create direct TIFF blob URL (supported on Safari / WebKit)
          const tiffBlob = new Blob([tiffBytes], { type: 'image/tiff' });
          previewUrl = URL.createObjectURL(tiffBlob);
          previewType = 'tiff';
        }
      } else if (wmfOffset > 0 && wmfLength > 0) {
        metadata['Embedded WMF Preview'] = `${wmfLength} bytes at offset ${wmfOffset}`;
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Decode Text Header & Document Structuring Conventions (DSC)
  // -------------------------------------------------------------
  const psSlice = bytes.subarray(psOffset, Math.min(bytes.length, psOffset + 524288));
  const headerText = new TextDecoder('latin1').decode(psSlice);

  // Check for XMP Metadata & Base64 JPEG Thumbnail (<xmpGImg:image>)
  if (!canvas && !previewUrl) {
    const xmpMatch = headerText.match(/<xmpGImg:image>([\s\S]*?)<\/xmpGImg:image>/i);
    if (xmpMatch && xmpMatch[1]) {
      const cleanBase64 = xmpMatch[1].replace(/\s+/g, '');
      previewUrl = `data:image/jpeg;base64,${cleanBase64}`;
      previewType = 'xmp';
      metadata['Preview Source'] = 'Adobe XMP Embedded Thumbnail (JPEG)';
    }
  }

  // Check for EPSI ASCII Hex Preview (%%BeginPreview: W H Depth Lines)
  if (!canvas && !previewUrl) {
    const epsiMatch = headerText.match(/%%BeginPreview:\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)([\s\S]*?)%%EndPreview/i);
    if (epsiMatch) {
      const pWidth = parseInt(epsiMatch[1], 10);
      const pHeight = parseInt(epsiMatch[2], 10);
      const pDepth = parseInt(epsiMatch[3], 10);
      const hexData = epsiMatch[5].replace(/[^0-9a-fA-F]/g, '');
      const epsiCanvas = renderEpsiBitmap(pWidth, pHeight, pDepth, hexData);
      if (epsiCanvas) {
        canvas = epsiCanvas;
        width = pWidth;
        height = pHeight;
        previewType = 'epsi';
        metadata['Preview Source'] = `EPSI Interchange Preview (${pWidth}x${pHeight}, ${pDepth}-bit)`;
      }
    }
  }

  // Check for Raw Embedded JPEG stream in binary (FF D8 FF ... FF D9)
  if (!canvas && !previewUrl) {
    for (let i = 0; i < Math.min(bytes.length - 100, 8388608); i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
        let end = -1;
        for (let j = i + 100; j < Math.min(bytes.length - 1, i + 4194304); j++) {
          if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
            end = j + 2;
            break;
          }
        }
        if (end > i + 1024) {
          const jpegBlob = new Blob([bytes.subarray(i, end)], { type: 'image/jpeg' });
          previewUrl = URL.createObjectURL(jpegBlob);
          previewType = 'jpeg-stream';
          metadata['Preview Source'] = 'Raw Embedded JPEG Stream';
          break;
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 3. Extract Document Structuring Conventions (DSC) Metadata
  // -------------------------------------------------------------
  const titleMatch = headerText.match(/%%Title:\s*([^\r\n]+)/);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  if (title) metadata['Title'] = title;

  const creatorMatch = headerText.match(/%%Creator:\s*([^\r\n]+)/);
  const creator = creatorMatch ? creatorMatch[1].trim() : undefined;
  if (creator) metadata['Creator'] = creator;

  const dateMatch = headerText.match(/%%CreationDate:\s*([^\r\n]+)/);
  const creationDate = dateMatch ? dateMatch[1].trim() : undefined;
  if (creationDate) metadata['Creation Date'] = creationDate;

  const forMatch = headerText.match(/%%For:\s*([^\r\n]+)/);
  const forUser = forMatch ? forMatch[1].trim() : undefined;
  if (forUser) metadata['For User'] = forUser;

  const langMatch = headerText.match(/%%LanguageLevel:\s*(\d+)/);
  const languageLevel = langMatch ? `PostScript Level ${langMatch[1]}` : 'PostScript Level 2';
  metadata['Language Level'] = languageLevel;

  // BoundingBox: llx lly urx ury
  let boundingBox: [number, number, number, number] | undefined;
  const bboxMatch = headerText.match(/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
  if (bboxMatch) {
    boundingBox = [
      parseInt(bboxMatch[1], 10),
      parseInt(bboxMatch[2], 10),
      parseInt(bboxMatch[3], 10),
      parseInt(bboxMatch[4], 10),
    ];
    const bW = Math.abs(boundingBox[2] - boundingBox[0]);
    const bH = Math.abs(boundingBox[3] - boundingBox[1]);
    metadata['BoundingBox'] = `${boundingBox.join(' ')} (${bW} x ${bH} pt)`;
    if (!width) width = bW;
    if (!height) height = bH;
  }

  // HiResBoundingBox
  let hiResBoundingBox: [number, number, number, number] | undefined;
  const hiResMatch = headerText.match(/%%HiResBoundingBox:\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)/);
  if (hiResMatch) {
    hiResBoundingBox = [
      parseFloat(hiResMatch[1]),
      parseFloat(hiResMatch[2]),
      parseFloat(hiResMatch[3]),
      parseFloat(hiResMatch[4]),
    ];
    metadata['HiRes BoundingBox'] = `${hiResBoundingBox.map(n => n.toFixed(2)).join(' ')}`;
  }

  // Extract Colors and Swatches
  const swatches: string[] = [];
  const colors: string[] = [];
  const procColorsMatch = headerText.match(/%%DocumentProcessColors:\s*([^\r\n]+)/);
  if (procColorsMatch) {
    const pColors = procColorsMatch[1].trim().split(/\s+/);
    pColors.forEach(c => colors.push(c));
    metadata['Process Colors'] = pColors.join(', ');
  }

  const customColorsMatch = headerText.matchAll(/%%DocumentCustomColors:\s*\((.*?)\)/g);
  for (const m of customColorsMatch) {
    if (m[1]) {
      swatches.push(m[1]);
      colors.push(m[1]);
    }
  }

  // -------------------------------------------------------------
  // 4. Lightweight Client-Side PostScript 2D Vector Path Fallback
  // -------------------------------------------------------------
  if (!canvas && !previewUrl && boundingBox) {
    const fullPs = new TextDecoder('latin1').decode(bytes.subarray(psOffset, psOffset + psLength));
    const vectorCanvas = renderPostScriptVectorFallback(fullPs, boundingBox);
    if (vectorCanvas) {
      canvas = vectorCanvas;
      previewType = 'vector-render';
      metadata['Preview Source'] = 'Client-Side Vector Path Interpreter';
    }
  }

  return {
    previewUrl,
    canvas,
    width,
    height,
    hasBinaryHeader: isBinaryHeader,
    previewType,
    creator,
    title,
    creationDate,
    forUser,
    languageLevel,
    boundingBox,
    hiResBoundingBox,
    colors,
    swatches,
    metadata,
  };
}

// =============================================================
// Helper: Decode TIFF Preview (Uncompressed, PackBits, Palette)
// =============================================================
function decodeTiffPreview(
  bytes: Uint8Array
): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  if (bytes.length < 8) return null;
  const isLE = bytes[0] === 0x49 && bytes[1] === 0x49; // 'II' = Intel Little Endian
  const isBE = bytes[0] === 0x4d && bytes[1] === 0x4d; // 'MM' = Motorola Big Endian
  if (!isLE && !isBE) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint16(2, isLE);
  if (magic !== 42) return null;

  const firstIfdOffset = view.getUint32(4, isLE);
  if (firstIfdOffset >= bytes.length) return null;

  let width = 0;
  let height = 0;
  let bitsPerSample = 8;
  let samplesPerPixel = 1;
  let compression = 1; // 1 = None, 32773 = PackBits, 7 = JPEG
  let photometric = 2; // 0/1 = Grayscale, 2 = RGB, 3 = Palette, 5 = CMYK
  let stripOffsets: number[] = [];
  let stripByteCounts: number[] = [];
  let colorMap: number[] = [];

  const numEntries = view.getUint16(firstIfdOffset, isLE);
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = firstIfdOffset + 2 + i * 12;
    if (entryOffset + 12 > bytes.length) break;

    const tag = view.getUint16(entryOffset, isLE);
    const type = view.getUint16(entryOffset + 2, isLE);
    const count = view.getUint32(entryOffset + 4, isLE);
    const valOrOffset = view.getUint32(entryOffset + 8, isLE);

    if (tag === 256) width = valOrOffset; // ImageWidth
    if (tag === 257) height = valOrOffset; // ImageLength
    if (tag === 258) bitsPerSample = type === 3 ? view.getUint16(entryOffset + 8, isLE) : valOrOffset;
    if (tag === 259) compression = valOrOffset; // Compression
    if (tag === 262) photometric = valOrOffset; // PhotometricInterpretation
    if (tag === 277) samplesPerPixel = type === 3 ? view.getUint16(entryOffset + 8, isLE) : valOrOffset; // SamplesPerPixel

    if (tag === 273) {
      // StripOffsets
      if (count === 1) {
        stripOffsets = [valOrOffset];
      } else if (valOrOffset + count * 4 <= bytes.length) {
        stripOffsets = [];
        for (let c = 0; c < count; c++) {
          stripOffsets.push(
            type === 3 ? view.getUint16(valOrOffset + c * 2, isLE) : view.getUint32(valOrOffset + c * 4, isLE)
          );
        }
      }
    }

    if (tag === 279) {
      // StripByteCounts
      if (count === 1) {
        stripByteCounts = [valOrOffset];
      } else if (valOrOffset + count * 4 <= bytes.length) {
        stripByteCounts = [];
        for (let c = 0; c < count; c++) {
          stripByteCounts.push(
            type === 3 ? view.getUint16(valOrOffset + c * 2, isLE) : view.getUint32(valOrOffset + c * 4, isLE)
          );
        }
      }
    }

    if (tag === 320 && valOrOffset + count * 2 <= bytes.length) {
      // ColorMap
      colorMap = [];
      for (let c = 0; c < count; c++) {
        colorMap.push(view.getUint16(valOrOffset + c * 2, isLE));
      }
    }
  }

  if (width <= 0 || height <= 0 || stripOffsets.length === 0) return null;

  // Unpack pixel data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(width, height);
  const out = imgData.data;

  // Gather raw strip bytes
  const rawBytesList: Uint8Array[] = [];
  for (let s = 0; s < stripOffsets.length; s++) {
    const sOff = stripOffsets[s];
    const sLen = stripByteCounts[s] || (bytes.length - sOff);
    if (sOff + sLen <= bytes.length) {
      const slice = bytes.subarray(sOff, sOff + sLen);
      if (compression === 32773) {
        // Decompress PackBits
        rawBytesList.push(unpackPackBits(slice));
      } else {
        rawBytesList.push(slice);
      }
    }
  }

  const totalLen = rawBytesList.reduce((acc, b) => acc + b.length, 0);
  const combined = new Uint8Array(totalLen);
  let writeOffset = 0;
  for (const b of rawBytesList) {
    combined.set(b, writeOffset);
    writeOffset += b.length;
  }

  let srcIdx = 0;
  let dstIdx = 0;
  const totalPixels = width * height;

  if (bitsPerSample === 1) {
    // 1-bit monochrome bitmap
    const bytesPerRow = Math.ceil((width * samplesPerPixel) / 8);
    for (let y = 0; y < height; y++) {
      const rowStart = y * bytesPerRow;
      for (let x = 0; x < width; x++) {
        const byteVal = combined[rowStart + (x >> 3)] || 0;
        const bit = (byteVal >> (7 - (x & 7))) & 1;
        let val = bit ? 255 : 0;
        if (photometric === 0) val = 255 - val;
        out[dstIdx] = val;
        out[dstIdx + 1] = val;
        out[dstIdx + 2] = val;
        out[dstIdx + 3] = 255;
        dstIdx += 4;
      }
    }
  } else if (photometric === 2) {
    // RGB 24-bit, RGBA 32-bit, or RGB with extra channels
    for (let p = 0; p < totalPixels && srcIdx < combined.length; p++) {
      out[dstIdx] = combined[srcIdx++]; // R
      out[dstIdx + 1] = combined[srcIdx++]; // G
      out[dstIdx + 2] = combined[srcIdx++]; // B
      out[dstIdx + 3] = samplesPerPixel >= 4 ? combined[srcIdx++] : 255; // A
      for (let extra = 4; extra < samplesPerPixel; extra++) srcIdx++;
      dstIdx += 4;
    }
  } else if (photometric === 3 && colorMap.length > 0) {
    // Palette color (Supports Sample 0: Index, Sample 1: Alpha)
    const numColors = colorMap.length / 3;
    for (let p = 0; p < totalPixels && srcIdx < combined.length; p++) {
      const idx = combined[srcIdx++];
      const alpha = samplesPerPixel >= 2 ? combined[srcIdx++] : 255;
      for (let extra = 2; extra < samplesPerPixel; extra++) srcIdx++;

      if (idx < numColors) {
        out[dstIdx] = Math.round((colorMap[idx] / 65535) * 255);
        out[dstIdx + 1] = Math.round((colorMap[idx + numColors] / 65535) * 255);
        out[dstIdx + 2] = Math.round((colorMap[idx + numColors * 2] / 65535) * 255);
        out[dstIdx + 3] = alpha;
      } else {
        out[dstIdx] = 0;
        out[dstIdx + 1] = 0;
        out[dstIdx + 2] = 0;
        out[dstIdx + 3] = 0;
      }
      dstIdx += 4;
    }
  } else if (photometric === 5) {
    // CMYK (Cyan, Magenta, Yellow, Black)
    for (let p = 0; p < totalPixels && srcIdx < combined.length; p++) {
      const c = combined[srcIdx++];
      const m = combined[srcIdx++];
      const y = combined[srcIdx++];
      const k = combined[srcIdx++];
      const alpha = samplesPerPixel >= 5 ? combined[srcIdx++] : 255;
      for (let extra = 5; extra < samplesPerPixel; extra++) srcIdx++;

      out[dstIdx] = Math.round(255 * (1 - c / 255) * (1 - k / 255));
      out[dstIdx + 1] = Math.round(255 * (1 - m / 255) * (1 - k / 255));
      out[dstIdx + 2] = Math.round(255 * (1 - y / 255) * (1 - k / 255));
      out[dstIdx + 3] = alpha;
      dstIdx += 4;
    }
  } else if (photometric === 0 || photometric === 1) {
    // Grayscale / Grayscale + Alpha
    for (let p = 0; p < totalPixels && srcIdx < combined.length; p++) {
      let g = combined[srcIdx++];
      const alpha = samplesPerPixel >= 2 ? combined[srcIdx++] : 255;
      for (let extra = 2; extra < samplesPerPixel; extra++) srcIdx++;

      if (photometric === 0) g = 255 - g; // 0 is white
      out[dstIdx] = g;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = g;
      out[dstIdx + 3] = alpha;
      dstIdx += 4;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { canvas, width, height };
}

// PackBits Decompressor
function unpackPackBits(src: Uint8Array): Uint8Array {
  const dest: number[] = [];
  let i = 0;
  while (i < src.length) {
    const n = (src[i] << 24) >> 24; // cast to signed int8
    i++;
    if (n >= 0 && n <= 127) {
      for (let count = 0; count <= n && i < src.length; count++) {
        dest.push(src[i++]);
      }
    } else if (n >= -127 && n <= -1) {
      if (i < src.length) {
        const val = src[i++];
        for (let count = 0; count <= -n; count++) {
          dest.push(val);
        }
      }
    }
  }
  return new Uint8Array(dest);
}

// =============================================================
// Helper: Render EPSI Bitmap (%%BeginPreview)
// =============================================================
function renderEpsiBitmap(
  w: number,
  h: number,
  depth: number,
  hex: string
): HTMLCanvasElement | null {
  if (w <= 0 || h <= 0 || !hex) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(w, h);
  const out = imgData.data;

  if (depth === 1) {
    let hexPos = 0;
    let dstIdx = 0;
    const bytesPerRow = Math.ceil(w / 8);

    for (let y = 0; y < h; y++) {
      for (let b = 0; b < bytesPerRow; b++) {
        const byteVal = parseInt(hex.substring(hexPos, hexPos + 2), 16) || 0;
        hexPos += 2;
        for (let bit = 7; bit >= 0; bit--) {
          const x = b * 8 + (7 - bit);
          if (x < w) {
            const isBlack = (byteVal & (1 << bit)) !== 0;
            const val = isBlack ? 0 : 255;
            out[dstIdx] = val;
            out[dstIdx + 1] = val;
            out[dstIdx + 2] = val;
            out[dstIdx + 3] = isBlack ? 255 : 0; // Transparent background
            dstIdx += 4;
          }
        }
      }
    }
  } else if (depth === 8) {
    let hexPos = 0;
    let dstIdx = 0;
    for (let p = 0; p < w * h; p++) {
      const g = parseInt(hex.substring(hexPos, hexPos + 2), 16) || 0;
      hexPos += 2;
      out[dstIdx] = g;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = g;
      out[dstIdx + 3] = 255;
      dstIdx += 4;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// =============================================================
// Helper: Lightweight PostScript 2D Path Vector Interpreter
// =============================================================
function renderPostScriptVectorFallback(
  psCode: string,
  bbox: [number, number, number, number]
): HTMLCanvasElement | null {
  const [llx, lly, urx, ury] = bbox;
  const bbW = Math.abs(urx - llx);
  const bbH = Math.abs(ury - lly);
  if (bbW <= 0 || bbH <= 0 || bbW > 8000 || bbH > 8000) return null;

  // Scale for crisp retina display
  const scale = Math.min(2.0, 1600 / Math.max(bbW, bbH));
  const cW = Math.max(1, Math.round(bbW * scale));
  const cH = Math.max(1, Math.round(bbH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cW;
  canvas.height = cH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // PS uses bottom-left origin; convert to top-left canvas origin
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-llx, ury);
  ctx.scale(1, -1); // Invert Y axis

  // Defaults
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;

  // Tokenize PostScript stream (numbers and operators)
  const tokens = psCode
    .replace(/%[^\r\n]*/g, ' ') // Strip single-line comments
    .match(/([^\s()<>\[\]{}]+|\([^)]*\)|<[^>]*>)/g) || [];

  const stack: (number | string)[] = [];
  let pathOpCount = 0;

  for (let i = 0; i < Math.min(tokens.length, 50000); i++) {
    const tok = tokens[i];
    const num = parseFloat(tok);

    if (!isNaN(num) && /^-?[0-9.]+$/.test(tok)) {
      stack.push(num);
    } else {
      // Standard PostScript 2D Operators
      switch (tok) {
        case 'newpath':
          ctx.beginPath();
          break;
        case 'moveto':
        case 'm':
          if (stack.length >= 2) {
            const y = Number(stack.pop());
            const x = Number(stack.pop());
            ctx.moveTo(x, y);
            pathOpCount++;
          }
          break;
        case 'lineto':
        case 'l':
          if (stack.length >= 2) {
            const y = Number(stack.pop());
            const x = Number(stack.pop());
            ctx.lineTo(x, y);
            pathOpCount++;
          }
          break;
        case 'curveto':
        case 'c':
          if (stack.length >= 6) {
            const y3 = Number(stack.pop());
            const x3 = Number(stack.pop());
            const y2 = Number(stack.pop());
            const x2 = Number(stack.pop());
            const y1 = Number(stack.pop());
            const x1 = Number(stack.pop());
            ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
            pathOpCount++;
          }
          break;
        case 'closepath':
        case 'cp':
        case 'h':
          ctx.closePath();
          break;
        case 'fill':
        case 'f':
        case 'F':
          ctx.fill();
          ctx.beginPath();
          break;
        case 'stroke':
        case 's':
        case 'S':
          ctx.stroke();
          ctx.beginPath();
          break;
        case 'setrgbcolor':
        case 'rg':
        case 'RG':
          if (stack.length >= 3) {
            const b = Math.round(Number(stack.pop()) * 255);
            const g = Math.round(Number(stack.pop()) * 255);
            const r = Math.round(Number(stack.pop()) * 255);
            const col = `rgb(${r}, ${g}, ${b})`;
            ctx.fillStyle = col;
            ctx.strokeStyle = col;
          }
          break;
        case 'setcmykcolor':
        case 'k':
        case 'K':
          if (stack.length >= 4) {
            const blk = Number(stack.pop());
            const y = Number(stack.pop());
            const m = Number(stack.pop());
            const c = Number(stack.pop());
            const r = Math.round(255 * (1 - c) * (1 - blk));
            const g = Math.round(255 * (1 - m) * (1 - blk));
            const b = Math.round(255 * (1 - y) * (1 - blk));
            const col = `rgb(${r}, ${g}, ${b})`;
            ctx.fillStyle = col;
            ctx.strokeStyle = col;
          }
          break;
        case 'setgray':
        case 'g':
        case 'G':
          if (stack.length >= 1) {
            const gVal = Math.round(Number(stack.pop()) * 255);
            const col = `rgb(${gVal}, ${gVal}, ${gVal})`;
            ctx.fillStyle = col;
            ctx.strokeStyle = col;
          }
          break;
        case 'setlinewidth':
        case 'w':
        case 'W':
          if (stack.length >= 1) {
            ctx.lineWidth = Number(stack.pop());
          }
          break;
        case 'gsave':
          ctx.save();
          break;
        case 'grestore':
          ctx.restore();
          break;
        case 'scale':
          if (stack.length >= 2) {
            const sy = Number(stack.pop());
            const sx = Number(stack.pop());
            ctx.scale(sx, sy);
          }
          break;
        case 'translate':
          if (stack.length >= 2) {
            const ty = Number(stack.pop());
            const tx = Number(stack.pop());
            ctx.translate(tx, ty);
          }
          break;
        case 'rectfill':
          if (stack.length >= 4) {
            const h = Number(stack.pop());
            const w = Number(stack.pop());
            const y = Number(stack.pop());
            const x = Number(stack.pop());
            ctx.fillRect(x, y, w, h);
            pathOpCount++;
          }
          break;
        case 'rectstroke':
          if (stack.length >= 4) {
            const h = Number(stack.pop());
            const w = Number(stack.pop());
            const y = Number(stack.pop());
            const x = Number(stack.pop());
            ctx.strokeRect(x, y, w, h);
            pathOpCount++;
          }
          break;
        default:
          // Keep stack small to prevent memory leaks from unknown macros
          if (stack.length > 20) stack.shift();
          break;
      }
    }
  }

  ctx.restore();
  return pathOpCount > 0 ? canvas : null;
}
