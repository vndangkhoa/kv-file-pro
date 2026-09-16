/**
 * Adobe InDesign (.indd, .indt, .idml) Decoder
 * Extracts embedded XMP page previews, fonts, swatches, page counts, and IDML package structures.
 */
import JSZip from 'jszip';

export interface InddPagePreview {
  pageNumber: number;
  imageUrl: string;
  width?: number;
  height?: number;
}

export interface DecodedInddResult {
  previewUrl?: string;
  pages: InddPagePreview[];
  creatorTool?: string;
  pageCount: number;
  fonts: string[];
  swatches: string[];
  stories?: string[];
  metadata: Record<string, string>;
  isIdml: boolean;
}

export async function decodeInddFile(buffer: ArrayBuffer, isIdml = false): Promise<DecodedInddResult> {
  if (isIdml) {
    return decodeIdmlPackage(buffer);
  }

  const bytes = new Uint8Array(buffer);
  // Search for XMP packet in the binary file
  // XMP usually sits within <?xpacket begin ... <?xpacket end
  const text = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 524288)));

  const pages: InddPagePreview[] = [];
  let previewUrl: string | undefined;

  // 1. Extract XMP Thumbnails (<xmpGImg:image> ... </xmpGImg:image>)
  const thumbRegex = /<xmpGImg:image>([\s\S]*?)<\/xmpGImg:image>/gi;
  let tMatch: RegExpExecArray | null;
  let pageNum = 1;
  while ((tMatch = thumbRegex.exec(text)) !== null) {
    const rawBase64 = tMatch[1].replace(/\s+/g, '');
    if (rawBase64.length > 50) {
      const url = `data:image/jpeg;base64,${rawBase64}`;
      if (!previewUrl) previewUrl = url;
      pages.push({
        pageNumber: pageNum++,
        imageUrl: url,
      });
    }
  }

  // Fallback: If no XMP image found, scan binary for embedded JPEG marker (FF D8 FF E0 or FF D8 FF E1)
  if (!previewUrl) {
    for (let i = 0; i < Math.min(bytes.length - 100, 2097152); i++) {
      if (
        bytes[i] === 0xff &&
        bytes[i + 1] === 0xd8 &&
        bytes[i + 2] === 0xff &&
        (bytes[i + 3] === 0xe0 || bytes[i + 3] === 0xe1)
      ) {
        // Find approximate end of JPEG (FF D9)
        let end = -1;
        for (let j = i + 10; j < Math.min(bytes.length - 1, i + 524288); j++) {
          if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
            end = j + 2;
            break;
          }
        }
        if (end > i) {
          const blob = new Blob([bytes.subarray(i, end)], { type: 'image/jpeg' });
          previewUrl = URL.createObjectURL(blob);
          pages.push({
            pageNumber: 1,
            imageUrl: previewUrl,
          });
          break;
        }
      }
    }
  }

  // 2. Extract Document Metadata
  const creatorMatch = text.match(/<xmp:CreatorTool>(.*?)<\/xmp:CreatorTool>/i);
  const creatorTool = creatorMatch ? creatorMatch[1].trim() : 'Adobe InDesign';

  const pagesMatch = text.match(/<xmpTPg:NPages>(.*?)<\/xmpTPg:NPages>/i);
  const pageCount = pagesMatch ? parseInt(pagesMatch[1], 10) || 1 : Math.max(pages.length, 1);

  // Extract Fonts
  const fonts: string[] = [];
  const fontMatches = text.matchAll(/<stFnt:fontName>(.*?)<\/stFnt:fontName>/gi);
  for (const m of fontMatches) {
    const f = m[1].trim();
    if (f && !fonts.includes(f)) fonts.push(f);
  }

  // Extract Plate / Swatch Names
  const swatches: string[] = [];
  // Scan within PlateNames block if possible
  const plateBlockMatch = text.match(/<xmpTPg:PlateNames>([\s\S]*?)<\/xmpTPg:PlateNames>/i);
  if (plateBlockMatch) {
    const plateMatches = plateBlockMatch[1].matchAll(/<rdf:li>(.*?)<\/rdf:li>/gi);
    for (const pm of plateMatches) {
      const s = pm[1].trim();
      if (s && !swatches.includes(s)) swatches.push(s);
    }
  }

  const metadata: Record<string, string> = {};
  metadata['Application'] = creatorTool;
  metadata['Page Count'] = `${pageCount} page${pageCount > 1 ? 's' : ''}`;
  if (fonts.length > 0) metadata['Active Fonts'] = `${fonts.length} detected`;
  if (swatches.length > 0) metadata['Color Plates'] = swatches.join(', ');

  return {
    previewUrl,
    pages,
    creatorTool,
    pageCount,
    fonts,
    swatches,
    metadata,
    isIdml: false,
  };
}

/**
 * Parses InDesign Markup Language (.idml) ZIP package
 */
async function decodeIdmlPackage(buffer: ArrayBuffer): Promise<DecodedInddResult> {
  const zip = await JSZip.loadAsync(buffer);
  const metadata: Record<string, string> = { Format: 'InDesign Markup Package (IDML)' };
  const fonts: string[] = [];
  const swatches: string[] = [];
  const stories: string[] = [];

  // 1. Check Resources/Fonts.xml
  const fontsXmlFile = zip.file('Resources/Fonts.xml');
  if (fontsXmlFile) {
    const xml = await fontsXmlFile.async('text');
    const fontNames = xml.matchAll(/FontFamily="([^"]+)"/g);
    for (const fn of fontNames) {
      if (fn[1] && !fonts.includes(fn[1])) fonts.push(fn[1]);
    }
  }

  // 2. Check Resources/Graphic.xml (Color swatches)
  const graphicXmlFile = zip.file('Resources/Graphic.xml');
  if (graphicXmlFile) {
    const xml = await graphicXmlFile.async('text');
    const colors = xml.matchAll(/Color Self="Color\/([^"]+)"/g);
    for (const c of colors) {
      if (c[1] && !swatches.includes(c[1])) swatches.push(decodeURIComponent(c[1]));
    }
  }

  // 3. Check Stories snippets
  const storyFiles = Object.keys(zip.files).filter((k) => k.startsWith('Stories/Story_'));
  for (let i = 0; i < Math.min(storyFiles.length, 10); i++) {
    const sFile = zip.file(storyFiles[i]);
    if (sFile) {
      const xml = await sFile.async('text');
      const textMatches = xml.matchAll(/<Content>([^<]+)<\/Content>/g);
      let snippet = '';
      for (const tm of textMatches) {
        snippet += tm[1] + ' ';
        if (snippet.length > 150) break;
      }
      if (snippet.trim()) stories.push(snippet.trim());
    }
  }

  // 4. Count spreads
  const spreadFiles = Object.keys(zip.files).filter((k) => k.startsWith('Spreads/Spread_'));
  metadata['Spreads'] = `${spreadFiles.length} layout spread${spreadFiles.length > 1 ? 's' : ''}`;
  metadata['Stories'] = `${storyFiles.length} text stories`;

  return {
    previewUrl: undefined,
    pages: [],
    creatorTool: 'Adobe InDesign (IDML Engine)',
    pageCount: spreadFiles.length || 1,
    fonts,
    swatches,
    stories,
    metadata,
    isIdml: true,
  };
}
