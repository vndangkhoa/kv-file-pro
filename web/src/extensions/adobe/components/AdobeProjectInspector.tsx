import React, { useState, useMemo, useEffect } from 'react';
import {
  Film,
  Video,
  Music,
  Image as ImageIcon,
  Layers,
  FileText,
  Type,
  Palette,
  Flag,
  Search,
  Sliders,
  Folder,
  Box,
  Clock,
  Info,
} from 'lucide-react';
import { PremiereSequence, PremiereMediaClip, PremiereMarker } from '../decoders/prprojDecoder';
import { AeComposition, AeFootageItem } from '../decoders/aepDecoder';

function parseSwatchColor(name: string): string {
  const n = name.toLowerCase().trim();
  if (n === 'black') return '#111827';
  if (n === 'white' || n === 'paper') return '#ffffff';
  if (n === 'cyan') return '#00a4e4';
  if (n === 'magenta') return '#e4007f';
  if (n === 'yellow') return '#ffed00';
  if (n === 'registration') return '#1f2937';
  const cmyk = name.match(/c=(\d+)\s+m=(\d+)\s+y=(\d+)\s+k=(\d+)/i);
  if (cmyk) {
    const c = parseInt(cmyk[1], 10) / 100;
    const m = parseInt(cmyk[2], 10) / 100;
    const y = parseInt(cmyk[3], 10) / 100;
    const k = parseInt(cmyk[4], 10) / 100;
    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));
    return `rgb(${r}, ${g}, ${b})`;
  }
  return '#6366f1';
}

interface AdobeProjectInspectorProps {
  sequences?: PremiereSequence[];
  compositions?: AeComposition[];
  clips?: PremiereMediaClip[];
  footage?: AeFootageItem[];
  markers?: PremiereMarker[];
  stories?: string[];
  fonts?: string[];
  swatches?: string[];
  metadata?: Record<string, string>;
}

export const AdobeProjectInspector: React.FC<AdobeProjectInspectorProps> = ({
  sequences = [],
  compositions = [],
  clips = [],
  footage = [],
  markers = [],
  stories = [],
  fonts = [],
  swatches = [],
  metadata = {},
}) => {
  const hasMetadata = Object.keys(metadata).length > 0;
  const hasTimelines = sequences.length > 0 || compositions.length > 0;
  const hasAssets = clips.length > 0 || footage.length > 0;
  const hasMarkers = markers.length > 0;
  const hasDesignAssets = fonts.length > 0 || swatches.length > 0 || stories.length > 0;
  const hasAnyData = hasTimelines || hasAssets || hasMarkers || hasDesignAssets || hasMetadata;

  const defaultTab = useMemo<'timelines' | 'assets' | 'markers' | 'typography' | 'telemetry'>(() => {
    if (hasTimelines) return 'timelines';
    if (hasAssets) return 'assets';
    if (hasMarkers) return 'markers';
    if (hasDesignAssets) return 'typography';
    if (hasMetadata) return 'telemetry';
    return 'timelines';
  }, [hasTimelines, hasAssets, hasMarkers, hasDesignAssets, hasMetadata]);

  const [activeTab, setActiveTab] = useState<'timelines' | 'assets' | 'markers' | 'typography' | 'telemetry'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const [filterQuery, setFilterQuery] = useState('');

  const filteredClips = clips.filter(
    (c) =>
      c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (c.filePath && c.filePath.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const filteredFootage = footage.filter(
    (f) =>
      f.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (f.path && f.path.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const getMediaIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('video') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(t)) {
      return <Video size={14} className="text-blue-400" />;
    }
    if (t.includes('audio') || ['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(t)) {
      return <Music size={14} className="text-emerald-400" />;
    }
    if (t.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tif', 'tiff', 'bmp'].includes(t)) {
      return <ImageIcon size={14} className="text-amber-400" />;
    }
    return <FileText size={14} className="text-purple-400" />;
  };

  // If no data was detected in the project, show clean empty state instead of blank void
  if (!hasAnyData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#121214] text-center text-neutral-400 select-none">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-purple-400 mb-3 shadow-xl">
          <Film size={26} />
        </div>
        <h3 className="font-semibold text-sm text-white mb-1">No Timeline or Composition Tracks</h3>
        <p className="text-xs text-neutral-400 max-w-sm mb-4 leading-relaxed">
          This Adobe project contains no active sequences, compositions, or linked media items in its index.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#121214] text-neutral-300 select-none overflow-hidden">
      {/* Sub-header Navigation */}
      <div className="h-11 border-b border-neutral-800 px-4 flex items-center justify-between bg-neutral-900/60 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {hasTimelines && (
            <button
              onClick={() => setActiveTab('timelines')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'timelines'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Film size={12} />
              <span>Timelines ({sequences.length || compositions.length})</span>
            </button>
          )}

          {hasAssets && (
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'assets'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Folder size={12} />
              <span>Media Assets ({clips.length || footage.length})</span>
            </button>
          )}

          {hasMarkers && (
            <button
              onClick={() => setActiveTab('markers')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'markers'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Flag size={12} />
              <span>Markers ({markers.length})</span>
            </button>
          )}

          {hasDesignAssets && (
            <button
              onClick={() => setActiveTab('typography')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'typography'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Type size={12} />
              <span>Design Assets</span>
            </button>
          )}

          {hasMetadata && (
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Info size={12} />
              <span>Project Telemetry</span>
            </button>
          )}
        </div>

        {activeTab === 'assets' && (
          <div className="relative w-48 shrink-0 ml-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-7 pr-3 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: Timelines / Sequences & Compositions */}
        {activeTab === 'timelines' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Film size={13} className="text-purple-400" />
                <span>Project Sequences & Compositions ({sequences.length || compositions.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sequences.map((seq) => (
                <div
                  key={seq.id}
                  className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800/80 shadow-md hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/40">
                      <Film size={16} />
                    </span>
                    <h4 className="font-semibold text-sm text-white truncate">{seq.name}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-800">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Resolution</span>
                      <span className="font-mono text-neutral-200">
                        {seq.width} x {seq.height}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Tracks</span>
                      <span className="text-neutral-200">
                        {seq.videoTrackCount} Video • {seq.audioTrackCount} Audio
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {compositions.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800/80 shadow-md hover:border-neutral-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="p-1.5 rounded-lg bg-purple-950 text-purple-400 border border-purple-800/40 shrink-0">
                          <Layers size={16} />
                        </span>
                        <h4 className="font-semibold text-sm text-white truncate" title={comp.name}>
                          {comp.name}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-purple-300 border border-neutral-700 shrink-0">
                        {comp.layerCount} Layers
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-800">
                      <div>
                        <span className="block text-[10px] text-neutral-500 uppercase">Dimensions</span>
                        <span className="font-mono text-neutral-200">
                          {comp.width} × {comp.height}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-500 uppercase">Frame Rate</span>
                        <span className="text-neutral-200 font-mono">{comp.frameRate || 30} fps</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-500 uppercase">Duration</span>
                        <span className="text-neutral-200 font-mono">
                          {comp.durationSec ? `${comp.durationSec}s` : 'Dynamic'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Layer Stack Breakdown */}
                  {comp.layers && comp.layers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        <span>Layer Hierarchy</span>
                        <span>Capabilities</span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1 divide-y divide-neutral-800/40">
                        {comp.layers.map((layer) => (
                          <div key={layer.id} className="pt-1.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[10px] font-mono text-neutral-500 w-4 shrink-0">
                                #{layer.index}
                              </span>
                              <span className="text-neutral-200 text-[11px] truncate" title={layer.name}>
                                {layer.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {layer.is3D && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800/40 flex items-center gap-0.5">
                                  <Box size={9} />
                                  3D
                                </span>
                              )}
                              {layer.timeRemapping && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-950 text-blue-300 border border-blue-800/40 flex items-center gap-0.5">
                                  <Clock size={9} />
                                  Time Remap
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-neutral-800 text-neutral-400 border border-neutral-700">
                                {layer.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Media Assets & Clips */}
        {activeTab === 'assets' && (
          <div className="space-y-3 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Folder size={13} className="text-blue-400" />
                <span>Linked Footage & Media Assets ({filteredClips.length || filteredFootage.length})</span>
              </h3>
            </div>

            <div className="bg-neutral-900/90 rounded-xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/70 shadow-md">
              {filteredClips.map((clip, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center gap-3 truncate">
                    <div className="p-1.5 rounded-md bg-neutral-800 shrink-0">
                      {getMediaIcon(clip.type)}
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-neutral-200 truncate">{clip.name}</div>
                      {clip.filePath && (
                        <div className="text-[10px] text-neutral-500 font-mono truncate max-w-md">
                          {clip.filePath}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-800 text-neutral-400 border border-neutral-700">
                    {clip.type}
                  </span>
                </div>
              ))}

              {filteredFootage.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center gap-3 truncate">
                    <div className="p-1.5 rounded-md bg-neutral-800 shrink-0">
                      {getMediaIcon(item.type)}
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-neutral-200 truncate">{item.name}</div>
                      {item.path && (
                        <div className="text-[10px] text-neutral-500 font-mono truncate max-w-lg" title={item.path}>
                          {item.path}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.serverName && (
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {item.serverName}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Markers */}
        {activeTab === 'markers' && (
          <div className="space-y-3 max-w-3xl mx-auto">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flag size={13} className="text-emerald-400" />
              <span>Project Cue Markers ({markers.length})</span>
            </h3>
            <div className="space-y-2">
              {markers.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-start gap-3"
                >
                  <Flag size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-xs text-white">{m.name}</div>
                    {m.comment && <div className="text-xs text-neutral-400 mt-0.5">{m.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Design, Fonts & Swatches */}
        {activeTab === 'typography' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {fonts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Type size={13} className="text-amber-400" />
                  <span>Document Typography ({fonts.length})</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {fonts.map((f, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {swatches.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={13} className="text-pink-400" />
                  <span>Color Plates & Swatches ({swatches.length})</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {swatches.map((s, idx) => {
                    const colorValue = parseSwatchColor(s);
                    return (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2.5 shadow-xs"
                      >
                        <span
                          className="w-4 h-4 rounded-md shrink-0 border border-white/20 shadow-xs"
                          style={{ backgroundColor: colorValue }}
                        />
                        <span className="truncate font-mono text-[11px]" title={s}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stories.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-blue-400" />
                  <span>Editorial Stories & Copy Threads ({stories.length})</span>
                </h4>
                <div className="space-y-3">
                  {stories.map((story, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-200 leading-relaxed font-sans shadow-xs hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-400 uppercase font-mono mb-2">
                        <span>Story Thread #{idx + 1}</span>
                        <span>•</span>
                        <span>{story.length} chars</span>
                      </div>
                      <p className="italic text-neutral-300">"{story}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Project Telemetry & Specifications */}
        {activeTab === 'telemetry' && hasMetadata && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={13} className="text-cyan-400" />
              <span>Project Telemetry & Specifications</span>
            </h3>

            <div className="bg-neutral-900/90 rounded-xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/80 shadow-md">
              {Object.entries(metadata).map(([key, val]) => (
                <div key={key} className="p-3 flex items-center justify-between text-xs hover:bg-neutral-800/40">
                  <span className="font-medium text-neutral-400">{key}</span>
                  <span className="font-mono text-neutral-200">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
