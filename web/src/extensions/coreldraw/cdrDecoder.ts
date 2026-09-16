/**
 * CorelDRAW (.cdr, .cdt, .cdx, .cmx) In-Browser Decoder
 * Extracts embedded raster preview artwork (PNG/BMP), page counts,
 * Dublin Core metadata, and CorelDRAW application version telemetry.
 */
import JSZip from 'jszip';

export interface DecodedCdrResult {
  previewUrl?: string;
  title: string;
  version: string;
  creator: string;
  pageCount: number;
  width?: string;
  height?: string;
  colorModel?: string;
  metadata: Record<string, string>;
  isLegacyRiff: boolean;
}

/**
 * Creates a valid BMP Blob URL from raw DIB (BITMAPINFOHEADER + pixel array)
 */
function createBmpUrlFromDib(dibBytes: Uint8Array): string {
  const headerSize = dibBytes[0] | (dibBytes[1] << 8) | (dibBytes[2] << 16) | (dibBytes[3] << 24);
  const bitCount = dibBytes[14] | (dibBytes[15] << 8);
  
  let paletteSize = 0;
  if (bitCount <= 8) {
    const clrUsed = dibBytes[32] | (dibBytes[33] << 8) | (dibBytes[34] << 16) | (dibBytes[35] << 24);
    paletteSize = (clrUsed > 0 ? clrUsed : 1 << bitCount) * 4;
  }

  const pixelOffset = 14 + headerSize + paletteSize;
  const totalFileSize = 14 + dibBytes.length;

  const bmpBuffer = new Uint8Array(totalFileSize);
  // 'BM'
  bmpBuffer[0] = 0x42;
  bmpBuffer[1] = 0x4d;
  // Total size
  bmpBuffer[2] = totalFileSize & 0xff;
  bmpBuffer[3] = (totalFileSize >> 8) & 0xff;
  bmpBuffer[4] = (totalFileSize >> 16) & 0xff;
  bmpBuffer[5] = (totalFileSize >> 24) & 0xff;
  // Reserved (0)
  bmpBuffer[6] = 0;
  bmpBuffer[7] = 0;
  bmpBuffer[8] = 0;
  bmpBuffer[9] = 0;
  // Pixel offset
  bmpBuffer[10] = pixelOffset & 0xff;
  bmpBuffer[11] = (pixelOffset >> 8) & 0xff;
  bmpBuffer[12] = (pixelOffset >> 16) & 0xff;
  bmpBuffer[13] = (pixelOffset >> 24) & 0xff;
  // Copy DIB content
  bmpBuffer.set(dibBytes, 14);

  const blob = new Blob([bmpBuffer], { type: 'image/bmp' });
  return URL.createObjectURL(blob);
}

export async function decodeCdrFile(buffer: ArrayBuffer): Promise<DecodedCdrResult> {
  const metadata: Record<string, string> = {};
  let previewUrl: string | undefined;
  let title = 'CorelDRAW Vector Graphic';
  let version = 'CorelDRAW';
  let creator = 'Unknown';
  let pageCount = 1;
  let width: string | undefined;
  let height: string | undefined;
  let colorModel: string | undefined;

  // 1. Try decoding modern CorelDRAW format (X4 / v14 to 2024+ PKZip container)
  try {
    const zip = await JSZip.loadAsync(buffer);

    // Look for pre-rendered raster thumbnails
    const previewCandidates = [
      'previews/thumbnail.png',
      'previews/thumbnail.bmp',
      'previews/page1.png',
      'previews/page0.png',
      'preview.png',
      'thumbnail.png',
      'thumbnail.bmp',
    ];

    for (const candidate of previewCandidates) {
      const file = zip.file(candidate);
      if (file) {
        const mime = candidate.endsWith('.bmp') ? 'image/bmp' : 'image/png';
        const blob = await file.async('blob');
        previewUrl = URL.createObjectURL(new Blob([blob], { type: mime }));
        break;
      }
    }

    // Inspect metadata.xml (Dublin Core & Corel schema)
    const metaFile = zip.file('metadata/metadata.xml');
    if (metaFile) {
      try {
        const xmlText = await metaFile.async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        const titleNode = xmlDoc.querySelector('title, dc\\:title');
        if (titleNode?.textContent?.trim()) {
          title = titleNode.textContent.trim();
        }

        const creatorNode = xmlDoc.querySelector('creator, dc\\:creator');
        if (creatorNode?.textContent?.trim()) {
          creator = creatorNode.textContent.trim();
        }

        const createdDate = xmlDoc.querySelector('created, dcterms\\:created');
        if (createdDate?.textContent?.trim()) {
          metadata['Creation Date'] = new Date(createdDate.textContent.trim()).toLocaleString();
        }

        const modifiedDate = xmlDoc.querySelector('modified, dcterms\\:modified');
        if (modifiedDate?.textContent?.trim()) {
          metadata['Last Modified'] = new Date(modifiedDate.textContent.trim()).toLocaleString();
        }

        const pagesNode = xmlDoc.querySelector('Pages, pageCount');
        if (pagesNode?.textContent?.trim()) {
          const parsedPages = parseInt(pagesNode.textContent.trim(), 10);
          if (!isNaN(parsedPages) && parsedPages > 0) pageCount = parsedPages;
        }

        const widthNode = xmlDoc.querySelector('Width, page-width');
        const heightNode = xmlDoc.querySelector('Height, page-height');
        if (widthNode?.textContent?.trim() && heightNode?.textContent?.trim()) {
          width = widthNode.textContent.trim();
          height = heightNode.textContent.trim();
          metadata['Page Dimensions'] = `${width} × ${height}`;
        }

        const colorNode = xmlDoc.querySelector('ColorModel, ColorSpace');
        if (colorNode?.textContent?.trim()) {
          colorModel = colorNode.textContent.trim().toUpperCase();
          metadata['Color Space'] = colorModel;
        }
      } catch {
        // XML parsing fallback
      }
    }

    // Inspect app.xml for CorelDRAW application version
    const appFile = zip.file('metadata/app.xml');
    if (appFile) {
      try {
        const appXmlText = await appFile.async('text');
        const parser = new DOMParser();
        const appDoc = parser.parseFromString(appXmlText, 'application/xml');

        const appVersion = appDoc.querySelector('AppVersion, Application');
        if (appVersion?.textContent?.trim()) {
          version = `CorelDRAW ${appVersion.textContent.trim()}`;
        }
      } catch {
        // App XML fallback
      }
    }

    // Inspect internal file list to provide telemetry
    const fileEntries = Object.keys(zip.files);
    metadata['Format Structure'] = 'Modern CorelDRAW Package (ZIP Container)';
    metadata['CorelDRAW Version'] = version;
    metadata['Document Title'] = title;
    metadata['Author'] = creator;
    metadata['Page Count'] = `${pageCount} page${pageCount > 1 ? 's' : ''}`;
    metadata['Embedded Package Files'] = `${fileEntries.length} items`;

    return {
      previewUrl,
      title,
      version,
      creator,
      pageCount,
      width,
      height,
      colorModel,
      metadata,
      isLegacyRiff: false,
    };
  } catch {
    // 2. Legacy RIFF-based CorelDRAW container (v6 - v13/X3)
    const bytes = new Uint8Array(buffer);
    if (bytes.length >= 12) {
      const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
      const formatId = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);

      if (magic === 'RIFF' && formatId.startsWith('CDR')) {
        let riffVersion = 'Legacy CorelDRAW (RIFF)';
        if (formatId === 'CDR4') riffVersion = 'CorelDRAW 4.0';
        else if (formatId === 'CDR5') riffVersion = 'CorelDRAW 5.0';
        else if (formatId === 'CDR6') riffVersion = 'CorelDRAW 6.0';
        else if (formatId === 'CDR7') riffVersion = 'CorelDRAW 7.0';
        else if (formatId === 'CDR8') riffVersion = 'CorelDRAW 8.0';
        else if (formatId === 'CDR9') riffVersion = 'CorelDRAW 9.0';
        else if (formatId === 'CDRA') riffVersion = 'CorelDRAW 10.0';
        else if (formatId === 'CDRB') riffVersion = 'CorelDRAW 11.0';
        else if (formatId === 'CDRC') riffVersion = 'CorelDRAW 12.0';
        else if (formatId === 'CDRD') riffVersion = 'CorelDRAW X3 (13.0)';

        metadata['Format Structure'] = `Legacy Binary RIFF (${formatId})`;
        metadata['CorelDRAW Version'] = riffVersion;

        // Search for 'DISP' chunk containing preview bitmap (DIB)
        for (let i = 12; i < Math.min(bytes.length - 12, 4194304); i++) {
          if (
            bytes[i] === 0x44 && // 'D'
            bytes[i + 1] === 0x49 && // 'I'
            bytes[i + 2] === 0x53 && // 'S'
            bytes[i + 3] === 0x50    // 'P'
          ) {
            const chunkSize = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
            const chunkDataOffset = i + 8;
            if (chunkSize > 40 && chunkDataOffset + chunkSize <= bytes.length) {
              try {
                let dibOffset = chunkDataOffset;
                const headerLen = bytes[dibOffset] | (bytes[dibOffset + 1] << 8) | (bytes[dibOffset + 2] << 16) | (bytes[dibOffset + 3] << 24);
                if (headerLen !== 40 && headerLen !== 108 && headerLen !== 124) {
                  dibOffset += 4;
                }
                const dibBytes = bytes.subarray(dibOffset, chunkDataOffset + chunkSize);
                previewUrl = createBmpUrlFromDib(dibBytes);
                metadata['Thumbnail Preview'] = `Extracted from DISP chunk (${Math.round(chunkSize / 1024)} KB)`;
              } catch {
                // Fallback if DIB is unaligned
              }
            }
            break;
          }
        }

        return {
          previewUrl,
          title: 'CorelDRAW RIFF Document',
          version: riffVersion,
          creator: 'Unknown',
          pageCount: 1,
          metadata,
          isLegacyRiff: true,
        };
      }
    }

    // Generic fallback if unknown container
    metadata['Format'] = 'CorelDRAW Drawing File';
    metadata['Status'] = 'Uncompressed or proprietary legacy binary format';
    return {
      previewUrl: undefined,
      title: 'CorelDRAW File',
      version: 'Unknown',
      creator: 'Unknown',
      pageCount: 1,
      metadata,
      isLegacyRiff: false,
    };
  }
}
