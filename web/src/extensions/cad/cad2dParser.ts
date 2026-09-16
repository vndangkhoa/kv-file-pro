import DxfParser from 'dxf-parser';

export interface Cad2dEntity {
  type: 'LINE' | 'CIRCLE' | 'ARC' | 'LWPOLYLINE' | 'POLYLINE' | 'TEXT' | 'MTEXT' | 'POINT';
  layer: string;
  color?: string;
  vertices?: { x: number; y: number }[];
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  text?: string;
  position?: { x: number; y: number };
  height?: number;
  rotation?: number;
}

export interface Cad2dLayer {
  id: string;
  name: string;
  color: string;
  count: number;
  visible: boolean;
}

export interface Cad2dModel {
  entities: Cad2dEntity[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  };
  layers: Cad2dLayer[];
}

const ACI_PALETTE: Record<number, string> = {
  1: '#ef4444', // Red
  2: '#f59e0b', // Yellow
  3: '#16a34a', // Green
  4: '#06b6d4', // Cyan
  5: '#3b82f6', // Blue
  6: '#ec4899', // Magenta
  7: '#ffffff', // White (Adaptive ByLayer)
  8: '#6b7280', // Dark Gray
  9: '#9ca3af', // Light Gray
  20: '#ff3f00', // Orange / Red
  30: '#ea580c', // Dark Orange
  160: '#003fff', // Royal Blue
  172: '#0000cc', // Navy
};

export function parseCadColor(colorNum?: number, colorIndex?: number): string | undefined {
  if (colorNum != null && colorNum > 0 && colorNum !== 16777215) {
    const hex = (colorNum >>> 0).toString(16).padStart(6, '0');
    return `#${hex}`;
  }
  if (colorIndex != null && ACI_PALETTE[colorIndex]) {
    return ACI_PALETTE[colorIndex];
  }
  if (colorNum === 16777215 || colorIndex === 7) {
    return '#ffffff';
  }
  return undefined;
}

function cleanCadText(str: string): string {
  if (!str) return '';
  // 1. Decode Unicode escapes \U+XXXX e.g. \U+00B2 -> ², \U+2021 -> ‡
  let decoded = str.replace(/\\U\+([0-9a-fA-F]{4})/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  // 2. Decode standard AutoCAD symbol shortcuts
  decoded = decoded
    .replace(/%%c/gi, 'Ø')
    .replace(/%%d/gi, '°')
    .replace(/%%p/gi, '±')
    .replace(/%%u/gi, '')
    .replace(/%%o/gi, '');

  // 3. Decode Vietnamese TCVN3 / ABC codepage phrases
  const map: Record<string, string> = {
    'SÔ ÑOÀ ÑIEÄN KHAÙCH THUEÂ GF CUÕ': 'SƠ ĐỒ ĐIỆN KHÁCH THUÊ GF CUỐI',
    'SÔ ÑOÀ ÑIEÄN KHAÙCH THUEÂ GF CUOÁI': 'SƠ ĐỒ ĐIỆN KHÁCH THUÊ GF CUỐI',
    'SÔ ÑOÀ ÑIEÄN': 'SƠ ĐỒ ĐIỆN',
    'KHAÙCH THUEÂ': 'KHÁCH THUÊ',
  };
  for (const [k, v] of Object.entries(map)) {
    if (decoded.includes(k)) {
      decoded = decoded.split(k).join(v);
    }
  }

  // 4. Strip stray non-printable control characters
  decoded = decoded.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  return decoded.trim();
}

const LAYER_PALETTE = [
  '#16a34a', // Green (Columns)
  '#ff3f00', // Orange (Electrical circuits)
  '#06b6d4', // Cyan (Glass facade & stairs)
  '#ec4899', // Magenta (Counters)
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#6366f1', // Indigo
];

export async function parseCad2dFile(
  buffer: ArrayBuffer,
  ext: string,
  onProgress?: (msg: string) => void
): Promise<Cad2dModel> {
  const cleanExt = (ext || '').toLowerCase().replace(/^\./, '');
  let dxfText = '';

  if (cleanExt === 'dwg') {
    onProgress?.('Initializing LibreDWG WebAssembly decoder...');
    const { LibreDwg } = await import('@mlightcad/libredwg-web');
    onProgress?.('Decoding binary AutoCAD DWG stream...');
    const libredwg = await LibreDwg.create('/wasm');
    const dxfBytes = libredwg.dwg_write_dxf(buffer);
    if (!dxfBytes) {
      throw new Error('LibreDWG WebAssembly was unable to decode this DWG file.');
    }
    try {
      dxfText = new TextDecoder('windows-1252').decode(dxfBytes);
    } catch {
      dxfText = new TextDecoder('utf-8').decode(dxfBytes);
    }
  } else {
    onProgress?.('Decoding DXF ASCII text...');
    try {
      dxfText = new TextDecoder('windows-1252').decode(buffer);
    } catch {
      dxfText = new TextDecoder('utf-8').decode(buffer);
    }
  }

  onProgress?.('Parsing CAD entities and layer structure...');
  const parser = new DxfParser();
  const parsed = parser.parseSync(dxfText);

  // Extract layer color definitions
  const layerTable = parsed && (parsed as any).tables?.layer?.layers;
  const layerColorMap: Record<string, string> = {};
  if (layerTable) {
    for (const [name, l] of Object.entries(layerTable as Record<string, any>)) {
      const col = parseCadColor(l.color, l.colorIndex);
      if (col) {
        layerColorMap[name] = col;
      }
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const entities: Cad2dEntity[] = [];
  const layerCounts: Record<string, number> = {};

  if (parsed && parsed.entities && Array.isArray(parsed.entities)) {
    for (const rawEnt of parsed.entities) {
      const e = rawEnt as any;
      const layer = e.layer || '0';
      layerCounts[layer] = (layerCounts[layer] || 0) + 1;

      const entityColor = parseCadColor(e.color, e.colorIndex) || layerColorMap[layer];

      if (e.type === 'LINE' && e.vertices && e.vertices.length >= 2) {
        const v0 = { x: e.vertices[0].x, y: e.vertices[0].y };
        const v1 = { x: e.vertices[1].x, y: e.vertices[1].y };
        minX = Math.min(minX, v0.x, v1.x);
        maxX = Math.max(maxX, v0.x, v1.x);
        minY = Math.min(minY, v0.y, v1.y);
        maxY = Math.max(maxY, v0.y, v1.y);
        entities.push({ type: 'LINE', layer, color: entityColor, vertices: [v0, v1] });
      } else if (e.type === 'CIRCLE' && e.center && e.radius) {
        const r = e.radius;
        minX = Math.min(minX, e.center.x - r);
        maxX = Math.max(maxX, e.center.x + r);
        minY = Math.min(minY, e.center.y - r);
        maxY = Math.max(maxY, e.center.y + r);
        entities.push({
          type: 'CIRCLE',
          layer,
          color: entityColor,
          center: { x: e.center.x, y: e.center.y },
          radius: r,
        });
      } else if (e.type === 'ARC' && e.center && e.radius) {
        const r = e.radius;
        minX = Math.min(minX, e.center.x - r);
        maxX = Math.max(maxX, e.center.x + r);
        minY = Math.min(minY, e.center.y - r);
        maxY = Math.max(maxY, e.center.y + r);
        entities.push({
          type: 'ARC',
          layer,
          color: entityColor,
          center: { x: e.center.x, y: e.center.y },
          radius: r,
          startAngle: e.startAngle ?? 0,
          endAngle: e.endAngle ?? Math.PI * 2,
        });
      } else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices && e.vertices.length > 0) {
        const verts = e.vertices.map((v: any) => {
          minX = Math.min(minX, v.x);
          maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y);
          maxY = Math.max(maxY, v.y);
          return { x: v.x, y: v.y };
        });
        entities.push({ type: 'LWPOLYLINE', layer, color: entityColor, vertices: verts });
      } else if (e.type === 'POINT' && (e.position || (e as any).point)) {
        const pos = e.position || (e as any).point;
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        entities.push({
          type: 'POINT',
          layer,
          color: entityColor,
          position: { x: pos.x, y: pos.y },
        });
      } else if ((e.type === 'TEXT' || e.type === 'MTEXT') && (e.position || (e as any).startPoint)) {
        const pos = e.position || (e as any).startPoint;
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        const rawText = e.text || (e as any).string || '';
        entities.push({
          type: 'TEXT',
          layer,
          color: entityColor,
          text: cleanCadText(rawText),
          position: { x: pos.x, y: pos.y },
          height: (e as any).textHeight || (e as any).height || 12,
          rotation: (e as any).rotation || 0,
        });
      }
    }
  }

  // Handle empty or zero bounds fallback
  if (!isFinite(minX) || !isFinite(maxX)) {
    minX = -100;
    maxX = 100;
    minY = -100;
    maxY = 100;
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Build Layer Hierarchy
  const allLayerNames = Object.keys(layerCounts);
  if (layerTable) {
    for (const name of Object.keys(layerTable)) {
      if (!allLayerNames.includes(name)) allLayerNames.push(name);
    }
  }

  const layers: Cad2dLayer[] = allLayerNames.map((name, idx) => ({
    id: name,
    name,
    color: layerColorMap[name] || LAYER_PALETTE[idx % LAYER_PALETTE.length],
    count: layerCounts[name] || 0,
    visible: true,
  }));

  return {
    entities,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      centerX,
      centerY,
      width,
      height,
    },
    layers,
  };
}
