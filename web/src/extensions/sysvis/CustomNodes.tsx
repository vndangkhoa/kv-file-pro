import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import {
  Database,
  Cpu,
  Users,
  Globe,
  Server,
  Zap,
  Play,
  Square,
  GitBranch,
} from 'lucide-react';

export const NODE_STYLES = {
  ai: {
    bg: 'bg-violet-500/15 dark:bg-violet-500/20',
    solid: 'bg-violet-100 dark:bg-violet-900',
    border: 'border-violet-500',
    text: 'text-violet-700 dark:text-violet-200',
    textSolid: 'text-violet-700 dark:text-violet-300',
    icon: Cpu,
    glow: 'shadow-violet-500/20',
  },
  team: {
    bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    solid: 'bg-amber-100 dark:bg-amber-900',
    border: 'border-amber-500',
    text: 'text-amber-800 dark:text-amber-200',
    textSolid: 'text-amber-800 dark:text-amber-300',
    icon: Users,
    glow: 'shadow-amber-500/20',
  },
  platform: {
    bg: 'bg-pink-500/15 dark:bg-pink-500/20',
    solid: 'bg-pink-100 dark:bg-pink-900',
    border: 'border-pink-500',
    text: 'text-pink-700 dark:text-pink-300',
    textSolid: 'text-pink-700 dark:text-pink-300',
    icon: Globe,
    glow: 'shadow-pink-500/20',
  },
  data: {
    bg: 'bg-cyan-500/15 dark:bg-cyan-500/20',
    solid: 'bg-cyan-100 dark:bg-cyan-900',
    border: 'border-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
    textSolid: 'text-cyan-800 dark:text-cyan-300',
    icon: Database,
    glow: 'shadow-cyan-500/20',
  },
  tech: {
    bg: 'bg-slate-500/15 dark:bg-slate-500/20',
    solid: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-500',
    text: 'text-slate-700 dark:text-slate-300',
    textSolid: 'text-slate-700 dark:text-slate-200',
    icon: Server,
    glow: 'shadow-slate-500/20',
  },
  start: {
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    solid: 'bg-emerald-100 dark:bg-emerald-900',
    border: 'border-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    textSolid: 'text-emerald-700 dark:text-emerald-300',
    icon: Play,
    glow: 'shadow-emerald-500/20',
  },
  end: {
    bg: 'bg-rose-500/15 dark:bg-rose-500/20',
    solid: 'bg-rose-100 dark:bg-rose-900',
    border: 'border-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    textSolid: 'text-rose-700 dark:text-rose-300',
    icon: Square,
    glow: 'shadow-rose-500/20',
  },
  decision: {
    bg: 'bg-purple-500/15 dark:bg-purple-500/20',
    solid: 'bg-purple-100 dark:bg-purple-900',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    textSolid: 'text-purple-700 dark:text-purple-300',
    icon: GitBranch,
    glow: 'shadow-purple-500/20',
  },
  default: {
    bg: 'bg-blue-500/15 dark:bg-blue-500/20',
    solid: 'bg-blue-100 dark:bg-blue-900',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    textSolid: 'text-blue-700 dark:text-blue-300',
    icon: Zap,
    glow: 'shadow-blue-500/20',
  },
};

export type NodeStyleKey = keyof typeof NODE_STYLES;

export function getNodeStyle(label: string = '', type?: string): NodeStyleKey {
  const l = label.toLowerCase();
  if (type === 'start' || type === 'startNode') return 'start';
  if (type === 'end' || type === 'endNode') return 'end';
  if (type === 'decision' || type === 'decisionNode') return 'decision';
  if (type === 'database' || type === 'databaseNode') return 'data';

  if (
    l.includes('approve') ||
    l.includes('decision') ||
    l.includes('verify') ||
    l.includes('check') ||
    l.includes('validate') ||
    l.includes('confirm') ||
    l.includes('?')
  )
    return 'decision';
  if (l.includes('ai') || l.includes('director') || l.includes('generate') || l.includes('neural'))
    return 'ai';
  if (
    l.includes('intern') ||
    l.includes('team') ||
    l.includes('edit') ||
    l.includes('review') ||
    l.includes('publish') ||
    l.includes('fine') ||
    l.includes('human')
  )
    return 'team';
  if (
    l.includes('platform') ||
    l.includes('tiktok') ||
    l.includes('shop') ||
    l.includes('youtube') ||
    l.includes('instagram')
  )
    return 'platform';
  if (
    l.includes('data') ||
    l.includes('analyst') ||
    l.includes('feedback') ||
    l.includes('collect') ||
    l.includes('ctr') ||
    l.includes('cvr')
  )
    return 'data';
  if (
    l.includes('tech') ||
    l.includes('system') ||
    l.includes('server') ||
    l.includes('api') ||
    l.includes('backend')
  )
    return 'tech';
  if (l.includes('start') || l.includes('begin') || l.includes('init')) return 'start';
  if (l.includes('end') || l.includes('finish') || l.includes('complete')) return 'end';

  return 'default';
}

interface HandleProps {
  type: 'source' | 'target';
  position: Position;
  id?: string;
  styleKey: NodeStyleKey;
}

const CustomHandle = memo(({ type, position, id, styleKey }: HandleProps) => {
  const style = NODE_STYLES[styleKey];
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`!w-2.5 !h-2.5 !border-2 !border-current ${style.text} !bg-white dark:!bg-slate-900 !opacity-70 hover:!opacity-100 hover:!scale-125 transition-all duration-150`}
    />
  );
});

interface NodeHandlesProps {
  styleKey: NodeStyleKey;
  isDecision?: boolean;
}

const NodeHandles = memo(({ styleKey, isDecision }: NodeHandlesProps) => (
  <>
    <CustomHandle type="target" position={Position.Top} id="top" styleKey={styleKey} />
    <CustomHandle type="source" position={Position.Top} id="top-source" styleKey={styleKey} />
    <CustomHandle type="source" position={Position.Bottom} id="bottom" styleKey={styleKey} />
    <CustomHandle type="target" position={Position.Bottom} id="bottom-target" styleKey={styleKey} />
    <CustomHandle type="target" position={Position.Left} id="left" styleKey={styleKey} />
    <CustomHandle type="source" position={Position.Left} id="left-source" styleKey={styleKey} />
    <CustomHandle type="source" position={Position.Right} id="right" styleKey={styleKey} />
    <CustomHandle type="target" position={Position.Right} id="right-target" styleKey={styleKey} />
    {isDecision && (
      <>
        <CustomHandle type="source" position={Position.Right} id="yes" styleKey="start" />
        <CustomHandle type="source" position={Position.Left} id="no" styleKey="end" />
      </>
    )}
  </>
));

interface NodeComponentProps {
  id: string;
  data: {
    label?: string;
    [key: string]: unknown;
  };
  selected?: boolean;
  type?: string;
  style?: React.CSSProperties;
}

export const StandardNode = memo(({ data, selected, type, style: propStyle }: NodeComponentProps) => {
  const label = data.label || 'Node';
  const styleKey = getNodeStyle(label, type);
  const themeStyle = NODE_STYLES[styleKey];
  const Icon = themeStyle.icon;

  return (
    <div
      style={propStyle}
      className={`
        group relative px-4 py-3 rounded-xl border-2 transition-shadow duration-150
        min-w-[160px] max-w-[280px] bg-white dark:bg-slate-900
        ${themeStyle.border}
        ${selected ? `shadow-lg ${themeStyle.glow}` : 'shadow-xs hover:shadow-md'}
      `}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-7 h-7 rounded-lg ${themeStyle.solid} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-3.5 h-3.5 ${themeStyle.textSolid}`} />
        </div>
        <span className="text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100 break-words whitespace-pre-line">
          {label}
        </span>
      </div>

      <NodeHandles styleKey={styleKey} />
    </div>
  );
});

export const TerminalNode = memo(({ data, selected, type, style: propStyle }: NodeComponentProps) => {
  const label = data.label || 'Start';
  const isEnd = type === 'end' || type === 'endNode' || label.toLowerCase().includes('end');
  const styleKey = isEnd ? 'end' : 'start';
  const themeStyle = NODE_STYLES[styleKey];
  const Icon = themeStyle.icon;

  return (
    <div
      style={propStyle}
      className={`
        group relative px-5 py-2 rounded-full border-2 transition-shadow duration-150
        min-w-[120px] bg-white dark:bg-slate-900
        ${themeStyle.border}
        ${selected ? `shadow-lg ${themeStyle.glow}` : 'shadow-xs hover:shadow-md'}
      `}
    >
      <div className="flex items-center justify-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${themeStyle.text}`} />
        <span className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
          {label}
        </span>
      </div>

      <NodeHandles styleKey={styleKey} />
    </div>
  );
});

export const DecisionNodeComponent = memo(
  ({ data, selected, style: propStyle }: NodeComponentProps) => {
    const label = data.label || 'Decision';
    const style = NODE_STYLES.decision;

    return (
      <div
        style={propStyle}
        className="relative w-[140px] min-h-[100px] flex items-center justify-center group py-2"
      >
        <div
          className={`
            absolute inset-2 border-2 rotate-45 rounded-lg transition-shadow duration-150
            bg-white dark:bg-slate-900 ${style.border}
            ${selected ? `shadow-lg ${style.glow}` : 'shadow-xs hover:shadow-md'}
          `}
        />

        <div className="relative z-10 text-center px-3 py-1">
          <GitBranch className={`w-4 h-4 mx-auto mb-1 ${style.text}`} />
          <span className="text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100 break-words whitespace-pre-line">
            {label}
          </span>
        </div>

        <NodeHandles styleKey="decision" isDecision />
      </div>
    );
  }
);

export const DatabaseNodeComponent = memo(
  ({ data, selected, style: propStyle }: NodeComponentProps) => {
    const label = data.label || 'Database';
    const style = NODE_STYLES.data;

    return (
      <div
        style={propStyle}
        className={`
          group relative px-5 py-3 rounded-xl border-2 transition-shadow duration-150
          min-w-[150px] bg-white dark:bg-slate-900
          ${style.border}
          ${selected ? `shadow-lg ${style.glow}` : 'shadow-xs hover:shadow-md'}
        `}
      >
        <div className="flex flex-col items-center pt-1">
          <Database className={`w-5 h-5 mb-1 ${style.text}`} />
          <span className="text-xs font-semibold text-center text-slate-800 dark:text-slate-100 break-words whitespace-pre-line">
            {label}
          </span>
        </div>

        <NodeHandles styleKey="data" />
      </div>
    );
  }
);

export const GroupNode = memo(
  ({ data, selected }: { data: { label?: string; color?: string }; selected?: boolean }) => {
    const label = data.label || 'Group';
    const borderColor = data.color || '#6366f1';

    return (
      <div className="w-full h-full relative pointer-events-none">
        <NodeResizer
          color={borderColor}
          isVisible={selected}
          minWidth={180}
          minHeight={120}
          handleStyle={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: borderColor,
            border: '2px solid white',
          }}
          lineStyle={{ borderWidth: 1.5, borderColor }}
        />

        <div
          className="rounded-2xl w-full h-full transition-all duration-300 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${borderColor}18 0%, ${borderColor}06 100%)`,
            border: `2px dashed ${borderColor}75`,
            boxShadow: selected ? `0 0 25px ${borderColor}30` : undefined,
          }}
        >
          <div
            className="absolute -top-3.5 left-4 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-xs pointer-events-auto select-none"
            style={{ backgroundColor: borderColor }}
          >
            {label}
          </div>
        </div>
      </div>
    );
  }
);

export const SystemNode = memo(({ data, selected, type }: NodeComponentProps) => {
  const label = data.label || 'System';
  const styleKey = getNodeStyle(label, type);
  const style = NODE_STYLES[styleKey];
  const Icon = style.icon;

  return (
    <div
      className={`
        group relative px-4 py-3 rounded-lg border-2 transition-shadow duration-150
        min-w-[160px] max-w-[260px] bg-white dark:bg-slate-900
        ${style.border}
        ${selected ? `shadow-lg ${style.glow}` : 'shadow-xs hover:shadow-md'}
      `}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg ${style.solid} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${style.textSolid}`} />
        </div>
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words whitespace-pre-line">
          {label}
        </span>
      </div>

      <NodeHandles styleKey={styleKey} />
    </div>
  );
});

export const nodeTypes = {
  start: TerminalNode,
  startNode: TerminalNode,
  end: TerminalNode,
  endNode: TerminalNode,
  decision: DecisionNodeComponent,
  decisionNode: DecisionNodeComponent,
  database: DatabaseNodeComponent,
  databaseNode: DatabaseNodeComponent,
  process: StandardNode,
  processNode: StandardNode,
  client: StandardNode,
  ai: StandardNode,
  team: StandardNode,
  platform: StandardNode,
  data: DatabaseNodeComponent,
  tech: SystemNode,
  server: SystemNode,
  system: SystemNode,
  standard: StandardNode,
  default: StandardNode,
  group: GroupNode,
};
