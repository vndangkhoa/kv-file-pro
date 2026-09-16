import React from 'react';
import { BaseEdge, getSmoothStepPath, getBezierPath, Position, EdgeLabelRenderer } from '@xyflow/react';

export interface AnimatedEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  style?: React.CSSProperties;
  markerEnd?: string;
  label?: any;
  data?: {
    curved?: boolean;
    offset?: number;
    speed?: number; // duration in seconds
    paused?: boolean;
    color?: string;
  };
}

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
}: AnimatedEdgeProps) {
  const isCurved = data?.curved !== false;
  const offset = data?.offset || 0;
  const paused = data?.paused || false;

  // Apply offset for parallel edges
  const offsetX = sourcePosition === Position.Left || sourcePosition === Position.Right ? 0 : offset;
  const offsetY = sourcePosition === Position.Top || sourcePosition === Position.Bottom ? 0 : offset;

  // Check if edge is reverse / feedback (target is behind source)
  const isReverse =
    (sourcePosition === Position.Right && targetX < sourceX) ||
    (sourcePosition === Position.Left && targetX > sourceX) ||
    (sourcePosition === Position.Bottom && targetY < sourceY) ||
    (sourcePosition === Position.Top && targetY > sourceY);

  const isSameSide = sourcePosition === targetPosition;
  const isLateral =
    (sourcePosition === Position.Left || sourcePosition === Position.Right) &&
    (targetPosition === Position.Left || targetPosition === Position.Right);

  // Use SmoothStep for reverse loops, same-side handles, lateral long jumps, or non-curved edges
  const useSmoothStep =
    isReverse || isSameSide || !isCurved || (isLateral && Math.abs(targetY - sourceY) > 60);

  const [edgePath, labelX, labelY] = !useSmoothStep
    ? getBezierPath({
        sourceX: sourceX + offsetX,
        sourceY: sourceY + offsetY,
        sourcePosition,
        targetX: targetX + offsetX,
        targetY: targetY + offsetY,
        targetPosition,
        curvature: 0.25,
      })
    : getSmoothStepPath({
        sourceX: sourceX + offsetX,
        sourceY: sourceY + offsetY,
        sourcePosition,
        targetX: targetX + offsetX,
        targetY: targetY + offsetY,
        targetPosition,
        borderRadius: 16,
        offset: isReverse || isSameSide ? 40 : 20,
      });

  const isDashed = Boolean(style?.strokeDasharray);
  const strokeColor = data?.color || (isDashed ? '#94a3b8' : '#6366f1');
  const duration = data?.speed ? `${data.speed}s` : (isDashed ? '4s' : '2.2s');

  return (
    <>
      {/* Glow path behind edge */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={5}
        strokeOpacity={0.18}
        style={{ filter: 'blur(3px)' }}
      />

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd || 'url(#sysvis-arrow)'}
        style={{
          strokeWidth: 2,
          stroke: strokeColor,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          ...style,
        }}
      />

      {/* Animated traveling dot along connector */}
      {!paused && (
        <circle r="3.5" fill={strokeColor} className="drop-shadow-sm">
          <animateMotion dur={duration} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Edge label - centered on the line */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
            }}
            className="px-2 py-0.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs border border-gray-200 dark:border-gray-700 rounded-md text-[10px] font-semibold text-gray-600 dark:text-gray-300 shadow-xs whitespace-nowrap max-w-[220px] overflow-hidden text-ellipsis select-none"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export function StraightEdge(props: AnimatedEdgeProps) {
  return <AnimatedEdge {...props} data={{ ...props.data, curved: false }} />;
}

export function CurvedEdge(props: AnimatedEdgeProps) {
  return <AnimatedEdge {...props} data={{ ...props.data, curved: true }} />;
}

export function EdgeDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <marker
          id="sysvis-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
        </marker>
        <marker
          id="sysvis-arrow-dashed"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>
    </svg>
  );
}

export const edgeTypes = {
  animated: AnimatedEdge,
  curved: CurvedEdge,
  straight: StraightEdge,
  default: AnimatedEdge,
};
