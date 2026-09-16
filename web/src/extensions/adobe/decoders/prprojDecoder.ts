/**
 * Adobe Premiere Pro (.prproj) Decoder
 * Decompresses Gzip-encoded XML and parses sequence timelines, media assets, tracks, and project markers.
 */
import * as pako from 'pako';

export interface PremiereSequence {
  id: string;
  name: string;
  frameRate?: number;
  width?: number;
  height?: number;
  duration?: string;
  videoTrackCount: number;
  audioTrackCount: number;
}

export interface PremiereMediaClip {
  name: string;
  filePath?: string;
  type: 'video' | 'audio' | 'image' | 'graphic' | 'other';
}

export interface PremiereMarker {
  name: string;
  comment?: string;
  frame?: number;
  color?: string;
}

export interface DecodedPrprojResult {
  projectName: string;
  premiereVersion?: string;
  sequences: PremiereSequence[];
  clips: PremiereMediaClip[];
  markers: PremiereMarker[];
  metadata: Record<string, string>;
}

export async function decodePrprojFile(buffer: ArrayBuffer): Promise<DecodedPrprojResult> {
  let xmlText = '';

  // 1. Decompress GZIP
  try {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(buffer);
      writer.close();
      xmlText = await new Response(ds.readable).text();
    } else {
      xmlText = new TextDecoder('utf-8').decode(pako.ungzip(new Uint8Array(buffer)));
    }
  } catch {
    // If already raw XML or fallback
    try {
      xmlText = new TextDecoder('utf-8').decode(pako.ungzip(new Uint8Array(buffer)));
    } catch {
      xmlText = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    }
  }

  // 2. Parse XML DOM
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');

  // Project Name & Version
  const rootNode = xml.querySelector('PremiereData');
  const premiereVersion = rootNode?.getAttribute('Version') || 'CC Project';

  const nameNode = xml.querySelector('Project > Name') || xml.querySelector('Name');
  const projectName = nameNode?.textContent?.trim() || 'Untitled Premiere Project';

  // 3. Extract Sequences
  const sequences: PremiereSequence[] = [];
  const seqNodes = xml.querySelectorAll('Sequence');
  seqNodes.forEach((node, idx) => {
    const sName = node.querySelector('Name')?.textContent?.trim() || `Sequence ${idx + 1}`;
    const wNode = node.querySelector('VideoFilterRect, FrameRect, Width');
    const hNode = node.querySelector('Height');

    // Count video & audio tracks
    const videoTracks = node.querySelectorAll('VideoTrack').length;
    const audioTracks = node.querySelectorAll('AudioTrack').length;

    sequences.push({
      id: `seq-${idx}`,
      name: sName,
      width: wNode ? parseInt(wNode.textContent || '1920', 10) : 1920,
      height: hNode ? parseInt(hNode.textContent || '1080', 10) : 1080,
      videoTrackCount: Math.max(videoTracks, 1),
      audioTrackCount: Math.max(audioTracks, 1),
    });
  });

  // 4. Extract Media Assets / Clips
  const clips: PremiereMediaClip[] = [];
  const clipNodes = xml.querySelectorAll('Media, ClipItem, Clip');
  const seenClips = new Set<string>();

  clipNodes.forEach((node) => {
    const cName = node.querySelector('Name, ClipName')?.textContent?.trim();
    const filePath = node.querySelector('FilePath, OriginalPath, Path')?.textContent?.trim();

    if (cName && !seenClips.has(cName)) {
      seenClips.add(cName);
      const ext = (cName.split('.').pop() || '').toLowerCase();
      let type: PremiereMediaClip['type'] = 'other';
      if (['mp4', 'mov', 'mkv', 'avi', 'm4v', 'prores', 'm2ts'].includes(ext)) type = 'video';
      else if (['mp3', 'wav', 'aac', 'flac', 'm4a', 'aif'].includes(ext)) type = 'audio';
      else if (['png', 'jpg', 'jpeg', 'psd', 'ai', 'tiff'].includes(ext)) type = 'image';

      clips.push({
        name: cName,
        filePath,
        type,
      });
    }
  });

  // 5. Extract Markers
  const markers: PremiereMarker[] = [];
  const markerNodes = xml.querySelectorAll('Marker');
  markerNodes.forEach((node) => {
    const mName = node.querySelector('Name')?.textContent?.trim() || 'Marker';
    const comment = node.querySelector('Comment')?.textContent?.trim();
    markers.push({ name: mName, comment });
  });

  const metadata: Record<string, string> = {};
  metadata['Application'] = 'Adobe Premiere Pro';
  metadata['Project Architecture'] = premiereVersion;
  metadata['Active Sequences'] = `${sequences.length} timeline${sequences.length > 1 ? 's' : ''}`;
  metadata['Linked Assets'] = `${clips.length} media clip${clips.length > 1 ? 's' : ''}`;
  if (markers.length > 0) metadata['Project Markers'] = `${markers.length} cues`;

  return {
    projectName,
    premiereVersion,
    sequences,
    clips: clips.slice(0, 50), // cap preview count for smooth UI
    markers: markers.slice(0, 20),
    metadata,
  };
}
