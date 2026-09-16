/**
 * Adobe Digital Negative (.dng) Decoder
 * Scans TIFF IFD structure for embedded high-resolution JPEG previews and EXIF camera telemetry.
 */

export interface DecodedDngResult {
  previewUrl?: string;
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  iso?: string;
  shutterSpeed?: string;
  aperture?: string;
  metadata: Record<string, string>;
}

export function decodeDngFile(buffer: ArrayBuffer): DecodedDngResult {
  const bytes = new Uint8Array(buffer);
  let previewUrl: string | undefined;

  // 1. Scan binary for embedded JPEG marker (FF D8 FF)
  // DNG almost universally embeds a rendered JPEG preview for OS thumbnailing
  for (let i = 0; i < Math.min(bytes.length - 100, 16777216); i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      // Find end marker (FF D9)
      let end = -1;
      for (let j = i + 100; j < Math.min(bytes.length - 1, i + 8388608); j++) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          end = j + 2;
          break;
        }
      }
      if (end > i + 1024) {
        const jpegBytes = bytes.subarray(i, end);
        const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
        previewUrl = URL.createObjectURL(blob);
        break;
      }
    }
  }

  // 2. Scan ASCII strings for camera metadata
  const text = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 131072)));
  const metadata: Record<string, string> = {
    Format: 'Adobe Digital Negative (DNG RAW)',
  };

  const makeMatch = text.match(/<tiff:Make>(.*?)<\/tiff:Make>/i) || text.match(/(Sony|Canon|Nikon|Fujifilm|Leica|Apple|Hasselblad|Panasonic)/i);
  if (makeMatch) metadata['Camera Make'] = makeMatch[1].trim();

  const modelMatch = text.match(/<tiff:Model>(.*?)<\/tiff:Model>/i);
  if (modelMatch) metadata['Camera Model'] = modelMatch[1].trim();

  const lensMatch = text.match(/<aux:Lens>(.*?)<\/aux:Lens>/i);
  if (lensMatch) metadata['Lens'] = lensMatch[1].trim();

  const isoMatch = text.match(/<exif:ISOSpeedRatings>\s*<rdf:Seq>\s*<rdf:li>(\d+)<\/rdf:li>/i);
  if (isoMatch) metadata['ISO'] = isoMatch[1].trim();

  return {
    previewUrl,
    cameraMake: metadata['Camera Make'],
    cameraModel: metadata['Camera Model'],
    lens: metadata['Lens'],
    iso: metadata['ISO'],
    metadata,
  };
}
