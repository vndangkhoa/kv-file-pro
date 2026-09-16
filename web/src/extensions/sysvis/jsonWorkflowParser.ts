import { Node, Edge } from '@xyflow/react';

export function isWorkflowJson(content: string | null | undefined): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;

  try {
    const data = JSON.parse(trimmed);
    if (typeof data !== 'object' || data === null) return false;

    // 1. Pipeline format (e.g. video_workflow.json)
    if (data.processing_pipeline || data.pipeline || (data.workflow_name && data.scenes)) {
      return true;
    }

    // 2. ComfyUI UI format (nodes + links)
    if (Array.isArray(data.nodes) && Array.isArray(data.links)) {
      return true;
    }

    // 3. React Flow format (nodes + edges)
    if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
      return true;
    }

    // 4. ComfyUI API / Prompt format ({ "1": { "class_type": "...", "inputs": {...} } })
    const values = Object.values(data);
    if (
      values.length > 1 &&
      values.every(
        (v: any) =>
          typeof v === 'object' && v !== null && (v.class_type || v.node_type || v.inputs)
      )
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function formatTitle(str: string): string {
  return str
    .replace(/^step_\d+_?/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function parseJsonWorkflow(
  jsonString: string
): { nodes: Node[]; edges: Edge[] } | null {
  try {
    const data = JSON.parse(jsonString);
    if (typeof data !== 'object' || data === null) return null;

    // ----------------------------------------------------
    // FORMAT 1: Pipeline JSON (like video_workflow.json)
    // ----------------------------------------------------
    if (data.processing_pipeline || data.pipeline || (data.workflow_name && data.scenes)) {
      const nodes: Node[] = [];
      const edges: Edge[] = [];
      const groupColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

      const scenes = Array.isArray(data.scenes) ? data.scenes : null;
      let lastSceneId: string | null = null;

      // 1. Storyboard Scenes Subgraph
      if (scenes && scenes.length > 0) {
        const totalDuration =
          data.duration_seconds ||
          scenes.reduce((acc: number, s: any) => acc + (s.duration_seconds || 3), 0);

        nodes.push({
          id: 'group_scenes',
          type: 'group',
          position: { x: 0, y: 0 },
          data: {
            label: `🎬 Storyboard (${scenes.length} Scenes • ${totalDuration}s)`,
            color: groupColors[0],
          },
          style: { width: 320, height: 220 },
        });

        scenes.forEach((sc: any, idx: number) => {
          const sceneId = `scene_${sc.scene_id ?? idx + 1}`;
          const cameraInfo = sc.camera?.angle ? ` • ${sc.camera.angle.replace(/_/g, ' ')}` : '';
          const durInfo = sc.duration_seconds ? ` (${sc.duration_seconds}s)` : '';

          nodes.push({
            id: sceneId,
            type: 'standard',
            parentId: 'group_scenes',
            position: { x: 0, y: 0 },
            data: {
              label: `Scene ${sc.scene_id ?? idx + 1}: ${sc.name || 'Scene'}${durInfo}${cameraInfo}`,
            },
          });

          // Connect sequential scenes within storyboard
          if (lastSceneId) {
            edges.push({
              id: `e-${lastSceneId}-${sceneId}`,
              source: lastSceneId,
              target: sceneId,
              type: 'animated',
              animated: true,
              data: { speed: 3.0, curved: true },
              style: { strokeWidth: 1.5, strokeDasharray: '4,4' },
            });
          }
          lastSceneId = sceneId;
        });
      }

      // 2. Processing Pipeline Steps
      const rawPipeline = data.processing_pipeline || data.pipeline || {};
      const stepEntries: [string, any][] = Object.entries(rawPipeline);

      // Map outputs to producing step key
      const outputProducerMap = new Map<string, string>();
      stepEntries.forEach(([stepKey, stepVal]) => {
        if (stepVal.output) {
          const outName = String(stepVal.output).toLowerCase();
          outputProducerMap.set(outName, stepKey);
        }
      });

      let terminalFileNodeAdded = false;

      stepEntries.forEach(([stepKey, stepVal], idx) => {
        const nodeType = stepVal.node_type || stepVal.type || 'Process';
        const prettyTitle = formatTitle(stepKey);

        let extraDetail = '';
        if (stepVal.inputs?.steps) {
          extraDetail = ` • ${stepVal.inputs.steps} steps`;
        } else if (stepVal.inputs?.num_frames) {
          extraDetail = ` • ${stepVal.inputs.num_frames} frames @ ${stepVal.inputs.frame_rate || 15}fps`;
        } else if (stepVal.inputs?.voice) {
          extraDetail = ` • Voice: ${stepVal.inputs.voice.replace(/_/g, ' ')}`;
        } else if (stepVal.inputs?.resolution) {
          extraDetail = ` • ${stepVal.inputs.resolution}`;
        }

        let nodeCategory = 'standard';
        const l = (nodeType + ' ' + stepKey).toLowerCase();
        if (l.includes('image') || l.includes('ltx') || l.includes('frame') || l.includes('generate')) {
          nodeCategory = 'ai';
        } else if (l.includes('composite') || l.includes('render') || l.includes('video')) {
          nodeCategory = 'tech';
        } else if (l.includes('audio') || l.includes('tts') || l.includes('voice')) {
          nodeCategory = 'standard';
        }

        nodes.push({
          id: stepKey,
          type: nodeCategory,
          position: { x: 0, y: 0 },
          data: {
            label: `Step ${idx + 1}: ${prettyTitle}\n[${nodeType}]${extraDetail}`,
          },
        });

        // Detect dependencies from inputs
        const inputs = stepVal.inputs || {};
        const inputString = JSON.stringify(inputs).toLowerCase();

        // Connect storyboard to step 1 (or any step referencing scene)
        if (idx === 0 && scenes && scenes.length > 0) {
          edges.push({
            id: `e-storyboard-${stepKey}`,
            source: lastSceneId || 'group_scenes',
            target: stepKey,
            type: 'animated',
            label: 'Prompts & Seeds',
            animated: true,
            data: { speed: 2.0, curved: true },
            style: { strokeWidth: 2 },
          });
        } else if (inputString.includes('{scene.text}') && scenes && scenes.length > 0) {
          edges.push({
            id: `e-storyboard-audio-${stepKey}`,
            source: scenes[0]?.scene_id ? `scene_${scenes[0].scene_id}` : 'group_scenes',
            target: stepKey,
            type: 'animated',
            label: 'Narration Script',
            animated: true,
            data: { speed: 2.2, curved: true },
            style: { strokeWidth: 2 },
          });
        }

        // Link with previous steps via output matches
        outputProducerMap.forEach((sourceStepKey, outputName) => {
          if (sourceStepKey === stepKey) return;
          // Check if input references outputName or step name
          const strippedSource = sourceStepKey.replace(/^step_\d+_?/i, '');
          const matchesOutput =
            inputString.includes(outputName) ||
            inputString.includes(strippedSource) ||
            inputString.includes(sourceStepKey);

          if (matchesOutput) {
            let edgeLabel = outputName.replace(/_/g, ' ');
            if (edgeLabel.length > 20) edgeLabel = edgeLabel.slice(0, 20) + '...';

            edges.push({
              id: `e-${sourceStepKey}-${stepKey}`,
              source: sourceStepKey,
              target: stepKey,
              type: 'animated',
              label: edgeLabel,
              animated: true,
              data: { speed: 2.2, curved: true },
              style: { strokeWidth: 2 },
            });
          }
        });

        // Check if output is a target file (e.g. output_video.mp4)
        if (
          stepVal.output &&
          /\.(mp4|mov|webm|png|jpg|zip|tar|wav|mp3)$/i.test(stepVal.output) &&
          !terminalFileNodeAdded
        ) {
          const fileNodeId = 'terminal_output_file';
          nodes.push({
            id: fileNodeId,
            type: 'end',
            position: { x: 0, y: 0 },
            data: {
              label: `📦 ${stepVal.output}\n(${data.resolution?.width || 1920}x${data.resolution?.height || 1080} • ${data.output_settings?.codec || 'H.264'})`,
            },
          });

          edges.push({
            id: `e-${stepKey}-${fileNodeId}`,
            source: stepKey,
            target: fileNodeId,
            type: 'animated',
            label: 'Render Target',
            animated: true,
            data: { speed: 2.0, curved: true },
            style: { strokeWidth: 2 },
          });
          terminalFileNodeAdded = true;
        }
      });

      return { nodes, edges };
    }

    // ----------------------------------------------------
    // FORMAT 2: ComfyUI Exported UI Graph (nodes + links)
    // ----------------------------------------------------
    if (Array.isArray(data.nodes) && Array.isArray(data.links)) {
      const nodes: Node[] = data.nodes.map((n: any) => {
        const title = n.title || n.type || `Node ${n.id}`;
        let category = 'standard';
        const lower = (n.type + ' ' + title).toLowerCase();
        if (lower.includes('sampler') || lower.includes('clip') || lower.includes('vae') || lower.includes('model') || lower.includes('ltx')) {
          category = 'ai';
        } else if (lower.includes('save') || lower.includes('output') || lower.includes('preview')) {
          category = 'end';
        } else if (lower.includes('load') || lower.includes('input') || lower.includes('image')) {
          category = 'start';
        }

        return {
          id: String(n.id),
          type: category,
          position: n.pos ? { x: n.pos[0], y: n.pos[1] } : { x: 0, y: 0 },
          data: {
            label: `${title}\n[${n.type}]`,
          },
        };
      });

      const edges: Edge[] = data.links.map((link: any, idx: number) => {
        // [link_id, source_id, source_slot, target_id, target_slot, link_type]
        const [, sourceId, , targetId, , linkType] = link;
        return {
          id: `e-comfy-${idx}`,
          source: String(sourceId),
          target: String(targetId),
          type: 'animated',
          label: linkType ? String(linkType) : undefined,
          animated: true,
          data: { speed: 2.2, curved: true },
          style: { strokeWidth: 2 },
        };
      });

      return { nodes, edges };
    }

    // ----------------------------------------------------
    // FORMAT 3: Standard React Flow Schema (nodes + edges)
    // ----------------------------------------------------
    if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
      const nodes: Node[] = data.nodes.map((n: any, idx: number) => ({
        id: String(n.id || `node_${idx}`),
        type: n.type || 'standard',
        position: n.position || { x: 0, y: 0 },
        data: n.data || { label: n.label || `Node ${idx}` },
        parentId: n.parentId,
        style: n.style,
      }));

      const edges: Edge[] = data.edges.map((e: any, idx: number) => ({
        id: String(e.id || `edge_${idx}`),
        source: String(e.source),
        target: String(e.target),
        type: 'animated',
        label: e.label,
        animated: true,
        data: { speed: 2.2, curved: true },
        style: { strokeWidth: 2 },
      }));

      return { nodes, edges };
    }

    // ----------------------------------------------------
    // FORMAT 4: ComfyUI Prompt / API Object Format
    // ----------------------------------------------------
    const entries = Object.entries(data);
    if (
      entries.length > 1 &&
      entries.every(
        ([, v]: [string, any]) =>
          typeof v === 'object' && v !== null && (v.class_type || v.node_type || v.inputs)
      )
    ) {
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      entries.forEach(([id, node]: [string, any]) => {
        const title = node._meta?.title || node.class_type || node.node_type || `Node ${id}`;
        let category = 'standard';
        const lower = title.toLowerCase();
        if (lower.includes('sampler') || lower.includes('clip') || lower.includes('model')) {
          category = 'ai';
        } else if (lower.includes('save') || lower.includes('preview')) {
          category = 'end';
        } else if (lower.includes('load')) {
          category = 'start';
        }

        nodes.push({
          id,
          type: category,
          position: { x: 0, y: 0 },
          data: {
            label: `${title}\n(#${id})`,
          },
        });

        if (node.inputs && typeof node.inputs === 'object') {
          Object.entries(node.inputs).forEach(([inputKey, val]: [string, any]) => {
            if (Array.isArray(val) && val.length >= 1 && (typeof val[0] === 'string' || typeof val[0] === 'number')) {
              const sourceId = String(val[0]);
              edges.push({
                id: `e-${sourceId}-${id}-${inputKey}`,
                source: sourceId,
                target: id,
                type: 'animated',
                label: inputKey,
                animated: true,
                data: { speed: 2.2, curved: true },
                style: { strokeWidth: 2 },
              });
            }
          });
        }
      });

      return { nodes, edges };
    }

    return null;
  } catch {
    return null;
  }
}
