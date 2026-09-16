import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Eye,
  EyeOff,
  Download,
  Loader2,
  Type,
  Image as ImageIcon,
  Sliders,
  Search,
  X,
  Palette,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Layers,
} from 'lucide-react';
import { DecodedLayer, DecodedPsdResult } from '../../psd/psdDecoder';
import { AiLayer, DecodedAiResult } from '../decoders/aiDecoder';

interface AdobeLayerTreeProps {
  appType?: 'ps' | 'ai' | string;
  psdResult?: DecodedPsdResult | null;
  aiResult?: DecodedAiResult | null;
  // Photoshop layer state
  hiddenLayerIds: Set<string>;
  onToggleLayer: (layerId: string, isGroup?: boolean) => void;
  soloLayerId: string | null;
  onToggleSoloLayer: (layerId: string) => void;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string | null) => void;
  onExportLayerPng?: (layer: DecodedLayer) => void;
  // Illustrator layer state
  hiddenAiLayerIds: Set<string>;
  onToggleAiLayer: (layerId: string) => void;
  soloAiLayerId: string | null;
  onToggleSoloAiLayer: (layerId: string) => void;
  onExportAiLayerPng?: (layer: AiLayer) => void;
  exportingAiLayerId?: string | null;
  onShowAllLayers?: () => void;
  onHideAllLayers?: () => void;
  onClose: () => void;
}

export const AdobeLayerTree: React.FC<AdobeLayerTreeProps> = ({
  psdResult,
  aiResult,
  hiddenLayerIds,
  onToggleLayer,
  soloLayerId,
  onToggleSoloLayer,
  selectedLayerId,
  onSelectLayer,
  onExportLayerPng,
  hiddenAiLayerIds,
  onToggleAiLayer,
  soloAiLayerId,
  onToggleSoloAiLayer,
  onExportAiLayerPng,
  exportingAiLayerId,
  onShowAllLayers,
  onHideAllLayers,
  onClose,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'image' | 'group'>('all');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);

  // Group expand/collapse toggles
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const expandAllGroups = () => setCollapsedGroupIds(new Set());
  const collapseAllGroups = () => {
    if (!psdResult) return;
    const allGroupIds = new Set<string>();
    function collect(layers: DecodedLayer[]) {
      for (const l of layers) {
        if (l.isGroup) {
          allGroupIds.add(l.id);
          if (l.children) collect(l.children);
        }
      }
    }
    collect(psdResult.layers);
    setCollapsedGroupIds(allGroupIds);
  };

  // Copy text helper
  const handleCopyText = (layer: DecodedLayer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (layer.textInfo?.text) {
      navigator.clipboard.writeText(layer.textInfo.text).catch(() => {});
      setCopiedTextId(layer.id);
      setTimeout(() => setCopiedTextId(null), 1800);
    }
  };

  // Smart Categorization for Illustrator Layers (Spot Inks vs Design Artwork)
  const { spotPlates, designLayers } = useMemo(() => {
    if (!aiResult?.layers) return { spotPlates: [], designLayers: [] };
    const spots: AiLayer[] = [];
    const design: AiLayer[] = [];

    for (const l of aiResult.layers) {
      const n = l.name.toLowerCase();
      const isCompositeOrPreview =
        n.includes('preview') || n.includes('composite') || n.includes('artwork');
      if (
        !isCompositeOrPreview &&
        (n.includes('pantone') ||
          n.includes('backer') ||
          n.includes('backing') ||
          n.includes('die') ||
          n.includes('varnish') ||
          n.includes('foil') ||
          n.includes('plate') ||
          n.includes('ink'))
      ) {
        spots.push(l);
      } else {
        design.push(l);
      }
    }
    return { spotPlates: spots, designLayers: design };
  }, [aiResult]);

  // Filtered Illustrator Layers for search query
  const filteredSpotPlates = useMemo(() => {
    if (!filterQuery) return spotPlates;
    const q = filterQuery.toLowerCase();
    return spotPlates.filter((l) => l.name.toLowerCase().includes(q));
  }, [spotPlates, filterQuery]);

  const filteredDesignLayers = useMemo(() => {
    if (!filterQuery) return designLayers;
    const q = filterQuery.toLowerCase();
    return designLayers.filter((l) => l.name.toLowerCase().includes(q));
  }, [designLayers, filterQuery]);

  const aiLayersCountDisplay = useMemo(() => {
    if (!aiResult) return 0;
    if (filterQuery) {
      return `${filteredSpotPlates.length + filteredDesignLayers.length} / ${aiResult.layers.length}`;
    }
    return aiResult.layers.length;
  }, [aiResult, filterQuery, filteredSpotPlates.length, filteredDesignLayers.length]);

  // Render a Photoshop Layer Node (Recursive Tree)
  const renderPsdLayerNode = (layer: DecodedLayer): React.ReactNode => {
    const isGroup = layer.isGroup;
    const isCollapsed = collapsedGroupIds.has(layer.id);
    const isHidden = hiddenLayerIds.has(layer.id);
    const isSolo = soloLayerId === layer.id;
    const isSelected = selectedLayerId === layer.id;

    // Filter matching
    const matchesQuery =
      !filterQuery || layer.name.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'text' && layer.type === 'text') ||
      (typeFilter === 'image' && layer.type === 'image') ||
      (typeFilter === 'group' && isGroup);

    // If query or type filter is active, check if any descendant matches
    let hasMatchingDescendant = false;
    if (isGroup && layer.children) {
      const checkDescendants = (children: DecodedLayer[]): boolean => {
        return children.some((c) => {
          const m =
            (!filterQuery || c.name.toLowerCase().includes(filterQuery.toLowerCase())) &&
            (typeFilter === 'all' ||
              (typeFilter === 'text' && c.type === 'text') ||
              (typeFilter === 'image' && c.type === 'image') ||
              (typeFilter === 'group' && c.isGroup));
          return m || (c.children ? checkDescendants(c.children) : false);
        });
      };
      hasMatchingDescendant = checkDescendants(layer.children);
    }

    if (!matchesQuery && !hasMatchingDescendant) return null;
    if (typeFilter !== 'all' && !matchesType && !hasMatchingDescendant) return null;

    return (
      <div key={layer.id} className="select-none">
        {/* Layer Row */}
        <div
          onClick={() => onSelectLayer && onSelectLayer(isSelected ? null : layer.id)}
          className={`group py-1.5 px-2 flex items-center justify-between rounded-lg transition-colors cursor-pointer text-xs ${
            isSelected
              ? 'bg-blue-600/30 border border-blue-500/60 shadow-xs'
              : 'hover:bg-neutral-800/70'
          }`}
          style={{ paddingLeft: `${Math.min(layer.depth * 14 + 6, 72)}px` }}
        >
          {/* Left: Collapse Icon, Type Icon, Name */}
          <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
            {isGroup ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroupCollapse(layer.id);
                }}
                className="p-0.5 hover:bg-neutral-700/60 rounded text-neutral-400 hover:text-white shrink-0"
              >
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            {/* Layer Icon */}
            {isGroup ? (
              isCollapsed ? (
                <Folder size={14} className="text-amber-400 shrink-0" />
              ) : (
                <FolderOpen size={14} className="text-amber-400 shrink-0" />
              )
            ) : layer.type === 'text' ? (
              <Type size={13} className="text-blue-400 shrink-0" />
            ) : layer.type === 'image' ? (
              layer.thumbnailUrl ? (
                <img
                  src={layer.thumbnailUrl}
                  alt=""
                  className="w-3.5 h-3.5 rounded-xs object-cover border border-white/20 shrink-0"
                />
              ) : (
                <ImageIcon size={13} className="text-neutral-400 shrink-0" />
              )
            ) : (
              <Sliders size={13} className="text-purple-400 shrink-0" />
            )}

            {/* Layer Name & Badges */}
            <span
              className={`truncate text-[11px] ${
                isHidden
                  ? 'text-neutral-500 line-through'
                  : isSelected
                  ? 'text-white font-medium'
                  : 'text-neutral-200'
              }`}
              title={layer.name}
            >
              {layer.name}
            </span>

            {isGroup && layer.childCount !== undefined && layer.childCount > 0 && (
              <span className="text-[9px] text-neutral-500 font-mono shrink-0">
                ({layer.childCount})
              </span>
            )}
          </div>

          {/* Right Action Icons */}
          <div
            className="flex items-center gap-1 shrink-0 ml-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Copy Text for Text Layers */}
            {layer.type === 'text' && layer.textInfo?.text && (
              <button
                onClick={(e) => handleCopyText(layer, e)}
                className="p-1 text-neutral-400 hover:text-blue-400 rounded transition-colors"
                title="Copy layer text"
              >
                {copiedTextId === layer.id ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy size={11} />
                )}
              </button>
            )}

            {/* Solo Toggle */}
            <button
              onClick={() => onToggleSoloLayer(layer.id)}
              className={`px-1 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer ${
                isSolo
                  ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title={isSolo ? 'Unsolo layer' : 'Solo layer'}
            >
              S
            </button>

            {/* Export Layer PNG */}
            {layer.canvas && onExportLayerPng && (
              <button
                onClick={() => onExportLayerPng(layer)}
                className="p-1 text-neutral-500 hover:text-white rounded transition-colors"
                title="Export transparent PNG"
              >
                <Download size={11} />
              </button>
            )}

            {/* Visibility Eye */}
            <button
              onClick={() => onToggleLayer(layer.id, isGroup)}
              className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
              title={isHidden ? 'Show layer' : 'Hide layer'}
            >
              {isHidden ? <EyeOff size={13} className="text-red-400" /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* Children (when group is expanded) */}
        {isGroup && !isCollapsed && layer.children && (
          <div className="space-y-0.5 mt-0.5">
            {layer.children.map((child) => renderPsdLayerNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 z-20 animate-in slide-in-from-right-10 duration-200 select-none shadow-2xl">
      {/* 1. Header with Global Quick Actions */}
      <div className="h-11 border-b border-neutral-800 px-3 flex items-center justify-between bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-2 font-semibold text-xs text-white">
          <span>Layers & Groups</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-neutral-800 text-neutral-400">
            {psdResult ? psdResult.flatLayers.length : aiLayersCountDisplay}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Global Show / Hide */}
          {onShowAllLayers && (
            <button
              onClick={onShowAllLayers}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Show all layers"
            >
              <Eye size={13} />
            </button>
          )}

          {onHideAllLayers && (
            <button
              onClick={onHideAllLayers}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Hide all layers"
            >
              <EyeOff size={13} />
            </button>
          )}

          {/* PSD Expand / Collapse All */}
          {psdResult && (
            <>
              <button
                onClick={expandAllGroups}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Expand all groups"
              >
                <Maximize2 size={12} />
              </button>
              <button
                onClick={collapseAllGroups}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Collapse all groups"
              >
                <Minimize2 size={12} />
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors ml-1"
            title="Close layers panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. Quick Search & Type Filter Bar */}
      <div className="p-2 border-b border-neutral-800/80 bg-neutral-950/40 space-y-1.5 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search layers..."
            className="w-full pl-7 pr-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-200 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {psdResult && (
          <div className="flex items-center gap-1 text-[10px]">
            {(['all', 'text', 'image', 'group'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  typeFilter === t
                    ? 'bg-neutral-700 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Layer Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {/* === PHOTOSHOP NESTED HIERARCHY === */}
        {psdResult && psdResult.layers.map((layer) => renderPsdLayerNode(layer))}

        {/* === ILLUSTRATOR SMART SPOT PLATES & DESIGN LAYERS === */}
        {aiResult && (
          <div className="space-y-4">
            {/* Spot Color & Ink Separation Plates */}
            {filteredSpotPlates.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-1 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <Palette size={12} className="text-pink-400" />
                  <span>Ink & Spot Color Plates ({filteredSpotPlates.length})</span>
                </div>

                <div className="space-y-1">
                  {filteredSpotPlates.map((layer) => {
                    const isHidden = hiddenAiLayerIds.has(layer.id);
                    const isSolo = soloAiLayerId === layer.id;
                    const isExporting = exportingAiLayerId === layer.id;

                    return (
                      <div
                        key={layer.id}
                        className={`py-1.5 px-2.5 flex items-center justify-between rounded-lg transition-colors border ${
                          isSolo
                            ? 'bg-amber-500/15 border-amber-500/50 shadow-xs'
                            : 'bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white/30"
                            style={{ backgroundColor: layer.color }}
                            title={`Ink Plate Color: ${layer.color}`}
                          />
                          <span
                            className={`truncate text-[11px] font-medium ${
                              isHidden ? 'text-neutral-500 line-through' : 'text-neutral-200'
                            }`}
                            title={layer.name}
                          >
                            {layer.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 font-mono">
                            Print
                          </span>

                          {/* Export Plate PNG */}
                          {onExportAiLayerPng && (
                            <button
                              onClick={() => onExportAiLayerPng(layer)}
                              disabled={isExporting}
                              className="p-1 text-neutral-500 hover:text-white rounded transition-colors disabled:opacity-50"
                              title="Export plate as transparent PNG"
                            >
                              {isExporting ? (
                                <Loader2 size={11} className="animate-spin text-blue-400" />
                              ) : (
                                <Download size={11} />
                              )}
                            </button>
                          )}

                          {/* Solo Plate Mode */}
                          <button
                            onClick={() => onToggleSoloAiLayer(layer.id)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                              isSolo
                                ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50'
                                : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                            title={isSolo ? 'Unsolo plate' : 'Solo spot plate separation'}
                          >
                            S
                          </button>

                          {/* Visibility Eye */}
                          <button
                            onClick={() => onToggleAiLayer(layer.id)}
                            className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                            title={isHidden ? 'Show plate' : 'Hide plate'}
                          >
                            {isHidden ? <EyeOff size={13} className="text-red-400" /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Artwork & Graphic Layers */}
            {filteredDesignLayers.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-1 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <Layers size={12} className="text-blue-400" />
                  <span>Design Artwork Layers ({filteredDesignLayers.length})</span>
                </div>

                <div className="space-y-1">
                  {filteredDesignLayers.map((layer) => {
                    const isHidden = hiddenAiLayerIds.has(layer.id);
                    const isSolo = soloAiLayerId === layer.id;
                    const isExporting = exportingAiLayerId === layer.id;

                    return (
                      <div
                        key={layer.id}
                        className="py-1.5 px-2.5 flex items-center justify-between rounded-lg bg-neutral-900/60 border border-neutral-800/80 hover:bg-neutral-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white/20"
                            style={{ backgroundColor: layer.color }}
                          />
                          <span
                            className={`truncate text-[11px] ${
                              isHidden ? 'text-neutral-500 line-through' : 'text-neutral-200'
                            }`}
                            title={layer.name}
                          >
                            {layer.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {/* Export Layer PNG */}
                          {onExportAiLayerPng && (
                            <button
                              onClick={() => onExportAiLayerPng(layer)}
                              disabled={isExporting}
                              className="p-1 text-neutral-500 hover:text-white rounded transition-colors disabled:opacity-50"
                              title="Export layer as transparent PNG"
                            >
                              {isExporting ? (
                                <Loader2 size={11} className="animate-spin text-blue-400" />
                              ) : (
                                <Download size={11} />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => onToggleSoloAiLayer(layer.id)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                              isSolo
                                ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50'
                                : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                            title={isSolo ? 'Unsolo layer' : 'Solo layer'}
                          >
                            S
                          </button>

                          <button
                            onClick={() => onToggleAiLayer(layer.id)}
                            className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                            title={isHidden ? 'Show layer' : 'Hide layer'}
                          >
                            {isHidden ? <EyeOff size={13} className="text-red-400" /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty search state for Illustrator layers */}
            {filterQuery && filteredSpotPlates.length === 0 && filteredDesignLayers.length === 0 && (
              <div className="py-8 px-4 text-center text-neutral-500">
                <p className="text-[11px]">No layers matching "{filterQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
