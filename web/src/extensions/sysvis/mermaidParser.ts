import mermaid from 'mermaid';
import { Node, Edge } from '@xyflow/react';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

function stripWrappingQuotes(line: string): string {
  let s = line.trim();
  const pairs: Array<[string, string]> = [
    ['("', '")'],
    ['"', '"'],
    ['(', ')'],
  ];
  for (const [open, close] of pairs) {
    if (s.startsWith(open) && s.endsWith(close) && s.length > open.length + close.length) {
      s = s.slice(open.length, s.length - close.length).trim();
    }
  }
  return s;
}

function sanitizeLabel(label: string): string {
  return label
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((line) => stripWrappingQuotes(line.replace(/\s+/g, ' ')))
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

function isDecisionLabel(label: string): boolean {
  const decisionKeywords = [
    'review',
    'approve',
    'decision',
    'verify',
    'check',
    'validate',
    'confirm',
    '?',
  ];
  const lowerLabel = label.toLowerCase();
  return decisionKeywords.some((keyword) => lowerLabel.includes(keyword));
}

function preprocessMermaidCode(code: string): string {
  return code
    .replace(/^```(?:mermaid)?\s*\n?/im, '')
    .replace(/\n?```\s*$/im, '')
    .replace(/%%\{init:[^}]*\}%%/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function detectFlowDirection(code: string): 'TB' | 'LR' | 'RL' | 'BT' {
  const m = code.match(/^\s*(?:graph|flowchart)\s+([A-Z]+)/im);
  if (!m) return 'TB';
  const raw = m[1].toUpperCase();
  if (raw.includes('LR')) return 'LR';
  if (raw.includes('RL')) return 'RL';
  if (raw.includes('BT')) return 'BT';
  return 'TB';
}

export function getNodeOwnership(mermaidCode: string): Map<string, string | undefined> {
  const lines = mermaidCode.split('\n');
  const nodeOwner = new Map<string, string | undefined>();
  const subStack: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%') || line.match(/^(flowchart|graph)\s+/i)) continue;

    const subMatch =
      line.match(/^subgraph\s+(\w+)\s*\[([^\]]+)\]/i) ||
      line.match(/^subgraph\s+(\w+)\s*\[\s*"([^"]+)"\s*\]/i) ||
      line.match(/^subgraph\s+(\w+)/i);
    if (subMatch) {
      subStack.push(subMatch[1]);
      continue;
    }

    if (line.match(/^end\b/i)) {
      subStack.pop();
      continue;
    }

    // Extract all node IDs declared or appearing on this line
    const idRegex = /([A-Za-z0-9_]+)\s*(?:\[\([^\)]+\)\]|\(\[[^\]]+\]\)|\(\([^\)]+\)\)|\[\[[^\]]+\]\]|\[[^\]]+\]|\{[^\}]+\}|\([^\)]+\)|-->|-\.->|==>|---|(?=\s*$))/g;
    let match;
    while ((match = idRegex.exec(line)) !== null) {
      const id = match[1];
      if (['subgraph', 'end', 'flowchart', 'graph'].includes(id.toLowerCase())) continue;
      if (!nodeOwner.has(id)) {
        nodeOwner.set(id, subStack.length > 0 ? subStack[subStack.length - 1] : undefined);
      }
    }
  }

  return nodeOwner;
}


export function parseMermaidRegex(mermaidCode: string): { nodes: Node[]; edges: Edge[] } {
  const cleanedCode = preprocessMermaidCode(mermaidCode);
  const lines = cleanedCode
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'));

  const nodeMap = new Map<string, any>();
  const parsedEdges: any[] = [];
  const groups: any[] = [];
  let currentGroup: any | null = null;
  const groupColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  for (const line of lines) {
    if (line.match(/^(flowchart|graph)\s+/i)) continue;

    const subgraphMatch =
      line.match(/^subgraph\s+(\w+)\s*\[([^\]]+)\]/i) ||
      line.match(/^subgraph\s+(\w+)\s*\[\s*"([^"]+)"\s*\]/i) ||
      line.match(/^subgraph\s+(\w+)/i);
    if (subgraphMatch) {
      currentGroup = {
        id: subgraphMatch[1],
        label: sanitizeLabel(subgraphMatch[2] || subgraphMatch[1]),
        nodes: [],
      };
      groups.push(currentGroup);
      continue;
    }
    if (line.match(/^end$/i)) {
      currentGroup = null;
      continue;
    }

    const nodePatterns = [
      /(\w+)\s*\[\(([^)]+)\)\]/g,
      /(\w+)\s*\(\[([^\]]+)\]\)/g,
      /(\w+)\s*\(\(([^)]+)\)\)/g,
      /(\w+)\s*\[\[([^\]]+)\]\]/g,
      /(\w+)\s*\[([^\]]+)\]/g,
      /(\w+)\s*\{([^}]+)\}/g,
    ];
    const roundPattern = /(\w+)\s*\(([^)]+)\)/g;

    const maskSpans = (src: string, spans: Array<[number, number]>): string => {
      const chars = src.split('');
      for (const [start, end] of spans) {
        for (let i = start; i < end && i < chars.length; i++) chars[i] = ' ';
      }
      return chars.join('');
    };

    const registerNode = (id: string, label: string, type: string) => {
      if (['end', 'subgraph', 'flowchart', 'graph'].includes(id.toLowerCase())) return;
      if (nodeMap.has(id)) return;
      nodeMap.set(id, { id, label, type, parentId: currentGroup?.id });
      if (currentGroup) currentGroup.nodes.push(id);
    };

    const consumed: Array<[number, number]> = [];
    for (const pattern of nodePatterns) {
      let match;
      const regex = new RegExp(pattern.source, 'g');
      while ((match = regex.exec(line)) !== null) {
        const id = match[1];
        if (['end', 'subgraph', 'flowchart', 'graph'].includes(id.toLowerCase())) continue;

        const rawLabel = match[2];
        const label = sanitizeLabel(rawLabel);

        let type = 'standard';
        if (pattern.source.includes('\\[\\(')) type = 'database';
        else if (pattern.source.includes('\\{')) type = 'decision';
        else if (pattern.source.includes('\\(\\(')) type = 'start';
        else if (rawLabel.trim().startsWith('("')) type = 'database';
        else if (isDecisionLabel(label)) type = 'decision';

        if (!nodeMap.has(id)) {
          registerNode(id, label, type);
          if (match.index !== undefined)
            consumed.push([match.index, match.index + match[0].length]);
        }
      }
    }

    {
      const masked = maskSpans(line, consumed);
      let match;
      const regex = new RegExp(roundPattern.source, 'g');
      while ((match = regex.exec(masked)) !== null) {
        const id = match[1];
        if (['end', 'subgraph', 'flowchart', 'graph'].includes(id.toLowerCase())) continue;
        const orig = line.substring(match.index, match.index + match[0].length);
        const inner = orig.match(/\(\s*([\s\S]*?)\s*\)$/);
        const label = sanitizeLabel(inner ? inner[1] : match[2]);
        const type = isDecisionLabel(label) ? 'decision' : 'standard';
        registerNode(id, label, type);
      }
    }

    const edgePatterns = [
      /(\w+)\s*-->\|([^|]*)\|\s*(\w+)/g,
      /(\w+)\s*-\.->\|([^|]*)\|\s*(\w+)/g,
      /(\w+)\s*--\s*([^->\s][^-]*?)\s*-->\s*(\w+)/g,
      /(\w+)\s*-\.->(\w+)/g,
      /(\w+)\s*-\.->\s*(\w+)/g,
      /(\w+)\s*-\.([^.>]+)\.->\s*(\w+)/g,
      /(\w+)\s*==>\s*(\w+)/g,
      /(\w+)\s*-->\s*(\w+)/g,
      /(\w+)\s*---\s*(\w+)/g,
    ];

    const edgeLine = line.replace(
      /(\w+)\s*(?:\[\([^\)]+\)\]|\(\[[^\]]+\]\)|\(\([^\)]+\)\)|\[\[[^\]]+\]\]|\[[^\]]+\]|\{[^\}]+\}|\([^\)]+\))/g,
      '$1'
    );

    for (const pattern of edgePatterns) {
      let match;
      const regex = new RegExp(pattern.source, 'g');
      while ((match = regex.exec(edgeLine)) !== null) {
        const source = match[1];
        const target = match.length > 3 ? match[3] : match[2];
        const edgeLabel = match.length > 3 ? sanitizeLabel(match[2]) : undefined;
        const isDotted = pattern.source.includes('-\\.');

        parsedEdges.push({
          source,
          target,
          label: edgeLabel,
          dotted: isDotted,
        });

        const groupIds = new Set(groups.map((g) => g.id));
        if (!nodeMap.has(source) && !groupIds.has(source)) {
          nodeMap.set(source, {
            id: source,
            label: source,
            type: 'standard',
            parentId: currentGroup?.id,
          });
          if (currentGroup) currentGroup.nodes.push(source);
        }
        if (!nodeMap.has(target) && !groupIds.has(target)) {
          nodeMap.set(target, {
            id: target,
            label: target,
            type: 'standard',
            parentId: currentGroup?.id,
          });
          if (currentGroup) currentGroup.nodes.push(target);
        }
      }
    }
  }

  const nodes: Node[] = [
    ...groups.map((g, i) => ({
      id: g.id,
      type: 'group',
      position: { x: 0, y: 0 },
      data: { label: g.label, color: groupColors[i % groupColors.length] },
      style: {
        width: 320,
        height: 220,
      },
    })),
    ...Array.from(nodeMap.values()).map((n: any) => ({
      id: n.id,
      type: n.type,
      position: { x: 0, y: 0 },
      data: { label: n.label },
      parentId: n.parentId,
      extent: undefined,
    })),
  ];

  const edges: Edge[] = parsedEdges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    type: 'animated',
    label: e.label,
    animated: true,
    data: {
      speed: e.dotted ? 4 : 2.2,
      curved: true,
    },
    style: {
      strokeDasharray: e.dotted ? '5,5' : undefined,
      strokeWidth: 2,
    },
  }));

  return { nodes, edges };
}

export async function parseMermaid(
  mermaidCode: string
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  try {
    const cleanedCode = preprocessMermaidCode(mermaidCode);
    await mermaid.parse(cleanedCode);

    // @ts-ignore - internal AST access
    const diagram = await mermaid.mermaidAPI.getDiagramFromText(cleanedCode);
    const db = diagram.db as any;

    const verticesRaw = db?.getVertices?.();
    const vertexEntries: [string, any][] =
      verticesRaw instanceof Map
        ? Array.from(verticesRaw.entries())
        : Object.entries(verticesRaw || {});
    const edgesData = db?.getEdges?.() || [];

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const groupColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    let groupIndex = 0;

    const subgraphs = db?.getSubGraphs?.() || [];

    const ownership = getNodeOwnership(cleanedCode);

    for (const sub of subgraphs) {
      nodes.push({
        id: sub.id,
        type: 'group',
        position: { x: 0, y: 0 },
        data: {
          label: sub.title || sub.id,
          color: groupColors[groupIndex++ % groupColors.length],
        },
        style: { width: 320, height: 220 },
      });
    }

    const groupIds = new Set(subgraphs.map((s: any) => s.id));
    for (const [id, vertex] of vertexEntries) {
      if (groupIds.has(id)) continue;
      const rawLabel = vertex.text || id;
      const label = sanitizeLabel(rawLabel);
      let type = 'standard';
      const lowerLabel = label.toLowerCase();

      if (
        vertex.type === 'cylinder' ||
        lowerLabel.includes('db') ||
        lowerLabel.includes('database')
      ) {
        type = 'database';
      } else if (vertex.type === 'diamond' || isDecisionLabel(label)) {
        type = 'decision';
      } else if (lowerLabel.includes('start') || lowerLabel.includes('begin')) {
        type = 'start';
      } else if (lowerLabel.includes('end') || lowerLabel.includes('stop')) {
        type = 'end';
      } else if (lowerLabel.includes('client') || lowerLabel.includes('user')) {
        type = 'client';
      } else if (lowerLabel.includes('server') || lowerLabel.includes('api')) {
        type = 'server';
      }

      let parentId: string | undefined = undefined;
      if (ownership.has(id)) {
        parentId = ownership.get(id);
      } else {
        for (const sub of subgraphs) {
          if (sub.nodes?.includes(id)) {
            parentId = sub.id;
            break;
          }
        }
      }

      nodes.push({
        id,
        type,
        position: { x: 0, y: 0 },
        data: { label },
        parentId,
        extent: undefined,
      });
    }

    edgesData.forEach((e: any, i: number) => {
      const isDotted = e.stroke === 'dotted';
      edges.push({
        id: `e${e.start}-${e.end}-${i}`,
        source: e.start,
        target: e.end,
        type: 'animated',
        label: e.text ? sanitizeLabel(e.text) : undefined,
        animated: true,
        data: {
          speed: isDotted ? 4 : 2.2,
          curved: true,
        },
        style: {
          strokeWidth: 2,
          strokeDasharray: isDotted ? '5,5' : undefined,
        },
      });
    });

    const nonGroupNodes = nodes.filter((n) => n.type !== 'group');
    if (edges.length > 0 && nonGroupNodes.length === 0) {
      return parseMermaidRegex(mermaidCode);
    }

    return { nodes, edges };
  } catch (err) {
    return parseMermaidRegex(mermaidCode);
  }
}
