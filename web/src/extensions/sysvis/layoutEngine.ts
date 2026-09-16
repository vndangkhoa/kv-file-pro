import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'RL' | 'BT';
  nodeSep?: number;
  rankSep?: number;
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const direction = options.direction || 'TB';
  const isHorizontal = direction === 'LR' || direction === 'RL';

  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: options.rankSep || 90,
    nodesep: options.nodeSep || 60,
    marginx: 50,
    marginy: 50,
  });

  const groupNodes = nodes.filter((n) => n.type === 'group');
  const groupIds = new Set(groupNodes.map((n) => n.id));
  const regularNodes = nodes.filter((n) => n.type !== 'group');
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Index subgraphs by their definition order
  const groupOrder = new Map<string, number>();
  groupNodes.forEach((g, idx) => groupOrder.set(g.id, idx));

  // 1. Register group compound nodes in Dagre
  for (const gid of groupIds) {
    dagreGraph.setNode(gid, {});
  }

  // 2. Register regular nodes with accurate dimensions
  const nodeDimensions: Record<string, { width: number; height: number }> = {};
  for (const node of regularNodes) {
    const isTerminal = node.type === 'start' || node.type === 'end';
    const isDecision = node.type === 'decision' || node.type === 'decisionNode';
    const isDatabase = node.type === 'database' || node.type === 'data';
    const labelLen = ((node.data?.label as string) || '').length;
    const width = isDecision
      ? 160
      : isTerminal
      ? 140
      : isDatabase
      ? 200
      : Math.min(280, Math.max(180, labelLen * 7.5 + 60));
    const height = isDecision ? 110 : isTerminal ? 48 : isDatabase ? 72 : (labelLen > 30 ? 76 : 64);

    nodeDimensions[node.id] = { width, height };

    dagreGraph.setNode(node.id, { width, height });

    if (node.parentId && groupIds.has(node.parentId)) {
      dagreGraph.setParent(node.id, node.parentId);
    }
  }

  // 3. Detect feedback and reverse edges so they don't invert tier ranking
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));

  function hasPath(start: string, target: string): boolean {
    const visited = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === target) return true;
      if (!visited.has(curr)) {
        visited.add(curr);
        const neighbors = adj.get(curr) || [];
        for (const nbr of neighbors) {
          if (!visited.has(nbr)) queue.push(nbr);
        }
      }
    }
    return false;
  }

  const feedbackEdgeIds = new Set<string>();
  for (const edge of edges) {
    const edgeKey = edge.id || `${edge.source}->${edge.target}`;
    const sNode = nodeMap.get(edge.source);
    const tNode = nodeMap.get(edge.target);
    const sGroup = sNode?.parentId;
    const tGroup = tNode?.parentId;
    const label = ((edge.label as string) || '').toLowerCase().trim();
    const isNegativeBranch = /^(no|reject|fail|false|cancel|deny|err|error)/i.test(label);

    const isInterGroupReverse = Boolean(
      sGroup &&
      tGroup &&
      sGroup !== tGroup &&
      (groupOrder.get(sGroup) ?? 0) > (groupOrder.get(tGroup) ?? 0)
    );

    const closesCycle = hasPath(edge.target, edge.source);

    if (isNegativeBranch || isInterGroupReverse || closesCycle) {
      feedbackEdgeIds.add(edgeKey);
    } else {
      adj.get(edge.source)?.push(edge.target);
    }
  }

  // Register only forward ranking edges in Dagre to maintain correct architectural hierarchy
  edges.forEach((edge) => {
    const edgeKey = edge.id || `${edge.source}->${edge.target}`;
    if (
      !feedbackEdgeIds.has(edgeKey) &&
      dagreGraph.hasNode(edge.source) &&
      dagreGraph.hasNode(edge.target)
    ) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  // 4. Run Dagre Layout
  dagre.layout(dagreGraph);

  // 5. Compute global coordinates for all regular nodes
  const globalPositions: Record<
    string,
    { left: number; top: number; right: number; bottom: number; x: number; y: number }
  > = {};
  for (const node of regularNodes) {
    const pos = dagreGraph.node(node.id);
    const { width, height } = nodeDimensions[node.id] || { width: 200, height: 60 };
    if (pos) {
      const left = pos.x - width / 2;
      const top = pos.y - height / 2;
      globalPositions[node.id] = {
        left,
        top,
        right: left + width,
        bottom: top + height,
        x: pos.x,
        y: pos.y,
      };
    } else {
      globalPositions[node.id] = { left: 0, top: 0, right: 200, bottom: 60, x: 100, y: 30 };
    }
  }

  // 6. Calculate bounding boxes for group nodes based on their children
  const PADDING_X = 50;
  const PADDING_TOP = 65;
  const PADDING_BOTTOM = 40;

  const groupLayouts: Record<string, { x: number; y: number; width: number; height: number }> = {};

  for (const group of groupNodes) {
    const children = regularNodes.filter((n) => n.parentId === group.id);
    if (children.length > 0) {
      let minLeft = Infinity;
      let minTop = Infinity;
      let maxRight = -Infinity;
      let maxBottom = -Infinity;

      for (const child of children) {
        const box = globalPositions[child.id];
        if (box) {
          minLeft = Math.min(minLeft, box.left);
          minTop = Math.min(minTop, box.top);
          maxRight = Math.max(maxRight, box.right);
          maxBottom = Math.max(maxBottom, box.bottom);
        }
      }

      const gx = minLeft - PADDING_X;
      const gy = minTop - PADDING_TOP;
      const gw = Math.max(220, maxRight - minLeft + PADDING_X * 2);
      const gh = Math.max(140, maxBottom - minTop + PADDING_TOP + PADDING_BOTTOM);

      groupLayouts[group.id] = { x: gx, y: gy, width: gw, height: gh };
    } else {
      const gPos = dagreGraph.node(group.id);
      groupLayouts[group.id] = {
        x: gPos ? gPos.x - 160 : 0,
        y: gPos ? gPos.y - 110 : 0,
        width: 320,
        height: 220,
      };
    }
  }

  // 7. Generate final React Flow nodes array
  // IMPORTANT: in React Flow, children must have positions relative to their parent group!
  const layoutedNodes: Node[] = [];

  // Add group nodes first so they render under child nodes
  for (const group of groupNodes) {
    const layout = groupLayouts[group.id];
    layoutedNodes.push({
      ...group,
      position: { x: layout.x, y: layout.y },
      width: layout.width,
      height: layout.height,
      initialWidth: layout.width,
      initialHeight: layout.height,
      extent: undefined,
      style: {
        ...group.style,
        width: layout.width,
        height: layout.height,
      },
    });
  }

  // Add regular nodes with relative coordinates if they have parentId
  for (const node of regularNodes) {
    const globalBox = globalPositions[node.id];
    let localX = globalBox ? globalBox.left : 0;
    let localY = globalBox ? globalBox.top : 0;

    if (node.parentId && groupLayouts[node.parentId]) {
      const parentLayout = groupLayouts[node.parentId];
      localX -= parentLayout.x;
      localY -= parentLayout.y;
    }

    layoutedNodes.push({
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: { x: localX, y: localY },
      extent: undefined,
    });
  }

  // 8. Intelligent geometric & semantic handle assignment
  const layoutedEdges = edges.map((edge) => {
    const sBox = globalPositions[edge.source];
    const tBox = globalPositions[edge.target];
    const sNode = nodeMap.get(edge.source);
    const label = ((edge.label as string) || '').toLowerCase().trim();
    const isDecision = sNode?.type === 'decision' || sNode?.type === 'decisionNode';

    let sourceHandle = edge.sourceHandle;
    let targetHandle = edge.targetHandle;

    if (!sourceHandle || !targetHandle) {
      if (isHorizontal) {
        const isBackward = tBox && sBox && tBox.right < sBox.left;
        if (isDecision) {
          if (/^(no|reject|fail|false|cancel|deny|err|error)/i.test(label)) {
            sourceHandle = sourceHandle || 'no';
            targetHandle = targetHandle || (isBackward ? 'top' : 'top');
          } else if (/^(yes|approve|pass|true|ok)/i.test(label)) {
            sourceHandle = sourceHandle || 'yes';
            targetHandle = targetHandle || (isBackward ? 'bottom-target' : 'left');
          }
        }
        if (isBackward) {
          if (!sourceHandle) sourceHandle = tBox && sBox && tBox.y <= sBox.y ? 'top-source' : 'bottom';
          if (!targetHandle) targetHandle = tBox && sBox && tBox.y <= sBox.y ? 'top' : 'bottom-target';
        } else {
          sourceHandle = sourceHandle || 'right';
          targetHandle = targetHandle || 'left';
        }
      } else {
        // Vertical flow (TB)
        const isUpward = Boolean(tBox && sBox && tBox.bottom < sBox.top + 20);

        if (isDecision) {
          if (/^(no|reject|fail|false|cancel|deny|err|error)/i.test(label)) {
            sourceHandle = sourceHandle || 'no';
            targetHandle = targetHandle || (isUpward ? 'left' : (tBox.x < sBox.x ? 'left' : 'top'));
          } else if (/^(yes|approve|pass|true|ok)/i.test(label)) {
            sourceHandle = sourceHandle || 'yes';
            targetHandle = targetHandle || (isUpward ? 'right-target' : 'top');
          }
        }

        if (isUpward) {
          if (!sourceHandle) {
            sourceHandle = tBox && sBox && tBox.x <= sBox.x ? 'left-source' : 'right';
          }
          if (!targetHandle) {
            targetHandle = tBox && sBox && tBox.x <= sBox.x ? 'left' : 'right-target';
          }
        } else if (sBox && tBox && Math.abs(tBox.y - sBox.y) < 45) {
          // Sideways / peer edge
          if (!sourceHandle) {
            sourceHandle = tBox.x > sBox.x ? 'right' : 'left-source';
          }
          if (!targetHandle) {
            targetHandle = tBox.x > sBox.x ? 'left' : 'right-target';
          }
        } else {
          // Standard downward flow
          sourceHandle = sourceHandle || 'bottom';
          targetHandle = targetHandle || 'top';
        }
      }
    }

    return {
      ...edge,
      sourceHandle,
      targetHandle,
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
