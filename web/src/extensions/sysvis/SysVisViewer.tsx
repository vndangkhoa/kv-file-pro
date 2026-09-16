import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useReactFlow,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Workflow,
  Play,
  Zap,
  Code,
  Eye,
  Download,
  ArrowDownUp,
  ArrowLeftRight,
  Spline,
  Minus,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { PreviewExtensionProps } from '../../types';
import { formatHumanSize } from '../../utils/format';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { nodeTypes } from './CustomNodes';
import { edgeTypes, EdgeDefs } from './AnimatedEdge';
import { parseMermaid, detectFlowDirection } from './mermaidParser';
import { parseJsonWorkflow, isWorkflowJson } from './jsonWorkflowParser';
import { getLayoutedElements } from './layoutEngine';

interface FlowCanvasInnerProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<Node>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  isDark: boolean;
}

function FlowCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  isDark,
}: FlowCanvasInnerProps) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [fitView, nodes.length]);

  return (
    <div className="w-full h-full relative sysvis-flow-container">
      <style>{`
        .sysvis-flow-container .react-flow__node:not(.react-flow__node-group),
        .sysvis-flow-container .react-flow__node-default,
        .sysvis-flow-container .react-flow__node-input,
        .sysvis-flow-container .react-flow__node-output {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          border-color: transparent !important;
          border-width: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          width: auto !important;
        }
        .sysvis-flow-container .react-flow__node-group {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          border-color: transparent !important;
          border-width: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .sysvis-flow-container .react-flow {
          --xy-node-border-default: none !important;
          --xy-node-border: none !important;
          --xy-node-background-color-default: transparent !important;
          --xy-node-background-color: transparent !important;
          --xy-node-boxshadow-hover-default: none !important;
          --xy-node-boxshadow-default: none !important;
          --xy-node-border-radius-default: 0 !important;
        }
      `}</style>
      <EdgeDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        minZoom={0.1}
        maxZoom={4}
        panOnDrag={true}
        zoomOnScroll={true}
        proOptions={{ hideAttribution: true }}
        colorMode={isDark ? 'dark' : 'light'}
        style={{ backgroundColor: 'transparent' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(100, 116, 139, 0.25)'}
        />
      </ReactFlow>
    </div>
  );
}

export const SysVisViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
  onDownload,
}) => {
  const [rawCode, setRawCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flow State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Studio Controls
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');
  const [speedMode, setSpeedMode] = useState<'normal' | 'fast' | 'paused'>('normal');
  const [curved, setCurved] = useState(true);
  const [copied, setCopied] = useState(false);

  const storeTheme = useSettingsStore((s) => s.preferences.theme);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  useEffect(() => {
    const updateTheme = () => {
      if (typeof document !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [storeTheme]);

  // 1. Fetch Diagram Source
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(fileUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load diagram file`);
        return res.text();
      })
      .then(async (code) => {
        if (cancelled) return;
        setRawCode(code);

        try {
          const trimmed = code.trim();
          let parsed: { nodes: Node[]; edges: Edge[] } | null = null;
          let initialDir: 'TB' | 'LR' = 'TB';

          if (isWorkflowJson(trimmed)) {
            parsed = parseJsonWorkflow(trimmed);
            initialDir = 'TB';
          }

          if (!parsed) {
            // Detect initial flow direction for Mermaid
            const dir = detectFlowDirection(code);
            initialDir = dir === 'LR' || dir === 'RL' ? 'LR' : 'TB';
            parsed = await parseMermaid(code);
          }

          setDirection(initialDir);

          const layouted = getLayoutedElements(parsed.nodes, parsed.edges, {
            direction: initialDir,
          });

          setNodes(layouted.nodes);
          setEdges(layouted.edges);
        } catch (e: any) {
          setError(e.message || 'Failed to parse diagram syntax');
        } finally {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Error fetching diagram content');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // 2. Dynamic Edge State Updates (Speed & Curves)
  const configuredEdges = useMemo(() => {
    const speedSeconds = speedMode === 'fast' ? 1.0 : 2.2;
    const isPaused = speedMode === 'paused';

    return edges.map((edge) => ({
      ...edge,
      type: 'animated',
      data: {
        ...edge.data,
        curved,
        paused: isPaused,
        speed: speedSeconds,
      },
    }));
  }, [edges, speedMode, curved]);

  // 3. Re-layout on Direction Change
  const handleToggleDirection = () => {
    const nextDir = direction === 'TB' ? 'LR' : 'TB';
    setDirection(nextDir);
    const layouted = getLayoutedElements(nodes, edges, { direction: nextDir });
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  };

  const handleCopyCode = () => {
    if (rawCode) {
      navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-[#12141c] text-slate-900 dark:text-slate-100 select-none overflow-hidden relative font-sans">
      {/* Top Studio Control Bar */}
      <div className="h-11 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#171a26]/95 backdrop-blur-md px-3 flex items-center justify-between gap-2 shrink-0 z-20">
        {/* Left: Metadata & Pills */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 text-[11px] font-semibold">
            <Workflow size={14} className="animate-pulse" />
            <span>SysVis Animator</span>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono hidden md:inline truncate">
            {fileName}
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">
            ({formatHumanSize(fileSize)})
          </span>

          {!loading && !error && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 ml-1">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                {nodes.length} nodes
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                {edges.length} connections
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle: Canvas vs Code */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all text-xs font-medium ${
                viewMode === 'visual'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Eye size={13} />
              <span className="hidden sm:inline">Canvas</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all text-xs font-medium ${
                viewMode === 'code'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Code size={13} />
              <span className="hidden sm:inline">Syntax</span>
            </button>
          </div>

          {viewMode === 'visual' && !loading && !error && (
            <>
              {/* Direction Toggle */}
              <button
                onClick={handleToggleDirection}
                title={`Layout: ${direction === 'TB' ? 'Top to Bottom' : 'Left to Right'}`}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 text-[11px] font-semibold"
              >
                {direction === 'TB' ? <ArrowDownUp size={14} /> : <ArrowLeftRight size={14} />}
                <span className="hidden sm:inline font-mono">{direction}</span>
              </button>

              {/* Curve Style Toggle */}
              <button
                onClick={() => setCurved((c) => !c)}
                title={`Edge style: ${curved ? 'Curved Bezier' : 'Straight Orthogonal'}`}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors hidden sm:flex items-center"
              >
                {curved ? <Spline size={14} /> : <Minus size={14} />}
              </button>

              {/* Animation Speed Mode */}
              <button
                onClick={() =>
                  setSpeedMode((s) =>
                    s === 'normal' ? 'fast' : s === 'fast' ? 'paused' : 'normal'
                  )
                }
                title={`Motion Animation: ${speedMode.toUpperCase()}`}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                  speedMode === 'fast'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                    : speedMode === 'paused'
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {speedMode === 'paused' ? (
                  <Play size={12} className="fill-current" />
                ) : speedMode === 'fast' ? (
                  <Zap size={12} className="fill-current" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                )}
                <span className="capitalize">{speedMode}</span>
              </button>
            </>
          )}

          {/* Download File */}
          {onDownload && (
            <button
              onClick={onDownload}
              title="Download diagram file"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Download size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-slate-400 animate-pulse">
              Compiling architecture graph & calculating layout...
            </p>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-3">
              <AlertCircle size={24} />
            </div>
            <h4 className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">
              Unable to Render Diagram
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md font-mono mb-4">
              {error}
            </p>
            <button
              onClick={() => setViewMode('code')}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              View Raw Syntax
            </button>
          </div>
        ) : viewMode === 'code' ? (
          /* Raw Code View */
          <div className="w-full h-full flex flex-col bg-slate-950 text-slate-200 font-mono text-xs overflow-auto p-4 relative">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="select-text whitespace-pre-wrap leading-relaxed">
              {rawCode}
            </pre>
          </div>
        ) : (
          /* Interactive React Flow Canvas */
          <div className="w-full h-full relative">
            <ReactFlowProvider>
              <FlowCanvasInner
                nodes={nodes}
                edges={configuredEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                isDark={isDark}
              />
            </ReactFlowProvider>

            {/* Bottom floating guide / info pill */}
            <div className="absolute bottom-3 left-3 pointer-events-none z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-md text-[10px] text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Scroll to Zoom • Drag to Pan • Dynamic Pulse Edges Active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
