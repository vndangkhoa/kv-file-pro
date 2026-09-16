import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Building2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Compass,
  Grid,
  Sun,
  Moon,
  Scissors,
  Ruler,
  Layers,
  Move,
  Eye,
  EyeOff,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Sparkles,
  Ghost,
  Focus,
} from 'lucide-react';
import { PreviewExtensionProps } from '../../types';
import { formatHumanSize } from '../../utils/format';
import { parseCad2dFile, Cad2dModel, Cad2dLayer } from './cad2dParser';

type ShadingMode = 'shaded' | 'wireframe' | 'shaded-wire';
type ThemeMode = 'dark' | 'blueprint' | 'light';
type ActiveTool = 'none' | 'tree' | 'properties' | 'clipping' | 'explode' | 'measure' | 'telemetry';

interface CadElement {
  id: string;
  name: string;
  category: string;
  color: string;
  visible: boolean;
  offset: [number, number, number]; // Explode offset vector
  properties: Record<string, string>;
  vertices: [number, number, number][];
  faces: { v: number[]; light: number }[];
  storey?: string;
  storeyId?: string;
  discipline?: string;
  ifcClass?: string;
  elevation?: string;
  translucent?: boolean;
}

const BIM_ELEMENTS: CadElement[] = [
  {
    id: 'ifc-roof',
    name: 'Post-Tensioned Roof Parapet',
    category: 'IfcSlab / Roof',
    color: '#475569',
    visible: true,
    offset: [0, 80, 0],
    storey: 'Level 02 - Roof & Parapet',
    storeyId: 'l2',
    discipline: 'Architectural Envelope',
    ifcClass: 'IfcSlab',
    elevation: '+12.50 m',
    properties: {
      'IFC Class': 'IfcSlab',
      'Storey Level': 'Level 02 (Roof & Parapet)',
      'Elevation': '+12.500 m',
      'Structural Function': 'Load-Bearing Parapet',
      'Material': 'Reinforced Cast Concrete C35/45',
      'Thickness': '250 mm',
      'Area': '342.50 m²',
      'Thermal Transmittance': 'U = 0.18 W/m²K',
      'Fire Resistance': 'REI 120',
      'IFC GUID': '2Xz84$0023B_1a87KxLm',
    },
    vertices: [
      [-120, -110, -80], [120, -110, -80], [120, -95, -80], [-120, -95, -80],
      [-120, -110, 80], [120, -110, 80], [120, -95, 80], [-120, -95, 80],
    ],
    faces: [
      { v: [0, 1, 2, 3], light: 0.9 },
      { v: [4, 5, 6, 7], light: 0.8 },
      { v: [0, 4, 7, 3], light: 0.7 },
      { v: [1, 5, 6, 2], light: 0.85 },
      { v: [2, 6, 7, 3], light: 1.0 },
      { v: [0, 1, 5, 4], light: 0.5 },
    ],
  },
  {
    id: 'ifc-curtain-wall',
    name: 'North Facade Double-Glazed Curtain',
    category: 'IfcCurtainWall',
    color: '#38bdf8',
    visible: true,
    offset: [0, 0, 70],
    storey: 'Level 01 - Superstructure',
    storeyId: 'l1',
    discipline: 'Architectural Envelope',
    ifcClass: 'IfcCurtainWall',
    elevation: '+4.20 m',
    translucent: true,
    properties: {
      'IFC Class': 'IfcCurtainWall',
      'Storey Level': 'Level 01 (Mezzanine & Facade)',
      'Elevation': '+4.200 m',
      'Structural Function': 'External Envelope',
      'Glazing Type': 'Low-E Argon Gas Filled IGU',
      'Sound Transmission': 'Rw = 42 dB',
      'Light Transmittance': '68%',
      'Solar Factor (g)': '0.36',
      'Fire Resistance': 'E 30',
      'IFC GUID': '3Yk91#1099A_2f43PwQr',
    },
    vertices: [
      [-110, -95, 75], [110, -95, 75], [110, 80, 75], [-110, 80, 75],
      [-110, -95, 80], [110, -95, 80], [110, 80, 80], [-110, 80, 80],
    ],
    faces: [
      { v: [0, 1, 2, 3], light: 0.95 },
      { v: [4, 5, 6, 7], light: 0.7 },
      { v: [0, 4, 7, 3], light: 0.6 },
      { v: [1, 5, 6, 2], light: 0.75 },
    ],
  },
  {
    id: 'ifc-columns',
    name: 'Perimeter Structural Columns (4x)',
    category: 'IfcColumn',
    color: '#3b82f6',
    visible: true,
    offset: [60, 0, 0],
    storey: 'Level 01 - Superstructure',
    storeyId: 'l1',
    discipline: 'Structural Frame',
    ifcClass: 'IfcColumn',
    elevation: '+0.00 m to +4.20 m',
    properties: {
      'IFC Class': 'IfcColumn',
      'Storey Level': 'Level 01 (Superstructure)',
      'Structural Function': 'Primary Gravity Load-Bearing',
      'Material': 'Structural Steel Composite S355',
      'Profile': 'HEB 400 Core with Rebar Cage',
      'Axial Capacity': '4,200 kN',
      'Height': '3,800 mm',
      'Fire Resistance': 'R 90',
      'IFC GUID': '0Vb12*9988C_4k56TuVw',
    },
    vertices: [
      [-100, -95, -60], [-75, -95, -60], [-75, 80, -60], [-100, 80, -60],
      [-100, -95, -40], [-75, -95, -40], [-75, 80, -40], [-100, 80, -40],
    ],
    faces: [
      { v: [0, 1, 2, 3], light: 0.8 },
      { v: [4, 5, 6, 7], light: 0.9 },
      { v: [0, 4, 7, 3], light: 0.65 },
      { v: [1, 5, 6, 2], light: 0.75 },
    ],
  },
  {
    id: 'ifc-core-wall',
    name: 'Central Concrete Elevator Shear Core',
    category: 'IfcWallStandardCase',
    color: '#6366f1',
    visible: true,
    offset: [-50, 0, 0],
    storey: 'Level 01 - Superstructure',
    storeyId: 'l1',
    discipline: 'Structural Frame',
    ifcClass: 'IfcWallStandardCase',
    elevation: '+0.00 m to +12.50 m',
    properties: {
      'IFC Class': 'IfcWallStandardCase',
      'Storey Level': 'Full Shaft (L0 to L2)',
      'Structural Function': 'Shear Core (Lateral Stability)',
      'Material': 'In-situ Concrete C40/50',
      'Thickness': '350 mm',
      'Compressive Strength': '50 MPa',
      'Reinforcement Ratio': '1.8%',
      'Fire Resistance': 'REI 180',
      'IFC GUID': '1Ma44$8877D_3n12ZxYq',
    },
    vertices: [
      [-40, -95, -50], [40, -95, -50], [40, 80, -50], [-40, 80, -50],
      [-40, -95, 30], [40, -95, 30], [40, 80, 30], [-40, 80, 30],
    ],
    faces: [
      { v: [0, 1, 2, 3], light: 0.75 },
      { v: [4, 5, 6, 7], light: 0.85 },
      { v: [0, 4, 7, 3], light: 0.9 },
      { v: [1, 5, 6, 2], light: 0.65 },
    ],
  },
  {
    id: 'ifc-foundation',
    name: 'Ground Raft Foundation Slab',
    category: 'IfcSlab / Ground',
    color: '#1e293b',
    visible: true,
    offset: [0, -70, 0],
    storey: 'Level 00 - Foundation & Substructure',
    storeyId: 'l0',
    discipline: 'Structural Frame',
    ifcClass: 'IfcSlab',
    elevation: '-1.20 m',
    properties: {
      'IFC Class': 'IfcSlab',
      'Storey Level': 'Level 00 (Foundation Substructure)',
      'Elevation': '-1.200 m',
      'Structural Function': 'Raft Foundation Base',
      'Material': 'Waterproof Mass Concrete C30/37',
      'Thickness': '800 mm',
      'Bearing Capacity': '250 kPa',
      'Soil Interaction': 'Damped Spring Bedding',
      'IFC GUID': '4Gk88@7766E_5p90KlMn',
    },
    vertices: [
      [-130, 80, -90], [130, 80, -90], [130, 105, -90], [-130, 105, -90],
      [-130, 80, 90], [130, 80, 90], [130, 105, 90], [-130, 105, 90],
    ],
    faces: [
      { v: [0, 1, 2, 3], light: 0.6 },
      { v: [4, 5, 6, 7], light: 0.75 },
      { v: [0, 4, 7, 3], light: 0.7 },
      { v: [1, 5, 6, 2], light: 0.8 },
      { v: [0, 1, 5, 4], light: 0.9 },
      { v: [2, 6, 7, 3], light: 0.45 },
    ],
  },
];

const CAD_ELEMENTS: CadElement[] = [
  {
    id: 'cad-casing',
    name: 'Planetary Housing Casing',
    category: 'Solid / Casting',
    color: '#2563eb',
    visible: true,
    offset: [0, -80, 0],
    properties: {
      'Entity Type': 'Closed Manifold B-Rep Solid',
      'Material': 'Ductile Cast Iron QT500-7',
      'Mass': '8.45 kg',
      'Volume': '1,180.4 cm³',
      'Surface Area': '2,450.2 cm²',
      'Tolerance Class': 'ISO 2768-mK',
      'Manufacturing': 'Die Casting + CNC Boring',
    },
    vertices: [
      [-90, -45, -90], [90, -45, -90], [90, 45, -90], [-90, 45, -90],
      [-90, -45, 90], [90, -45, 90], [90, 45, 90], [-90, 45, 90],
    ],
    faces: [
      { v: [0, 1, 2, 3], light: 0.8 },
      { v: [4, 5, 6, 7], light: 0.7 },
      { v: [0, 4, 7, 3], light: 0.6 },
      { v: [1, 5, 6, 2], light: 0.85 },
      { v: [0, 1, 5, 4], light: 0.9 },
      { v: [3, 2, 6, 7], light: 0.5 },
    ],
  },
  {
    id: 'cad-sun-gear',
    name: 'Sun Input Gear Pinion',
    category: 'Solid / Transmission',
    color: '#f59e0b',
    visible: true,
    offset: [0, 0, 70],
    properties: {
      'Entity Type': 'Involute Spur Gear B-Rep',
      'Material': '20CrMnTi Alloy Carburized Steel',
      'Module (m)': '3.5 mm',
      'Number of Teeth': 'z = 18',
      'Pressure Angle': '20°',
      'Hardness': 'HRC 58-62',
      'Root Stress': '420 MPa',
    },
    vertices: [
      [-35, -35, -35], [35, -35, -35], [35, 35, -35], [-35, 35, -35],
      [-35, -35, 35], [35, -35, 35], [35, 35, 35], [-35, 35, 35],
    ],
    faces: [
      { v: [0, 1, 2, 3], light: 0.9 },
      { v: [4, 5, 6, 7], light: 0.75 },
      { v: [0, 4, 7, 3], light: 0.65 },
      { v: [1, 5, 6, 2], light: 0.85 },
      { v: [0, 1, 5, 4], light: 0.95 },
      { v: [3, 2, 6, 7], light: 0.55 },
    ],
  },
  {
    id: 'cad-carrier',
    name: 'Satellite Planet Carrier',
    category: 'Solid / Carrier',
    color: '#10b981',
    visible: true,
    offset: [0, 80, 0],
    properties: {
      'Entity Type': 'Machined Spider Carrier',
      'Material': '42CrMo4 Quenched & Tempered',
      'Planets Count': '3x Satellite Pins @ 120°',
      'Bore Diameter': 'Ø 45.000 (+0.015) mm',
      'Runout Tolerance': '0.008 mm',
      'Torque Rating': '850 N·m',
    },
    vertices: [
      [-70, 30, -70], [70, 30, -70], [70, 60, -70], [-70, 60, -70],
      [-70, 30, 70], [70, 30, 70], [70, 60, 70], [-70, 60, 70],
    ],
    faces: [
      { v: [0, 1, 2, 3], light: 0.7 },
      { v: [4, 5, 6, 7], light: 0.8 },
      { v: [0, 4, 7, 3], light: 0.6 },
      { v: [1, 5, 6, 2], light: 0.75 },
      { v: [0, 1, 5, 4], light: 0.85 },
      { v: [3, 2, 6, 7], light: 0.45 },
    ],
  },
];

export const CadViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
  extension,
}) => {
  const ext = (extension || '').toLowerCase().replace(/^\./, '');
  const is2dDrafting = ext === 'dxf' || ext === 'dwg';
  const isBim = ext === 'ifc';
  const isParametricCad = ['step', 'stp', 'iges', 'igs', 'brep'].includes(ext);

  const [loading, setLoading] = useState(true);
  const [shadingMode, setShadingMode] = useState<ShadingMode>('shaded-wire');
  const [theme, setTheme] = useState<ThemeMode>(is2dDrafting ? 'light' : 'dark');
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeTool, setActiveTool] = useState<ActiveTool>(isBim ? 'tree' : 'none');

  // Camera & Navigation
  const [rotation, setRotation] = useState({ x: is2dDrafting ? 0 : 30, y: is2dDrafting ? 0 : -45 });
  const [zoom, setZoom] = useState(isBim ? 0.85 : 1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'rotate' | 'pan'>('rotate');
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Sectioning / Cross-Section Clipping
  const [clipping, setClipping] = useState({
    enabled: false,
    axis: 'y' as 'x' | 'y' | 'z',
    offset: 0,
    inverted: false,
  });

  // Assembly Exploded View
  const [explodeFactor, setExplodeFactor] = useState(0); // 0 to 100%

  // Precision Measurement Tool
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number, number][]>([]);

  // Selected Element for Property Inspection
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Model Elements (BIM / 3D Parametric)
  const [elements, setElements] = useState<CadElement[]>(() =>
    isBim ? BIM_ELEMENTS : CAD_ELEMENTS
  );

  // Real 2D CAD Model (DWG / DXF parsed data)
  const [realCadModel, setRealCadModel] = useState<Cad2dModel | null>(null);
  const [cadLayers, setCadLayers] = useState<Cad2dLayer[]>([]);
  const [statusText, setStatusText] = useState<string>('Tessellating CAD B-Rep Entities...');
  const [initialFitZoom, setInitialFitZoom] = useState<number>(1);
  const [parseError, setParseError] = useState<string | null>(null);
  const [layerViewMode, setLayerViewMode] = useState<'groups' | 'layers'>('groups');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    electrical: true,
    structure: true,
    text: true,
    ceiling: false,
    dimensions: false,
  });

  // BIM Smart Organization & Raycasting States
  const [bimViewMode, setBimViewMode] = useState<'storey' | 'discipline' | 'class'>('storey');
  const [activeStoreyFilter, setActiveStoreyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ghostMode, setGhostMode] = useState<boolean>(true);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [mouseScreenPos, setMouseScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [snappedPoint, setSnappedPoint] = useState<{ v3d: [number, number, number]; p2d: { x: number; y: number } } | null>(null);
  const [expandedBimGroups, setExpandedBimGroups] = useState<Record<string, boolean>>({
    l2: true,
    l1: true,
    l0: true,
    'Architectural Envelope': true,
    'Structural Frame': true,
    IfcSlab: true,
    IfcCurtainWall: true,
    IfcColumn: true,
    IfcWallStandardCase: true,
  });

  const projectedFacesRef = useRef<{
    points: { x: number; y: number }[];
    avgZ: number;
    light: number;
    color: string;
    isSelected: boolean;
    isHovered: boolean;
    elementId: string;
    translucent?: boolean;
    isGhost?: boolean;
  }[]>([]);
  const snappedVertexRef = useRef<[number, number, number] | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Load Real DWG / DXF Geometry or 3D fallback
  useEffect(() => {
    let cancelled = false;

    if (is2dDrafting && fileUrl) {
      setLoading(true);
      setParseError(null);
      setStatusText(
        ext === 'dwg'
          ? 'Decoding AutoCAD DWG via LibreDWG WebAssembly...'
          : 'Parsing 2D DXF technical vectors...'
      );

      (async () => {
        try {
          const res = await fetch(fileUrl, {
            credentials: 'include',
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Failed to fetch CAD file stream`);
          }
          const buf = await res.arrayBuffer();
          if (cancelled) return;

          const model = await parseCad2dFile(buf, ext, (msg) => {
            if (!cancelled) setStatusText(msg);
          });

          if (cancelled) return;
          setRealCadModel(model);
          setCadLayers(model.layers);

          const rect = containerRef.current?.getBoundingClientRect();
          const cw = rect ? rect.width : 800;
          const ch = rect ? rect.height : 600;
          const fitZoom = Math.min(cw / model.bounds.width, ch / model.bounds.height) * 0.85;
          setZoom(fitZoom);
          setInitialFitZoom(fitZoom);
          setPan({ x: 0, y: 0 });
          setLoading(false);
        } catch (err: any) {
          console.error('Real CAD parsing failed:', err);
          if (!cancelled) {
            setParseError(err.message || 'Failed to decode CAD drawing');
            setLoading(false);
          }
        }
      })();
    } else {
      const timer = setTimeout(() => setLoading(false), 200);
      return () => clearTimeout(timer);
    }

    return () => {
      cancelled = true;
    };
  }, [fileUrl, ext, is2dDrafting]);

  // Viewport 3D / 2D Render Engine
  useEffect(() => {
    if (loading || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const dw = rect.width;
    const dh = rect.height;

    // Theme Studio Background with Vignette
    if (theme === 'dark') {
      const bgGrad = ctx.createRadialGradient(dw / 2, dh / 2, 40, dw / 2, dh / 2, Math.max(dw, dh) * 0.7);
      bgGrad.addColorStop(0, '#151b27');
      bgGrad.addColorStop(1, '#07090e');
      ctx.fillStyle = bgGrad;
    } else if (theme === 'blueprint') {
      const bgGrad = ctx.createRadialGradient(dw / 2, dh / 2, 40, dw / 2, dh / 2, Math.max(dw, dh) * 0.7);
      bgGrad.addColorStop(0, '#0c2242');
      bgGrad.addColorStop(1, '#051020');
      ctx.fillStyle = bgGrad;
    } else {
      const bgGrad = ctx.createRadialGradient(dw / 2, dh / 2, 40, dw / 2, dh / 2, Math.max(dw, dh) * 0.7);
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = bgGrad;
    }
    ctx.fillRect(0, 0, dw, dh);

    ctx.save();
    ctx.translate(dw / 2 + pan.x, dh / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // Soft Ground Contact Shadow (BIM / 3D Parametric)
    if (!is2dDrafting) {
      ctx.save();
      const radX = (rotation.x * Math.PI) / 180;
      const radY = (rotation.y * Math.PI) / 180;
      const shadowCenter = project3D(0, 110, 0, radX, radY);
      ctx.translate(shadowCenter.x, shadowCenter.y);
      const sx = 180;
      const sy = Math.max(25, 180 * Math.abs(Math.sin(radX)) * 0.55);
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, sx);
      grad.addColorStop(0, theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.28)');
      grad.addColorStop(0.45, theme === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, sx, sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 1. Grid
    if (showGrid) {
      ctx.save();
      const gridSize = 35;
      const gridRange = 400;
      ctx.strokeStyle =
        theme === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : theme === 'blueprint'
          ? 'rgba(56, 189, 248, 0.12)'
          : 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;

      if (is2dDrafting) {
        for (let x = -gridRange; x <= gridRange; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, -gridRange);
          ctx.lineTo(x, gridRange);
          ctx.stroke();
        }
        for (let y = -gridRange; y <= gridRange; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(-gridRange, y);
          ctx.lineTo(gridRange, y);
          ctx.stroke();
        }
      } else {
        const radX = (rotation.x * Math.PI) / 180;
        const radY = (rotation.y * Math.PI) / 180;
        const groundY = 110;

        for (let x = -gridRange; x <= gridRange; x += gridSize) {
          const p1 = project3D(x, groundY, -gridRange, radX, radY);
          const p2 = project3D(x, groundY, gridRange, radX, radY);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        for (let z = -gridRange; z <= gridRange; z += gridSize) {
          const p1 = project3D(-gridRange, groundY, z, radX, radY);
          const p2 = project3D(gridRange, groundY, z, radX, radY);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 2. Geometry Rendering
    if (is2dDrafting) {
      if (realCadModel) {
        // Render Real AutoCAD DWG / DXF Geometry (lines, circles, polylines, text)
        ctx.save();
        const cx = realCadModel.bounds.centerX;
        const cy = realCadModel.bounds.centerY;

        const visibleLayers = new Set(cadLayers.filter((l) => l.visible).map((l) => l.id));
        const layerColorMap = new Map(cadLayers.map((l) => [l.id, l.color]));

        ctx.lineWidth = 1.2 / zoom;

        for (const entity of realCadModel.entities) {
          if (!visibleLayers.has(entity.layer)) continue;

          const rawCol = (entity.color || layerColorMap.get(entity.layer) || '#ffffff').toLowerCase();
          let strokeCol = rawCol;

          if (rawCol === '#ffffff' || rawCol === 'white' || rawCol === '#000000' || rawCol === 'black') {
            strokeCol = theme === 'light' ? '#111827' : '#ffffff';
          } else if (theme === 'blueprint' && (rawCol === '#111827' || rawCol === '#000000')) {
            strokeCol = '#ffffff';
          }

          ctx.strokeStyle = strokeCol;
          ctx.fillStyle = strokeCol;

          if (entity.type === 'LINE' && entity.vertices && entity.vertices.length >= 2) {
            const x1 = entity.vertices[0].x - cx;
            const y1 = -(entity.vertices[0].y - cy);
            const x2 = entity.vertices[1].x - cx;
            const y2 = -(entity.vertices[1].y - cy);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          } else if (entity.type === 'LWPOLYLINE' && entity.vertices && entity.vertices.length > 0) {
            ctx.beginPath();
            entity.vertices.forEach((v, idx) => {
              const vx = v.x - cx;
              const vy = -(v.y - cy);
              if (idx === 0) ctx.moveTo(vx, vy);
              else ctx.lineTo(vx, vy);
            });
            ctx.stroke();
          } else if (entity.type === 'CIRCLE' && entity.center && entity.radius) {
            const x = entity.center.x - cx;
            const y = -(entity.center.y - cy);
            const r = entity.radius;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
          } else if (entity.type === 'ARC' && entity.center && entity.radius) {
            const x = entity.center.x - cx;
            const y = -(entity.center.y - cy);
            const r = entity.radius;
            const sa = -(entity.endAngle || 0);
            const ea = -(entity.startAngle || 0);
            ctx.beginPath();
            ctx.arc(x, y, r, sa, ea, true);
            ctx.stroke();
          } else if (entity.type === 'POINT' && entity.position) {
            const px = entity.position.x - cx;
            const py = -(entity.position.y - cy);
            ctx.beginPath();
            ctx.arc(px, py, 2.5 / zoom, 0, Math.PI * 2);
            ctx.fill();
          } else if (entity.type === 'TEXT' && entity.position && entity.text) {
            // Render legible AutoCAD text labels right-side up with CAD rotation
            const h = entity.height || 12;
            if (h * zoom > 3.5) {
              const tx = entity.position.x - cx;
              const ty = -(entity.position.y - cy);
              ctx.save();
              ctx.translate(tx, ty);
              if (entity.rotation) {
                // AutoCAD CCW rotation maps to -rotation in inverted Y canvas
                ctx.rotate(-(entity.rotation * Math.PI) / 180);
              }
              ctx.font = `${Math.round(h)}px sans-serif`;
              ctx.fillText(entity.text, 0, 0);
              ctx.restore();
            }
          }
        }
        ctx.restore();
      } else {
        // Fallback Sample 2D AutoCAD Technical Vectors
        ctx.save();
        ctx.strokeStyle = theme === 'blueprint' ? '#38bdf8' : '#3b82f6';
        ctx.lineWidth = 2.5;

        // Outer mechanical flange contour
        ctx.beginPath();
        ctx.arc(0, 0, 160, 0, Math.PI * 2);
        ctx.stroke();

        // Bore
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI * 2);
        ctx.stroke();

        // 6x Bolt circle
        const pcd = 120;
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * pcd, Math.sin(ang) * pcd, 14, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Centerlines
        ctx.strokeStyle = theme === 'blueprint' ? '#f43f5e' : '#ef4444';
        ctx.setLineDash([8, 4, 2, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-200, 0);
        ctx.lineTo(200, 0);
        ctx.moveTo(0, -200);
        ctx.lineTo(0, 200);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pitch Circle Diameter
        ctx.strokeStyle = theme === 'blueprint' ? '#fbbf24' : '#f59e0b';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, pcd, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dimension Callouts
        ctx.fillStyle = theme === 'light' ? '#334155' : '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText('Ø 240.0 [PCD]', 35, -pcd - 8);
        ctx.fillText('Ø 160.0 [BORE]', 15, -45);
        ctx.fillText('6x Ø 28.0 EQ SP', pcd + 20, 10);
        ctx.restore();
      }

      // Render 2D Active Measurement
      if (measurePoints.length > 0) {
        ctx.save();
        measurePoints.forEach((pt, i) => {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 5 / zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(10, 12 / zoom)}px monospace`;
          ctx.fillText(i === 0 ? 'A' : 'B', pt[0] + 8 / zoom, pt[1] - 8 / zoom);
        });

        if (measurePoints.length === 2) {
          const [p1, p2] = measurePoints;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2 / zoom;
          ctx.setLineDash([4 / zoom, 4 / zoom]);
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
          ctx.setLineDash([]);

          const dx = p2[0] - p1[0];
          const dy = p2[1] - p1[1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          const midX = (p1[0] + p2[0]) / 2;
          const midY = (p1[1] + p2[1]) / 2;

          const label = dist >= 1000 ? `${(dist / 1000).toFixed(2)} m (${dist.toFixed(0)} mm)` : `${dist.toFixed(1)} mm`;

          ctx.save();
          ctx.fillStyle = '#1e293b';
          const boxW = 140 / zoom;
          const boxH = 24 / zoom;
          ctx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1 / zoom;
          ctx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
          ctx.fillStyle = '#f8fafc';
          ctx.font = `bold ${Math.max(10, 11 / zoom)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, midX, midY);
          ctx.restore();
        }
        ctx.restore();
      }
    } else {
      // 3D Assembly & BIM Solid Rendering
      const radX = (rotation.x * Math.PI) / 180;
      const radY = (rotation.y * Math.PI) / 180;

      // Collect all visible faces across all components
      interface RenderFace {
        points: { x: number; y: number }[];
        avgZ: number;
        light: number;
        color: string;
        isSelected: boolean;
        isHovered: boolean;
        elementId: string;
        translucent?: boolean;
        isGhost?: boolean;
      }

      const allFaces: RenderFace[] = [];
      const hasSelection = selectedElementId !== null;

      elements.forEach((el) => {
        const isStoreyFiltered = isBim && activeStoreyFilter !== 'all' && el.storeyId !== activeStoreyFilter;
        if (isStoreyFiltered && !ghostMode) return;
        if (!el.visible && !ghostMode) return;

        const isGhost =
          !el.visible ||
          isStoreyFiltered ||
          (ghostMode && hasSelection && el.id !== selectedElementId);

        // Apply Explode offset vector
        const ex = (el.offset[0] * explodeFactor) / 100;
        const ey = (el.offset[1] * explodeFactor) / 100;
        const ez = (el.offset[2] * explodeFactor) / 100;

        // Apply Clipping check
        el.faces.forEach((face) => {
          let avgZ = 0;
          let isClipped = false;

          const points = face.v.map((vi) => {
            const rawV = el.vertices[vi];
            const vx = rawV[0] + ex;
            const vy = rawV[1] + ey;
            const vz = rawV[2] + ez;

            // Check dynamic sectioning plane
            if (clipping.enabled) {
              const val = clipping.axis === 'x' ? vx : clipping.axis === 'y' ? vy : vz;
              if (clipping.inverted ? val > clipping.offset : val < clipping.offset) {
                isClipped = true;
              }
            }

            const p = project3D(vx, vy, vz, radX, radY);
            const rz = -vx * Math.sin(radY) + vz * Math.cos(radY);
            avgZ += rz;
            return p;
          });

          if (isClipped) return;

          avgZ /= face.v.length;
          allFaces.push({
            points,
            avgZ,
            light: face.light,
            color: el.color,
            isSelected: el.id === selectedElementId,
            isHovered: el.id === hoveredElementId,
            elementId: el.id,
            translucent: el.translucent,
            isGhost,
          });
        });
      });

      // Save projected faces for raycast click and hover detection
      projectedFacesRef.current = allFaces;

      // Depth sorting (painter's algorithm)
      allFaces.sort((a, b) => a.avgZ - b.avgZ);

      // Render sorted faces
      allFaces.forEach((f) => {
        ctx.beginPath();
        f.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();

        // Shaded Surface
        if (shadingMode === 'shaded' || shadingMode === 'shaded-wire') {
          if (f.isGhost) {
            ctx.fillStyle = theme === 'dark' ? 'rgba(30, 41, 59, 0.16)' : 'rgba(226, 232, 240, 0.2)';
            ctx.fill();
          } else if (f.isSelected) {
            ctx.fillStyle = `rgba(245, 158, 11, ${f.light * 0.95})`; // Highlighted selection in Amber
            ctx.fill();
          } else if (f.isHovered) {
            ctx.fillStyle = f.translucent
              ? 'rgba(56, 189, 248, 0.7)'
              : adjustBrightness(f.color, Math.min(1.0, f.light * 1.3));
            ctx.fill();
          } else if (f.translucent) {
            ctx.fillStyle = `rgba(56, 189, 248, ${theme === 'light' ? 0.45 : 0.38})`;
            ctx.fill();
          } else if (theme === 'blueprint') {
            ctx.fillStyle = `rgba(56, 189, 248, ${f.light * 0.8})`;
            ctx.fill();
          } else {
            ctx.fillStyle = adjustBrightness(f.color, f.light);
            ctx.fill();
          }
        }

        // Technical Outlines & Edges
        if (shadingMode === 'wireframe' || shadingMode === 'shaded-wire') {
          if (f.isGhost) {
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (f.isSelected) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          } else if (f.isHovered) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.strokeStyle =
              shadingMode === 'wireframe'
                ? theme === 'blueprint'
                  ? '#38bdf8'
                  : '#60a5fa'
                : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      });

      // Render Magnetic Snapping Ring if vertex hovered in measure mode
      if (measureMode && snappedPoint) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(snappedPoint.p2d.x, snappedPoint.p2d.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(snappedPoint.p2d.x, snappedPoint.p2d.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Active Measurement Dimension Line
      if (measurePoints.length > 0) {
        ctx.save();
        measurePoints.forEach((pt, i) => {
          const p = project3D(pt[0], pt[1], pt[2], radX, radY);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(i === 0 ? 'A' : 'B', p.x + 8, p.y - 8);
        });

        if (measurePoints.length === 2) {
          const p1 = project3D(measurePoints[0][0], measurePoints[0][1], measurePoints[0][2], radX, radY);
          const p2 = project3D(measurePoints[1][0], measurePoints[1][1], measurePoints[1][2], radX, radY);

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Dimension distance calculation
          const dx = measurePoints[1][0] - measurePoints[0][0];
          const dy = measurePoints[1][1] - measurePoints[0][1];
          const dz = measurePoints[1][2] - measurePoints[0][2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          const label = isBim
            ? `${(dist / 30).toFixed(2)} m (ΔX: ${(Math.abs(dx) / 30).toFixed(2)}m, ΔY: ${(Math.abs(dy) / 30).toFixed(2)}m, ΔZ: ${(Math.abs(dz) / 30).toFixed(2)}m)`
            : `${dist.toFixed(1)} mm`;
          const boxW = isBim ? 220 : 80;
          ctx.fillStyle = '#141722';
          ctx.fillRect(midX - boxW / 2, midY - 14, boxW, 24);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(midX - boxW / 2, midY - 14, boxW, 24);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, midX, midY - 1);
        }
        ctx.restore();
      }
    }

    // 3. Coordinate Axes (X: Red, Y: Green, Z: Blue)
    if (showAxes) {
      ctx.save();
      const origin = { x: -dw / 2 + 65, y: dh / 2 - 65 };
      const axisLen = 38;

      if (is2dDrafting) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + axisLen, origin.y);
        ctx.stroke();

        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x, origin.y - axisLen);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('X', origin.x + axisLen + 4, origin.y + 3);
        ctx.fillStyle = '#10b981';
        ctx.fillText('Y', origin.x - 3, origin.y - axisLen - 4);
      } else {
        const radX = (rotation.x * Math.PI) / 180;
        const radY = (rotation.y * Math.PI) / 180;

        const pX = project3D(axisLen, 0, 0, radX, radY);
        const pY = project3D(0, -axisLen, 0, radX, radY);
        const pZ = project3D(0, 0, axisLen, radX, radY);

        // X (Red)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + pX.x, origin.y + pX.y);
        ctx.stroke();

        // Y (Green)
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + pY.x, origin.y + pY.y);
        ctx.stroke();

        // Z (Blue)
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + pZ.x, origin.y + pZ.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [
    loading,
    is2dDrafting,
    isBim,
    shadingMode,
    theme,
    showAxes,
    showGrid,
    rotation,
    zoom,
    pan,
    elements,
    cadLayers,
    realCadModel,
    clipping,
    explodeFactor,
    measurePoints,
    selectedElementId,
    hoveredElementId,
    activeStoreyFilter,
    ghostMode,
    snappedPoint,
  ]);

  // 3D Isometric projection math helper
  function project3D(x: number, y: number, z: number, radX: number, radY: number) {
    const x1 = x * Math.cos(radY) + z * Math.sin(radY);
    const z1 = -x * Math.sin(radY) + z * Math.cos(radY);
    const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);
    return { x: x1, y: y2, z: z2 };
  }

  // 2D Raycast Point-in-Polygon
  function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function adjustBrightness(hex: string, factor: number) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    let r = (num >> 16) * factor;
    let g = ((num >> 8) & 0x00ff) * factor;
    let b = (num & 0x0000ff) * factor;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  // Fit to View / Focus target or all visible elements
  const fitToView = (targetElementId?: string | null) => {
    const targetElements = targetElementId
      ? elements.filter((e) => e.id === targetElementId)
      : elements.filter((e) => e.visible);

    if (targetElements.length === 0) return;

    const radX = (rotation.x * Math.PI) / 180;
    const radY = (rotation.y * Math.PI) / 180;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    targetElements.forEach((el) => {
      el.vertices.forEach((v) => {
        const p = project3D(v[0], v[1], v[2], radX, radY);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
    });

    const rect = containerRef.current?.getBoundingClientRect();
    const cw = rect ? rect.width : 800;
    const ch = rect ? rect.height : 600;

    const w = maxX - minX || 200;
    const h = maxY - minY || 200;
    const newZoom = Math.min(cw / (w * 1.5), ch / (h * 1.5), 1.6);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(Math.max(0.4, Math.min(1.8, newZoom)));
    setPan({ x: -centerX * 0.4, y: -centerY * 0.4 });
  };

  // Keyboard Shortcuts (F: Focus, Esc: Clear selection/measure)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        fitToView(selectedElementId);
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        if (measureMode) {
          setMeasureMode(false);
          setMeasurePoints([]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, elements, rotation, zoom, measureMode]);

  // Mouse Interaction with Raycast Selection & Snapping
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    if (e.button === 0) {
      setIsDragging(true);
      setDragMode(e.shiftKey || is2dDrafting ? 'pan' : 'rotate');
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouseScreenPos({ x: e.clientX, y: e.clientY });

    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setLastMouse({ x: e.clientX, y: e.clientY });

      if (dragMode === 'pan') {
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      } else {
        setRotation((r) => ({
          x: Math.max(-85, Math.min(85, r.x + dy * 0.5)),
          y: r.y + dx * 0.5,
        }));
      }
      return;
    }

    const curX = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom;
    const curY = (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom;

    if (measureMode && !is2dDrafting) {
      const radX = (rotation.x * Math.PI) / 180;
      const radY = (rotation.y * Math.PI) / 180;
      let nearest: { v3d: [number, number, number]; p2d: { x: number; y: number } } | null = null;
      let minDist = 22 / zoom;

      for (const el of elements) {
        if (!el.visible) continue;
        const ex = (el.offset[0] * explodeFactor) / 100;
        const ey = (el.offset[1] * explodeFactor) / 100;
        const ez = (el.offset[2] * explodeFactor) / 100;

        for (const v of el.vertices) {
          const vx = v[0] + ex;
          const vy = v[1] + ey;
          const vz = v[2] + ez;
          const p = project3D(vx, vy, vz, radX, radY);
          const d = Math.hypot(p.x - curX, p.y - curY);
          if (d < minDist) {
            minDist = d;
            nearest = { v3d: [vx, vy, vz], p2d: p };
          }
        }
      }

      setSnappedPoint(nearest);
      snappedVertexRef.current = nearest ? nearest.v3d : null;
    } else if (!is2dDrafting) {
      let hitId: string | null = null;
      const faces = projectedFacesRef.current;
      for (let i = faces.length - 1; i >= 0; i--) {
        if (pointInPolygon(curX, curY, faces[i].points)) {
          hitId = faces[i].elementId;
          break;
        }
      }
      setHoveredElementId(hitId);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);
    const dt = Date.now() - dragStartRef.current.time;

    // Detect Click (not drag)
    if (dx < 6 && dy < 6 && dt < 350) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom;
      const clickY = (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom;

      if (measureMode) {
        if (snappedVertexRef.current) {
          const v = snappedVertexRef.current;
          setMeasurePoints((prev) => (prev.length >= 2 ? [v] : [...prev, v]));
        } else {
          setMeasurePoints((prev) =>
            prev.length >= 2 ? [[clickX, clickY, 0]] : [...prev, [clickX, clickY, 0]]
          );
        }
        return;
      }

      if (!is2dDrafting) {
        let hitId: string | null = null;
        const faces = projectedFacesRef.current;
        for (let i = faces.length - 1; i >= 0; i--) {
          if (pointInPolygon(clickX, clickY, faces[i].points)) {
            hitId = faces[i].elementId;
            break;
          }
        }
        setSelectedElementId(hitId);
        if (hitId && activeTool === 'none') {
          setActiveTool('tree');
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.00001, Math.min(50, z * delta)));
  };

  const setViewAngle = (
    angle: 'iso' | 'top' | 'front' | 'right' | 'left' | 'bottom' | 'back'
  ) => {
    setPan({ x: 0, y: 0 });
    switch (angle) {
      case 'iso':
        setRotation({ x: 30, y: -45 });
        break;
      case 'top':
        setRotation({ x: 90, y: 0 });
        break;
      case 'front':
        setRotation({ x: 0, y: 0 });
        break;
      case 'right':
        setRotation({ x: 0, y: -90 });
        break;
      case 'left':
        setRotation({ x: 0, y: 90 });
        break;
      case 'bottom':
        setRotation({ x: -90, y: 0 });
        break;
      case 'back':
        setRotation({ x: 0, y: 180 });
        break;
    }
  };

  const toggleElementVisibility = (id: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el))
    );
  };

  const selectedElement = elements.find((e) => e.id === selectedElementId);
  const hoveredElement = elements.find((e) => e.id === hoveredElementId);

  // BIM Multi-Mode Spatial Structure Groupings
  const bimStoreys = useMemo(
    () => [
      {
        id: 'l2',
        name: 'Level 02 - Roof & Parapet',
        elevation: '+12.50 m',
        desc: 'Roof terrace, perimeter parapet & plant zone',
        elements: elements.filter((e) => e.storeyId === 'l2'),
      },
      {
        id: 'l1',
        name: 'Level 01 - Superstructure',
        elevation: '+4.20 m',
        desc: 'Glazed curtain facade, perimeter columns & core wall',
        elements: elements.filter((e) => e.storeyId === 'l1'),
      },
      {
        id: 'l0',
        name: 'Level 00 - Foundation Substructure',
        elevation: '-1.20 m',
        desc: 'Ground raft foundation slab & bearing bed',
        elements: elements.filter((e) => e.storeyId === 'l0'),
      },
    ],
    [elements]
  );

  const bimDisciplines = useMemo(
    () => [
      {
        id: 'Structural Frame',
        name: '🏗️ Structural Frame',
        desc: 'Foundation slab, columns & elevator shear core',
        elements: elements.filter((e) => e.discipline === 'Structural Frame'),
      },
      {
        id: 'Architectural Envelope',
        name: '🏢 Architectural Envelope',
        desc: 'Double-glazed curtain wall & roof parapet',
        elements: elements.filter((e) => e.discipline === 'Architectural Envelope'),
      },
    ],
    [elements]
  );

  const bimClasses = useMemo(() => {
    const map = new Map<string, CadElement[]>();
    elements.forEach((el) => {
      const cls = el.ifcClass || el.category.split('/')[0].trim();
      if (!map.has(cls)) map.set(cls, []);
      map.get(cls)!.push(el);
    });
    return Array.from(map.entries()).map(([cls, els]) => ({
      id: cls,
      name: cls,
      desc: `${els.length} ${cls} component${els.length > 1 ? 's' : ''}`,
      elements: els,
    }));
  }, [elements]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0c10] select-none overflow-hidden relative font-sans">
      {/* Primary Engineering Ribbon Toolbar */}
      <div className="h-10 bg-[#14171f] border-b border-gray-800 flex items-center justify-between px-3 shrink-0 text-xs text-gray-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-sky-400">
            {isBim ? <Building2 size={16} /> : <Box size={16} />}
            <span>
              {isBim
                ? 'BIM IFC Architectural Studio'
                : is2dDrafting
                ? 'AutoCAD 2D Drafting (DWG/DXF)'
                : isParametricCad
                ? 'Parametric Solid Modeling (STEP/IGES)'
                : 'Universal 3D Modeling Viewport'}
            </span>
          </div>

          <div className="h-4 w-px bg-gray-700 mx-1 hidden sm:block" />

          <div className="hidden lg:flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
            <span className="text-gray-200 truncate max-w-[140px]">{fileName}</span>
            <span>•</span>
            <span>{formatHumanSize(fileSize)}</span>
            {realCadModel && (
              <>
                <span>•</span>
                <span className="text-sky-400 font-semibold">
                  {realCadModel.entities.length.toLocaleString()} entities ({cadLayers.length} layers)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Engineering Tool Toggles */}
        <div className="flex items-center gap-1.5">
          {/* BIM Tree / Assembly / AutoCAD Layers Toggle */}
          <button
            onClick={() => setActiveTool(activeTool === 'tree' ? 'none' : 'tree')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors text-xs font-medium ${
              activeTool === 'tree'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Assembly, BIM & Layer Tree"
          >
            <Layers size={13} />
            <span className="hidden sm:inline">
              {isBim
                ? 'BIM Hierarchy'
                : is2dDrafting
                ? 'AutoCAD Layers'
                : 'Parts Tree'}
            </span>
          </button>

          {/* Cross-Section Tool */}
          {!is2dDrafting && (
            <button
              onClick={() => {
                setActiveTool(activeTool === 'clipping' ? 'none' : 'clipping');
                setClipping((c) => ({ ...c, enabled: true }));
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors text-xs font-medium ${
                activeTool === 'clipping'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="3-Axis Dynamic Cross Section"
            >
              <Scissors size={13} />
              <span className="hidden sm:inline">Sectioning</span>
            </button>
          )}

          {/* Exploded View Slider Tool */}
          {!is2dDrafting && (
            <button
              onClick={() => setActiveTool(activeTool === 'explode' ? 'none' : 'explode')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors text-xs font-medium ${
                activeTool === 'explode'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Exploded Assembly View"
            >
              <Move size={13} />
              <span className="hidden sm:inline">Explode</span>
            </button>
          )}

          {/* Measurement Tool */}
          <button
            onClick={() => {
              const next = !measureMode;
              setMeasureMode(next);
              setActiveTool(next ? 'measure' : 'none');
              if (!next) setMeasurePoints([]);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors text-xs font-medium ${
              measureMode
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Point-to-Point Distance Measurement"
          >
            <Ruler size={13} />
            <span className="hidden sm:inline">Measure</span>
          </button>

          {/* Ghost / X-Ray Context Preservation Mode */}
          {!is2dDrafting && (
            <button
              onClick={() => setGhostMode((g) => !g)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-medium ${
                ghostMode
                  ? 'bg-indigo-600/90 text-white shadow-xs'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              title="Toggle Ghosting / X-Ray Mode (retains building context when elements are isolated)"
            >
              <Ghost size={13} />
              <span className="hidden sm:inline">X-Ray</span>
            </button>
          )}

          {/* Fit to View / Focus */}
          <button
            onClick={() => fitToView(selectedElementId)}
            className="p-1 hover:bg-gray-700 rounded text-gray-300 transition-colors"
            title="Fit to View / Focus Target (F)"
          >
            <Focus size={13} />
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1 hidden sm:block" />

          {/* Shading mode */}
          {!is2dDrafting && (
            <div className="flex bg-gray-800 rounded p-0.5">
              <button
                onClick={() => setShadingMode('shaded')}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  shadingMode === 'shaded' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Solid
              </button>
              <button
                onClick={() => setShadingMode('wireframe')}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  shadingMode === 'wireframe' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Wire
              </button>
              <button
                onClick={() => setShadingMode('shaded-wire')}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  shadingMode === 'shaded-wire' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Both
              </button>
            </div>
          )}

          {/* Themes */}
          <div className="flex bg-gray-800 rounded p-0.5">
            <button
              onClick={() => setTheme('dark')}
              title="CAD Dark Theme"
              className={`p-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
              <Moon size={13} />
            </button>
            <button
              onClick={() => setTheme('blueprint')}
              title="AutoCAD Blueprint Theme"
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                theme === 'blueprint' ? 'bg-sky-700 text-white' : 'text-sky-400'
              }`}
            >
              BP
            </button>
            <button
              onClick={() => setTheme('light')}
              title="Studio White Theme"
              className={`p-1 rounded ${theme === 'light' ? 'bg-gray-200 text-gray-900' : 'text-gray-400'}`}
            >
              <Sun size={13} />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex bg-gray-800 rounded p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(5, z * 1.2))}
              className="p-1 hover:bg-gray-700 rounded text-gray-300"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.0001, z / 1.2))}
              className="p-1 hover:bg-gray-700 rounded text-gray-300"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
          </div>

          {/* Grid & Axes Toggles */}
          <div className="flex bg-gray-800 rounded p-0.5">
            <button
              onClick={() => setShowGrid((g) => !g)}
              className={`p-1 rounded ${showGrid ? 'bg-gray-700 text-sky-400' : 'text-gray-400'}`}
              title="Toggle Reference Grid"
            >
              <Grid size={13} />
            </button>
            <button
              onClick={() => setShowAxes((a) => !a)}
              className={`p-1 rounded ${showAxes ? 'bg-gray-700 text-sky-400' : 'text-gray-400'}`}
              title="Toggle Coordinate Axes"
            >
              <Compass size={13} />
            </button>
          </div>

          {/* Reset Camera */}
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(is2dDrafting && realCadModel ? initialFitZoom : isBim ? 0.85 : 1);
              setRotation({ x: is2dDrafting ? 0 : 30, y: is2dDrafting ? 0 : -45 });
            }}
            className="p-1 hover:bg-gray-700 rounded text-gray-300"
            title="Reset Camera"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Main Viewport & Sidebars Split */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side Tool Drawer: Assembly / BIM Tree / AutoCAD Layers / Master-Detail Inspector */}
        {(activeTool === 'tree' || activeTool === 'properties') && (
          <div className="w-80 sm:w-96 bg-[#161922] border-r border-gray-800 flex flex-col shrink-0 text-xs z-10 animate-in slide-in-from-left-4 duration-150 shadow-2xl">
            <div className="p-3 border-b border-gray-800 flex items-center justify-between text-gray-200 font-semibold">
              <div className="flex items-center gap-2">
                {isBim ? (
                  <Building2 size={15} className="text-sky-400" />
                ) : (
                  <Layers size={15} className="text-sky-400" />
                )}
                <span>
                  {isBim
                    ? 'IFC Spatial Structure'
                    : is2dDrafting
                    ? 'AutoCAD Layers'
                    : 'Assembly Tree'}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">
                {is2dDrafting && cadLayers.length > 0
                  ? `${cadLayers.length} layers`
                  : `${elements.length} elements`}
              </span>
            </div>

            {is2dDrafting ? (
              <>
                {cadLayers.length > 0 && (
                  <>
                    <div className="flex border-b border-gray-800 text-[11px] bg-gray-900/60 shrink-0">
                      <button
                        onClick={() => setLayerViewMode('groups')}
                        className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
                          layerViewMode === 'groups'
                            ? 'border-blue-500 text-blue-400 bg-gray-800/40'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        Smart Groups
                      </button>
                      <button
                        onClick={() => setLayerViewMode('layers')}
                        className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
                          layerViewMode === 'layers'
                            ? 'border-blue-500 text-blue-400 bg-gray-800/40'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        All Layers ({cadLayers.length})
                      </button>
                    </div>

                    <div className="px-3 py-1.5 border-b border-gray-800 flex items-center justify-between gap-1 text-[10px] shrink-0 bg-gray-900/40">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCadLayers((prev) => prev.map((l) => ({ ...l, visible: true })))}
                          className="px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setCadLayers((prev) => prev.map((l) => ({ ...l, visible: false })))}
                          className="px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
                        >
                          None
                        </button>
                      </div>
                      <button
                        onClick={() =>
                          setCadLayers((prev) =>
                            prev.map((l) => ({
                              ...l,
                              visible: !['_0-5_', '_0-6_', '_0-0_'].includes(l.id),
                            }))
                          )
                        }
                        className="px-2 py-0.5 rounded bg-sky-900/60 hover:bg-sky-800 text-sky-300 font-medium transition-colors"
                        title="Hide dense ceiling tiles and show clean electrical routing"
                      >
                        Electrical Clean
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {layerViewMode === 'groups'
                        ? [
                            {
                              id: 'electrical',
                              name: '⚡ Electrical & Systems',
                              desc: 'Hệ thống Điện & Camera',
                              color: '#ff3f00',
                              layers: cadLayers.filter((l) => {
                                const n = l.name.toLowerCase();
                                return n.includes('dien') || n.includes('camera') || n.includes('elec');
                              }),
                            },
                            {
                              id: 'structure',
                              name: '🏛️ Structure & Walls',
                              desc: 'Tường, Cột, Cửa & Thang máy',
                              color: '#16a34a',
                              layers: cadLayers.filter((l) => {
                                const n = l.name.toLowerCase();
                                return ['_0-7_', '_1-0_', '_0-2_', 'mbkt'].includes(n);
                              }),
                            },
                            {
                              id: 'text',
                              name: '🏷️ Room Tags & Labels',
                              desc: 'Tên phòng & Ghi chú',
                              color: '#38bdf8',
                              layers: cadLayers.filter((l) => {
                                const n = l.name.toLowerCase();
                                return n.includes('font') || n.includes('text') || n.includes('chu');
                              }),
                            },
                            {
                              id: 'ceiling',
                              name: '▦ Ceiling Grid & Tiles',
                              desc: 'Lưới trần & Gạch hoàn thiện',
                              color: '#ec4899',
                              layers: cadLayers.filter((l) => {
                                const n = l.name.toLowerCase();
                                return ['_0-5_', '_0-6_', '_0-0_'].includes(n);
                              }),
                            },
                            {
                              id: 'dimensions',
                              name: '📐 Grid Axes & Dimensions',
                              desc: 'Trục định vị & Kích thước',
                              color: '#eab308',
                              layers: cadLayers.filter((l) => {
                                const n = l.name.toLowerCase();
                                return (
                                  !n.includes('dien') &&
                                  !n.includes('camera') &&
                                  !n.includes('elec') &&
                                  !['_0-7_', '_1-0_', '_0-2_', 'mbkt'].includes(n) &&
                                  !n.includes('font') &&
                                  !n.includes('text') &&
                                  !n.includes('chu') &&
                                  !['_0-5_', '_0-6_', '_0-0_'].includes(n)
                                );
                              }),
                            },
                          ]
                            .filter((g) => g.layers.length > 0)
                            .map((grp) => {
                              const anyVis = grp.layers.some((l) => l.visible);
                              const isExp = expandedGroups[grp.id] ?? false;
                              const totalEntities = grp.layers.reduce((acc, l) => acc + l.count, 0);

                              return (
                                <div
                                  key={grp.id}
                                  className="rounded-xl border border-gray-800/80 bg-gray-900/60 overflow-hidden"
                                >
                                  <div className="p-2 flex items-center justify-between hover:bg-gray-800/40 transition-colors">
                                    <div
                                      onClick={() =>
                                        setExpandedGroups((prev) => ({ ...prev, [grp.id]: !isExp }))
                                      }
                                      className="flex items-center gap-1.5 cursor-pointer flex-1 truncate select-none"
                                    >
                                      {isExp ? (
                                        <ChevronDown size={14} className="text-gray-400 shrink-0" />
                                      ) : (
                                        <ChevronRight size={14} className="text-gray-400 shrink-0" />
                                      )}
                                      <div className="truncate">
                                        <div className="font-semibold text-xs text-gray-200 truncate flex items-center gap-1">
                                          <span>{grp.name}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate">{grp.desc}</div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                                        {totalEntities}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const nextState = !anyVis;
                                          setCadLayers((prev) =>
                                            prev.map((l) =>
                                              grp.layers.some((gl) => gl.id === l.id)
                                                ? { ...l, visible: nextState }
                                                : l
                                            )
                                          );
                                        }}
                                        className="text-gray-400 hover:text-white p-0.5 rounded"
                                        title={anyVis ? 'Hide Group' : 'Show Group'}
                                      >
                                        {anyVis ? (
                                          <Eye size={14} className="text-sky-400" />
                                        ) : (
                                          <EyeOff size={14} className="text-gray-500" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {isExp && (
                                    <div className="pl-4 pr-2 pb-2 pt-1 border-t border-gray-800/60 space-y-1 bg-black/20">
                                      {grp.layers.map((layer) => (
                                        <div
                                          key={layer.id}
                                          className="p-1.5 rounded-lg flex items-center justify-between text-xs hover:bg-gray-800/40"
                                        >
                                          <div className="flex items-center gap-2 truncate">
                                            <button
                                              onClick={() =>
                                                setCadLayers((prev) =>
                                                  prev.map((l) =>
                                                    l.id === layer.id ? { ...l, visible: !l.visible } : l
                                                  )
                                                )
                                              }
                                              className="text-gray-400 hover:text-white"
                                            >
                                              {layer.visible ? (
                                                <Eye size={12} className="text-sky-400" />
                                              ) : (
                                                <EyeOff size={12} className="text-gray-500" />
                                              )}
                                            </button>
                                            <span
                                              className={`truncate ${
                                                layer.visible ? 'text-gray-300' : 'text-gray-500 line-through'
                                              }`}
                                            >
                                              {layer.name}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[10px] text-gray-500 font-mono">
                                              {layer.count}
                                            </span>
                                            <span
                                              className="w-2 h-2 rounded-full"
                                              style={{ backgroundColor: layer.color }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        : cadLayers.map((layer) => (
                            <div
                              key={layer.id}
                              className="p-2 rounded-xl border bg-gray-800/30 hover:bg-gray-800/60 border-transparent text-gray-300 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate">
                                  <button
                                    onClick={() =>
                                      setCadLayers((prev) =>
                                        prev.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l))
                                      )
                                    }
                                    className="text-gray-400 hover:text-white"
                                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                                  >
                                    {layer.visible ? (
                                      <Eye size={13} className="text-sky-400" />
                                    ) : (
                                      <EyeOff size={13} className="text-gray-500" />
                                    )}
                                  </button>
                                  <span
                                    className={`font-medium text-xs truncate ${
                                      layer.visible ? 'text-gray-200' : 'text-gray-500 line-through'
                                    }`}
                                  >
                                    {layer.name}
                                  </span>
                                </div>
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: layer.color }}
                                />
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400 pl-5 font-mono">
                                <span>{layer.count} entities</span>
                                <span className={layer.visible ? 'text-emerald-400' : 'text-gray-500'}>
                                  {layer.visible ? 'Visible' : 'Hidden'}
                                </span>
                              </div>
                            </div>
                          ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* 3D BIM Multi-Mode View Switcher Tabs */}
                <div className="flex border-b border-gray-800 text-[11px] bg-gray-900/70 shrink-0">
                  <button
                    onClick={() => setBimViewMode('storey')}
                    className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
                      bimViewMode === 'storey'
                        ? 'border-sky-500 text-sky-400 bg-gray-800/50'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    By Storey
                  </button>
                  <button
                    onClick={() => setBimViewMode('discipline')}
                    className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
                      bimViewMode === 'discipline'
                        ? 'border-sky-500 text-sky-400 bg-gray-800/50'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    By Trade
                  </button>
                  <button
                    onClick={() => setBimViewMode('class')}
                    className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
                      bimViewMode === 'class'
                        ? 'border-sky-500 text-sky-400 bg-gray-800/50'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    By Class
                  </button>
                </div>

                {/* Storey Quick Filter Bar */}
                {bimViewMode === 'storey' && (
                  <div className="px-2.5 py-1.5 border-b border-gray-800 flex items-center gap-1 text-[10px] bg-gray-900/40 overflow-x-auto shrink-0">
                    <span className="text-gray-500 uppercase font-semibold text-[9px] mr-1">Level:</span>
                    {[
                      { id: 'all', label: 'All Levels' },
                      { id: 'l2', label: 'Roof' },
                      { id: 'l1', label: 'Level 1' },
                      { id: 'l0', label: 'Foundation' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setActiveStoreyFilter(st.id)}
                        className={`px-2 py-0.5 rounded-full transition-colors font-mono shrink-0 ${
                          activeStoreyFilter === st.id
                            ? 'bg-sky-600 text-white font-bold'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search / Filter Input */}
                <div className="p-2 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2 shrink-0">
                  <Search size={13} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search components, class, material..."
                    className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-white"
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* BIM Hierarchy Groups List (Upper Half of Master-Detail) */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[160px] max-h-[48%] border-b border-gray-800">
                  {(() => {
                    const groups =
                      bimViewMode === 'storey'
                        ? bimStoreys
                        : bimViewMode === 'discipline'
                        ? bimDisciplines
                        : bimClasses;

                    const filteredGroups = groups
                      .map((grp) => {
                        const matchingEls = grp.elements.filter((el) => {
                          if (searchQuery.trim()) {
                            const q = searchQuery.toLowerCase();
                            const matchName = el.name.toLowerCase().includes(q);
                            const matchCat = el.category.toLowerCase().includes(q);
                            const matchClass = (el.ifcClass || '').toLowerCase().includes(q);
                            const matchProps = Object.values(el.properties).some((v) =>
                              v.toLowerCase().includes(q)
                            );
                            return matchName || matchCat || matchClass || matchProps;
                          }
                          return true;
                        });
                        return { ...grp, elements: matchingEls };
                      })
                      .filter((grp) => grp.elements.length > 0);

                    if (filteredGroups.length === 0) {
                      return (
                        <div className="p-4 text-center text-gray-500 text-xs">
                          No matching components found for "{searchQuery}".
                        </div>
                      );
                    }

                    return filteredGroups.map((grp) => {
                      const isExp = expandedBimGroups[grp.id] ?? true;
                      const anyVis = grp.elements.some((el) => el.visible);
                      const allVis = grp.elements.every((el) => el.visible);

                      return (
                        <div
                          key={grp.id}
                          className="rounded-xl border border-gray-800/80 bg-gray-900/50 overflow-hidden"
                        >
                          {/* Group Header */}
                          <div className="p-2 flex items-center justify-between hover:bg-gray-800/40 transition-colors">
                            <div
                              onClick={() =>
                                setExpandedBimGroups((prev) => ({
                                  ...prev,
                                  [grp.id]: !isExp,
                                }))
                              }
                              className="flex items-center gap-1.5 cursor-pointer flex-1 truncate select-none"
                            >
                              {isExp ? (
                                <ChevronDown size={14} className="text-gray-400 shrink-0" />
                              ) : (
                                <ChevronRight size={14} className="text-gray-400 shrink-0" />
                              )}
                              <div className="truncate">
                                <div className="font-semibold text-xs text-gray-200 truncate flex items-center gap-1.5">
                                  <span>{grp.name}</span>
                                  {(grp as any).elevation && (
                                    <span className="text-[10px] text-sky-400 font-mono">
                                      {(grp as any).elevation}
                                    </span>
                                  )}
                                </div>
                                {(grp as any).desc && (
                                  <div className="text-[10px] text-gray-400 truncate">
                                    {(grp as any).desc}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                                {grp.elements.length}
                              </span>
                              <button
                                onClick={() => {
                                  const nextState = !anyVis;
                                  setElements((prev) =>
                                    prev.map((el) =>
                                      grp.elements.some((ge) => ge.id === el.id)
                                        ? { ...el, visible: nextState }
                                        : el
                                    )
                                  );
                                }}
                                className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-gray-800"
                                title={allVis ? 'Hide all in group' : 'Show all in group'}
                              >
                                {anyVis ? (
                                  <Eye size={13} className="text-sky-400" />
                                ) : (
                                  <EyeOff size={13} className="text-gray-500" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Children Elements */}
                          {isExp && (
                            <div className="pl-3 pr-2 pb-2 pt-1 border-t border-gray-800/60 space-y-1 bg-black/20">
                              {grp.elements.map((el) => {
                                const isSelected = el.id === selectedElementId;
                                const isHovered = el.id === hoveredElementId;

                                return (
                                  <div
                                    key={el.id}
                                    onMouseEnter={() => setHoveredElementId(el.id)}
                                    onMouseLeave={() => setHoveredElementId(null)}
                                    onClick={() => setSelectedElementId(el.id)}
                                    className={`p-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all border ${
                                      isSelected
                                        ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-xs'
                                        : isHovered
                                        ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                                        : 'bg-gray-800/20 hover:bg-gray-800/50 border-transparent text-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleElementVisibility(el.id);
                                        }}
                                        className="text-gray-400 hover:text-white p-0.5"
                                        title={el.visible ? 'Hide Element' : 'Show Element'}
                                      >
                                        {el.visible ? (
                                          <Eye size={12} className="text-sky-400" />
                                        ) : (
                                          <EyeOff size={12} className="text-gray-500" />
                                        )}
                                      </button>
                                      <div className="truncate">
                                        <div className="font-medium text-xs truncate">
                                          {el.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono truncate">
                                          {el.category}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedElementId(el.id);
                                          fitToView(el.id);
                                        }}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-gray-800 hover:bg-sky-700 text-gray-300 hover:text-white transition-colors"
                                        title="Focus & Select in Viewport (F)"
                                      >
                                        Focus
                                      </button>
                                      <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: el.color }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Docked Master-Detail Properties Inspector & Quantity Takeoff (Lower Half) */}
                <div className="flex-1 flex flex-col overflow-hidden bg-gray-950/60">
                  {selectedElement ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-150">
                      <div className="p-2.5 border-b border-gray-800 bg-gray-900/80 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <Info size={14} className="text-amber-400 shrink-0" />
                          <div className="truncate">
                            <h4 className="font-bold text-xs text-white truncate">
                              {selectedElement.name}
                            </h4>
                            <span className="text-[10px] text-sky-400 font-mono">
                              {selectedElement.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => fitToView(selectedElement.id)}
                            className="p-1 rounded bg-gray-800 hover:bg-sky-600 text-gray-300 hover:text-white transition-colors"
                            title="Focus in Canvas (F)"
                          >
                            <Focus size={12} />
                          </button>
                          <button
                            onClick={() => setSelectedElementId(null)}
                            className="p-1 rounded bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
                            title="Deselect element"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          <span>BIM Property Sets</span>
                          <span className="font-mono text-amber-400">
                            {Object.keys(selectedElement.properties).length} attributes
                          </span>
                        </div>
                        {Object.entries(selectedElement.properties).map(([k, v]) => (
                          <div
                            key={k}
                            className="p-2 bg-gray-900/60 rounded-lg border border-gray-800/80 hover:border-gray-700 transition-colors"
                          >
                            <div className="text-[10px] text-gray-400">{k}</div>
                            <div className="text-xs text-gray-100 font-mono font-medium mt-0.5 break-words">
                              {v}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col justify-between text-gray-400">
                      <div>
                        <div className="flex items-center gap-1.5 text-sky-400 font-semibold mb-2">
                          <Sparkles size={14} />
                          <span>BIM Model Overview & Takeoff</span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800/60 font-mono">
                            <span className="text-gray-400">Total Gross Area:</span>
                            <span className="text-white font-bold">342.50 m²</span>
                          </div>
                          <div className="flex justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800/60 font-mono">
                            <span className="text-gray-400">IFC Schema:</span>
                            <span className="text-sky-300 font-bold">IFC4 Add2 TC1</span>
                          </div>
                          <div className="flex justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800/60 font-mono">
                            <span className="text-gray-400">Structural Frame:</span>
                            <span className="text-white">Cast Concrete C35 + HEB400</span>
                          </div>
                          <div className="flex justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800/60 font-mono">
                            <span className="text-gray-400">Fire Safety Rating:</span>
                            <span className="text-emerald-400 font-bold">REI 120 / REI 180</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-sky-950/30 border border-sky-800/40 text-[10px] text-sky-300 mt-2">
                        💡 <strong>Smart Canvas Tip:</strong> Click any 3D face directly on the canvas
                        or press <kbd className="bg-gray-800 px-1 py-0.5 rounded text-white">F</kbd> to
                        focus on elements.
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Sectioning (Clipping Plane) Floating Overlay */}
        {activeTool === 'clipping' && (
          <div className="absolute top-3 left-3 z-20 w-72 bg-[#161922]/95 backdrop-blur-md border border-gray-800 rounded-2xl p-3 text-xs text-gray-200 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800 font-semibold">
              <div className="flex items-center gap-1.5 text-sky-400">
                <Scissors size={14} />
                <span>Dynamic 3-Axis Sectioning</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setClipping((c) => ({ ...c, enabled: !c.enabled }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    clipping.enabled ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {clipping.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setActiveTool('none')}
                  className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  title="Close Sectioning Panel"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Cutting Axis
                </label>
                <div className="grid grid-cols-3 gap-1 bg-gray-800 p-0.5 rounded-lg">
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <button
                      key={axis}
                      onClick={() => setClipping((c) => ({ ...c, axis }))}
                      className={`py-1 rounded text-center uppercase font-mono font-bold text-xs ${
                        clipping.axis === axis ? 'bg-blue-600 text-white' : 'text-gray-400'
                      }`}
                    >
                      {axis} Axis
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-gray-400">Plane Position:</span>
                  <span className="font-mono text-sky-400">{clipping.offset} mm</span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  value={clipping.offset}
                  onChange={(e) => setClipping((c) => ({ ...c, offset: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>

              <button
                onClick={() => setClipping((c) => ({ ...c, inverted: !c.inverted }))}
                className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs transition-colors"
              >
                Flip Normal Direction ({clipping.inverted ? 'Inverted' : 'Standard'})
              </button>
            </div>
          </div>
        )}

        {/* Exploded View Assembly Slider Overlay */}
        {activeTool === 'explode' && (
          <div className="absolute top-3 left-3 z-20 w-72 bg-[#161922]/95 backdrop-blur-md border border-gray-800 rounded-2xl p-3 text-xs text-gray-200 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800 font-semibold text-sky-400">
              <div className="flex items-center gap-1.5">
                <Move size={14} />
                <span>Assembly Exploded View</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-400 font-bold">{explodeFactor}%</span>
                <button
                  onClick={() => setActiveTool('none')}
                  className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  title="Close Exploded View Panel"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={explodeFactor}
                onChange={(e) => setExplodeFactor(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>Assembled (0%)</span>
                <span>Fully Exploded (100%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Measure Tool Floating Banner */}
        {measureMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#161922]/95 backdrop-blur-md border border-red-500/50 rounded-2xl px-4 py-2 text-xs text-gray-200 shadow-2xl flex items-center gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-medium text-red-400">Measurement Active:</span>
              <span className="text-gray-300 text-[11px]">
                {measurePoints.length === 0
                  ? 'Click Point A on model'
                  : measurePoints.length === 1
                  ? 'Click Point B on model'
                  : 'Point-to-Point distance calculated'}
              </span>
            </div>
            {measurePoints.length > 0 && (
              <button
                onClick={() => setMeasurePoints([])}
                className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px]"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Main Canvas Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 relative overflow-hidden flex items-center justify-center ${
            measureMode
              ? 'cursor-crosshair'
              : isDragging
              ? dragMode === 'pan'
                ? 'cursor-grabbing'
                : 'cursor-crosshair'
              : 'cursor-grab'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-gray-400 animate-pulse px-4 text-center">
              <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">{statusText}</span>
            </div>
          ) : parseError ? (
            <div className="flex flex-col items-center gap-3 text-red-400 px-6 text-center max-w-md">
              <AlertCircle size={36} className="text-red-500" />
              <h4 className="text-sm font-semibold text-white">Unable to Parse CAD Drawing</h4>
              <p className="text-xs text-gray-400">{parseError}</p>
            </div>
          ) : (
            <canvas ref={canvasRef} className="w-full h-full block" />
          )}

          {/* BIM Element Hover HUD Tooltip */}
          {hoveredElement && mouseScreenPos && !isDragging && (
            <div
              className="pointer-events-none fixed z-50 px-3 py-2 rounded-xl bg-gray-950/90 backdrop-blur-md border border-sky-500/40 text-white shadow-2xl text-xs flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 min-w-[170px]"
              style={{
                left: mouseScreenPos.x + 16,
                top: mouseScreenPos.y + 16,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: hoveredElement.color || '#38bdf8' }}
                />
                <span className="font-bold text-xs text-white truncate max-w-[180px]">
                  {hoveredElement.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-300 font-mono">
                <span className="text-sky-400 font-semibold">{hoveredElement.category}</span>
                {hoveredElement.storey && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-amber-300">{hoveredElement.storey}</span>
                  </>
                )}
              </div>
              {hoveredElement.ifcClass && (
                <div className="text-[9px] text-gray-400 font-mono">
                  IFC: <span className="text-emerald-400">{hoveredElement.ifcClass}</span>
                </div>
              )}
            </div>
          )}

          {/* Synchronized 3D Interactive ViewCube & Compass */}
          {!is2dDrafting && !loading && (
            <div className="absolute top-3 right-3 z-20 flex flex-col items-center select-none group">
              <div className="relative w-28 h-28 bg-[#161922]/90 backdrop-blur-md border border-gray-700/60 rounded-2xl shadow-2xl flex items-center justify-center p-1 overflow-hidden">
                <svg
                  width="112"
                  height="112"
                  viewBox="0 0 112 112"
                  className="overflow-visible"
                >
                  {/* Outer Compass Circular Track */}
                  <circle
                    cx="56"
                    cy="56"
                    r="50"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />

                  {/* Compass Cardinals (N, E, S, W) rotating with rotation.y */}
                  {(() => {
                    const yawRad = (-rotation.y * Math.PI) / 180;
                    const r = 48;
                    const cardinals = [
                      { label: 'N', angle: -Math.PI / 2, color: '#f87171' },
                      { label: 'E', angle: 0, color: '#94a3b8' },
                      { label: 'S', angle: Math.PI / 2, color: '#94a3b8' },
                      { label: 'W', angle: Math.PI, color: '#94a3b8' },
                    ];
                    return cardinals.map((c) => {
                      const a = c.angle + yawRad;
                      const x = 56 + r * Math.cos(a);
                      const y = 56 + r * Math.sin(a);
                      return (
                        <text
                          key={c.label}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="8"
                          fontWeight="bold"
                          fill={c.color}
                        >
                          {c.label}
                        </text>
                      );
                    });
                  })()}

                  {/* 3D Rotating ViewCube Faces */}
                  {(() => {
                    const rx = (rotation.x * Math.PI) / 180;
                    const ry = (rotation.y * Math.PI) / 180;
                    const camX = -Math.sin(ry) * Math.cos(rx);
                    const camY = -Math.sin(rx);
                    const camZ = Math.cos(ry) * Math.cos(rx);
                    const s = 22;

                    const cubeFaces: {
                      id: 'top' | 'bottom' | 'front' | 'back' | 'right' | 'left';
                      label: string;
                      norm: [number, number, number];
                      baseColor: string;
                      hoverColor: string;
                      pts: [number, number, number][];
                    }[] = [
                      {
                        id: 'front',
                        label: 'FRONT',
                        norm: [0, 0, 1],
                        baseColor: '#2563eb',
                        hoverColor: '#3b82f6',
                        pts: [
                          [-s, -s, s],
                          [s, -s, s],
                          [s, s, s],
                          [-s, s, s],
                        ],
                      },
                      {
                        id: 'back',
                        label: 'BACK',
                        norm: [0, 0, -1],
                        baseColor: '#1e293b',
                        hoverColor: '#334155',
                        pts: [
                          [s, -s, -s],
                          [-s, -s, -s],
                          [-s, s, -s],
                          [s, s, -s],
                        ],
                      },
                      {
                        id: 'top',
                        label: 'TOP',
                        norm: [0, -1, 0],
                        baseColor: '#3b82f6',
                        hoverColor: '#60a5fa',
                        pts: [
                          [-s, -s, -s],
                          [s, -s, -s],
                          [s, -s, s],
                          [-s, -s, s],
                        ],
                      },
                      {
                        id: 'bottom',
                        label: 'BOTTOM',
                        norm: [0, 1, 0],
                        baseColor: '#0f172a',
                        hoverColor: '#1e293b',
                        pts: [
                          [-s, s, s],
                          [s, s, s],
                          [s, s, -s],
                          [-s, s, -s],
                        ],
                      },
                      {
                        id: 'right',
                        label: 'RIGHT',
                        norm: [1, 0, 0],
                        baseColor: '#0284c7',
                        hoverColor: '#38bdf8',
                        pts: [
                          [s, -s, s],
                          [s, -s, -s],
                          [s, s, -s],
                          [s, s, s],
                        ],
                      },
                      {
                        id: 'left',
                        label: 'LEFT',
                        norm: [-1, 0, 0],
                        baseColor: '#1d4ed8',
                        hoverColor: '#2563eb',
                        pts: [
                          [-s, -s, -s],
                          [-s, -s, s],
                          [-s, s, s],
                          [-s, s, -s],
                        ],
                      },
                    ];

                    // Filter front-facing faces (dot > 0.05) and sort back-to-front
                    const visibleFaces = cubeFaces
                      .map((f) => {
                        const dot = f.norm[0] * camX + f.norm[1] * camY + f.norm[2] * camZ;
                        const proj = f.pts.map((pt) => project3D(pt[0], pt[1], pt[2], rx, ry));
                        const avgZ = proj.reduce((acc, p) => acc + p.z, 0) / 4;
                        const midX = 56 + proj.reduce((acc, p) => acc + p.x, 0) / 4;
                        const midY = 56 + proj.reduce((acc, p) => acc + p.y, 0) / 4;
                        const pointsStr = proj
                          .map((p) => `${(56 + p.x).toFixed(1)},${(56 + p.y).toFixed(1)}`)
                          .join(' ');
                        return { ...f, dot, proj, avgZ, midX, midY, pointsStr };
                      })
                      .filter((f) => f.dot > 0.05)
                      .sort((a, b) => a.avgZ - b.avgZ);

                    return visibleFaces.map((face) => (
                      <g
                        key={face.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewAngle(face.id);
                        }}
                        className="cursor-pointer transition-transform duration-100 hover:brightness-125"
                      >
                        <polygon
                          points={face.pointsStr}
                          fill={face.baseColor}
                          fillOpacity={0.88}
                          stroke="#ffffff"
                          strokeWidth="1"
                          strokeOpacity={0.4}
                        />
                        <text
                          x={face.midX}
                          y={face.midY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="8"
                          fontWeight="bold"
                          fill="#ffffff"
                          pointerEvents="none"
                          className="drop-shadow-sm select-none"
                        >
                          {face.label}
                        </text>
                      </g>
                    ));
                  })()}
                </svg>
              </div>

              {/* View Presets Quick Pill Bar */}
              <div className="mt-1 flex items-center gap-1 bg-[#161922]/90 backdrop-blur-md border border-gray-700/60 rounded-full px-2 py-0.5 shadow-md text-[9px] font-mono">
                <button
                  onClick={() => setViewAngle('iso')}
                  className="px-1.5 py-0.5 rounded text-gray-300 hover:text-white hover:bg-gray-800 transition-colors font-semibold"
                  title="Isometric Perspective (30°, -45°)"
                >
                  ISO
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={() => setViewAngle('top')}
                  className="px-1.5 py-0.5 rounded text-gray-300 hover:text-white hover:bg-gray-800 transition-colors font-semibold"
                  title="Plan / Top View (90°)"
                >
                  TOP
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={() => setViewAngle('front')}
                  className="px-1.5 py-0.5 rounded text-gray-300 hover:text-white hover:bg-gray-800 transition-colors font-semibold"
                  title="Front Elevation (0°)"
                >
                  FRONT
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={() => {
                    setRotation({ x: 30, y: -45 });
                    setPan({ x: 0, y: 0 });
                    setZoom(1.0);
                  }}
                  className="p-0.5 rounded text-gray-400 hover:text-sky-400 hover:bg-gray-800 transition-colors"
                  title="Reset Camera"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
