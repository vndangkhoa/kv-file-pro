import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ExtensionManifest, PRO_BUNDLE_ID, SystemEditionInfo } from '../types';

export const OFFICIAL_EXTENSIONS_CATALOG: ExtensionManifest[] = [
  {
    id: 'cad-viewer',
    name: 'Universal CAD, BIM & 3D Viewer',
    version: '3.0.0',
    description: 'Enterprise engineering viewport for AutoCAD (DWG/DXF), BIM (IFC), Parametric Solids (STEP/IGES), and 3D Meshes (STL, OBJ, GLTF, 3MF).',
    author: 'KV Files Team',
    icon: 'box',
    category: 'previewer',
    supportedExtensions: [
      'dwg', 'dxf', 'ifc', 'step', 'stp', 'iges', 'igs', 'brep',
      'stl', 'obj', 'gltf', 'glb', '3mf', 'ply', 'fbx'
    ],
    supportedMimeTypes: [
      'application/acad',
      'application/x-acad',
      'application/autocad_dwg',
      'image/vnd.dwg',
      'drawing/dwg',
      'application/dxf',
      'application/x-step',
      'model/step',
      'model/iges',
      'application/x-ifc',
      'model/ifc',
      'model/stl',
      'model/gltf-binary',
      'model/gltf+json',
      'model/3mf',
    ],
    size: '420 KB',
    badge: 'Official',
    rating: 4.98,
    downloads: '28.4k',
    price: 99000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'BIM IFC Spatial Tree & Property Sets inspector',
      'Interactive 3D Orbit, Pan & ViewCube Orientation Gizmo',
      'Dynamic 3-Axis Sectioning (Cutting Planes)',
      'Precision Point-to-Point Measurement Tool',
      'Assembly Exploded View Animation slider',
      'AutoCAD 2D Blueprint & Dark CAD Themes',
      'Zero-server footprint (Client-side WebGL)',
    ],
  },
  {
    id: 'adobe-suite-viewer',
    name: 'Adobe Creative Suite Studio',
    version: '2.0.0',
    description: 'Universal viewport & telemetry inspector for Adobe Photoshop (PSD, PSB), Illustrator (AI), Encapsulated PostScript (EPS), InDesign (INDD, IDML), Adobe XD, Premiere Pro (PRPROJ), After Effects (AEP), and Lightroom RAW (DNG).',
    author: 'KV Files Team',
    icon: 'palette',
    category: 'previewer',
    supportedExtensions: [
      'psd', 'psb', 'ai', 'eps', 'indd', 'indt', 'idml', 'xd', 'prproj', 'aep', 'aepx', 'dng'
    ],
    supportedMimeTypes: [
      'image/vnd.adobe.photoshop',
      'image/x-photoshop',
      'application/illustrator',
      'application/postscript',
      'image/x-eps',
      'application/eps',
      'application/pdf',
      'application/x-indesign',
      'application/vnd.adobe.indesign-idml-package',
      'application/vnd.adobe.xd',
      'application/x-premiere',
      'application/x-aftereffects',
      'image/x-adobe-dng',
    ],
    size: '340 KB',
    badge: 'Official',
    rating: 4.98,
    downloads: '38.4k',
    price: 79000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'Layer hierarchy & Canvas composite for Photoshop (PSD, PSB)',
      'Vector PDF artboard streaming for Illustrator (AI)',
      'Embedded preview extraction & vector path renderer for PostScript (EPS)',
      'Embedded high-res XMP thumbnail extraction for InDesign (INDD, INDT)',
      'Spread layout & story text parsing for InDesign IDML packages',
      'Interactive artboard viewer for Adobe XD design bundles',
      'Sequence timelines, markers & clip asset inspector for Premiere Pro (PRPROJ)',
      'Composition graph & render specs for After Effects (AEP, AEPX)',
      'Zero-server footprint (Pure client-side WebAssembly & Web APIs)',
    ],
  },
  {
    id: 'font-viewer',
    name: 'Typography & Font Specimen Studio',
    version: '1.0.0',
    description: 'Dynamic in-browser typography viewport for TrueType (TTF), OpenType (OTF), and Web Fonts (WOFF, WOFF2) with live waterfalls, pangrams, and Unicode glyph maps.',
    author: 'KV Files Team',
    icon: 'type',
    category: 'previewer',
    supportedExtensions: ['ttf', 'otf', 'woff', 'woff2'],
    supportedMimeTypes: [
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2',
      'application/font-woff',
      'application/x-font-ttf',
      'application/x-font-otf',
    ],
    size: '86 KB',
    badge: 'Official',
    rating: 4.95,
    downloads: '18.7k',
    price: 39000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'Zero-server client-side FontFace dynamic binding',
      'Cascading waterfall scale tester (14px - 64px)',
      'Classic, Mythical & Multilingual Pangram presets',
      'Interactive editable type specimen playground',
      'Complete Unicode glyph map & entity inspector',
      'High-contrast Light / Dark typography modes',
    ],
  },
  {
    id: 'markdown-enhanced',
    name: 'Markdown Studio & Mermaid Viewer',
    version: '1.0.4',
    description: 'Enhanced Markdown previewer with syntax-highlighted code blocks, Mermaid diagrams, and LaTeX math rendering.',
    author: 'Community',
    icon: 'file-text',
    category: 'previewer',
    supportedExtensions: ['md', 'markdown'],
    size: '95 KB',
    rating: 4.8,
    downloads: '9.5k',
    price: 29000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'Mermaid Diagram rendering',
      'Interactive syntax highlighting',
      'KaTeX LaTeX math formulas',
      'Table of Contents generator'
    ],
  },
  {
    id: 'archive-inspector',
    name: 'Archive Deep Inspector',
    version: '1.1.2',
    description: 'Browse directory contents inside Zip, Tar, Gz, and 7z archives without extracting them to disk.',
    author: 'KV Files Team',
    icon: 'layers',
    category: 'previewer',
    supportedExtensions: ['zip', 'tar', 'gz', 'tgz', '7z'],
    size: '115 KB',
    badge: 'Popular',
    rating: 4.85,
    downloads: '32.1k',
    price: 29000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'In-memory archive tree traversal',
      'Individual file preview & extraction',
      'Archive compression ratio stats'
    ],
  },
  {
    id: 'exif-metadata-pro',
    name: 'EXIF & Camera Telemetry Pro',
    version: '1.0.2',
    description: 'Displays camera shutter speed, ISO, aperture, lens profile, and interactive GPS map location for RAW and JPEG photos.',
    author: 'Community',
    icon: 'cpu',
    category: 'utility',
    supportedExtensions: ['cr2', 'nef', 'arw', 'dng'],
    size: '84 KB',
    rating: 4.7,
    downloads: '8.3k',
    price: 29000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'Camera shutter, ISO & aperture telemetry',
      'Embedded GPS coordinate preview',
      'RGB color histogram analysis'
    ],
  },
  {
    id: 'sysvis-flow-viewer',
    name: 'SysVis Architecture & Flow Animator',
    version: '1.0.0',
    description: 'Interactive system architecture and animated flowchart viewport with live flow pulses, Dagre auto-layout, and Mermaid engine.',
    author: 'SysVis.AI & KV Files Team',
    icon: 'workflow',
    category: 'previewer',
    supportedExtensions: ['mmd', 'mermaid', 'flow', 'arch', 'diag'],
    supportedMimeTypes: ['text/vnd.mermaid', 'application/json'],
    size: '160 KB',
    badge: 'Official',
    rating: 4.97,
    downloads: '21.5k',
    price: 49000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'Real-time SVG animateMotion edge flow pulses',
      'Mermaid & Flowchart syntax in-browser compiler',
      'Dagre self-healing orthogonal auto-layout',
      'Interactive Zoom, Pan, MiniMap & Node inspection',
      'Zero-server footprint (Pure client-side rendering)'
    ],
  },
  {
    id: 'code-config-studio',
    name: 'Code & Config Studio Pro',
    version: '2.0.0',
    description: 'High-performance code & configuration workbench with Prism syntax highlighting, synchronized line numbers, code formatters, in-file search, and telemetry.',
    author: 'KV Files Team',
    icon: 'code',
    category: 'previewer',
    supportedExtensions: [
      'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'yaml', 'yml', 'toml',
      'py', 'rs', 'sql', 'sh', 'bash', 'zsh', 'tf', 'hcl', 'ini', 'conf', 'env',
      'xml', 'html', 'css', 'scss', 'dockerfile'
    ],
    supportedMimeTypes: [
      'text/plain',
      'text/javascript',
      'application/json',
      'text/x-yaml',
      'application/x-yaml',
      'text/x-python',
      'text/x-rust',
      'text/x-sql',
      'application/sql',
      'text/x-sh',
    ],
    size: '180 KB',
    badge: 'Official',
    rating: 4.99,
    downloads: '45.2k',
    price: 39000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'Prism.js syntax highlighting for 15+ code & config languages',
      'Synchronized non-breaking line number gutter',
      'One-click code formatter (Pretty JSON, SQL, XML, HTML)',
      'In-document keyword search with match jumping',
      'Wrap/no-wrap toggle, font scaling, and UTF-8 telemetry',
      'Zero-server footprint (Pure in-browser rendering)'
    ],
  },
  {
    id: 'coreldraw-viewer',
    name: 'CorelDRAW Graphics Studio',
    version: '1.0.0',
    description: 'Universal vector drawing viewport and telemetry inspector for CorelDRAW files (CDR, CDT, CDX, CMX) with high-res raster preview and metadata extraction.',
    author: 'KV Files Team',
    icon: 'palette',
    category: 'previewer',
    supportedExtensions: ['cdr', 'cdt', 'cdx', 'cmx'],
    supportedMimeTypes: [
      'application/coreldraw',
      'application/x-coreldraw',
      'application/x-cdr',
      'image/x-coreldraw',
    ],
    size: '140 KB',
    badge: 'Official',
    rating: 4.96,
    downloads: '14.2k',
    price: 49000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'High-resolution client-side preview extraction for CorelDRAW X4 to 2024+',
      'Legacy RIFF-CDR DISP chunk bitmap parser',
      'Document telemetry & metadata (version, author, pages, color profile)',
      'Interactive canvas zoom, pan & background transparency grid',
      'Zero-server footprint (Pure in-browser Web APIs)',
    ],
  },
  {
    id: 'vector-svg-studio',
    name: 'Vector Graphics & SVG Studio Pro',
    version: '2.0.0',
    description: 'High-precision vector viewport & telemetry inspector for SVG and compressed SVGZ graphics with infinite pan/zoom, transparency grids, XML source inspection, palette extraction, and PNG rasterizer.',
    author: 'KV Files Team',
    icon: 'palette',
    category: 'previewer',
    supportedExtensions: ['svg', 'svgz'],
    supportedMimeTypes: ['image/svg+xml'],
    size: '120 KB',
    badge: 'Official',
    rating: 4.99,
    downloads: '29.8k',
    price: 39000,
    isPaid: true,
    isPurchased: false,
    installed: false,
    enabled: false,
    features: [
      'Infinite vector pan & smooth wheel zoom (25% to 1000%)',
      'Transparency checkerboard, crisp white, dark slate & pitch black canvas presets',
      'Dual-mode toggle: Rendered Vector vs. Prism-highlighted SVG XML source',
      'Automated color palette scanner & 1-click HEX swatch copy',
      'Vector node telemetry: paths, groups, defs, dimensions, and viewBox',
      'Client-side PNG raster export at 1x, 2x, and 4x resolutions',
      'Pure client-side decompression for gzip .svgz files',
    ],
  },
];

interface ExtensionStoreState {
  extensions: ExtensionManifest[];
  isProLicensed: boolean;
  proLicenseKey: string | null;
  systemEdition: SystemEditionInfo | null;
  installExtension: (id: string) => void;
  uninstallExtension: (id: string) => void;
  toggleExtension: (id: string) => void;
  markExtensionPurchased: (id: string, licenseKey?: string) => void;
  unlockProLifetime: (licenseKey?: string) => void;
  enableAllExtensions: () => void;
  disableAllExtensions: () => void;
  activateLicense: (code: string) => Promise<{ success: boolean; extension_id?: string; message: string }>;
  fetchLicenses: () => Promise<void>;
  fetchSystemEdition: () => Promise<void>;
  getPreviewerForExt: (ext: string) => ExtensionManifest | undefined;
  getAvailableExtensionForExt: (ext: string) => ExtensionManifest | undefined;
  resetToDefaults: () => void;
}

export const useExtensionStore = create<ExtensionStoreState>()(
  persist(
    (set, get) => ({
      extensions: OFFICIAL_EXTENSIONS_CATALOG,
      isProLicensed: false,
      proLicenseKey: null,
      systemEdition: null,

      unlockProLifetime: (licenseKey?: string) => {
        set((state) => ({
          isProLicensed: true,
          proLicenseKey: licenseKey || state.proLicenseKey,
          extensions: state.extensions.map((ext) => ({
            ...ext,
            isPurchased: true,
            installed: ext.isPaid ? true : ext.installed,
            enabled: ext.isPaid ? true : ext.enabled,
          })),
        }));
      },

      enableAllExtensions: () => {
        set((state) => ({
          extensions: state.extensions.map((ext) => {
            const isPurchased = state.isProLicensed || !ext.isPaid || ext.isPurchased;
            if (isPurchased) {
              return { ...ext, installed: true, enabled: true };
            }
            return ext;
          }),
        }));
      },

      disableAllExtensions: () => {
        set((state) => ({
          extensions: state.extensions.map((ext) => ({
            ...ext,
            installed: false,
            enabled: false,
          })),
        }));
      },

      installExtension: (id: string) => {
        set((state) => ({
          extensions: state.extensions.map((ext) => {
            if (ext.id !== id) return ext;
            if (ext.isPaid && !ext.isPurchased && !state.isProLicensed) {
              return ext;
            }
            return { ...ext, installed: true, enabled: true };
          }),
        }));
      },

      uninstallExtension: (id: string) => {
        set((state) => ({
          extensions: state.extensions.map((ext) =>
            ext.id === id ? { ...ext, installed: false, enabled: false } : ext
          ),
        }));
      },

      toggleExtension: (id: string) => {
        set((state) => ({
          extensions: state.extensions.map((ext) =>
            ext.id === id ? { ...ext, enabled: !ext.enabled } : ext
          ),
        }));
      },

      markExtensionPurchased: (id: string, licenseKey?: string) => {
        if (id === PRO_BUNDLE_ID) {
          get().unlockProLifetime(licenseKey);
          return;
        }
        set((state) => ({
          extensions: state.extensions.map((ext) =>
            ext.id === id
              ? { ...ext, isPurchased: true, installed: true, enabled: true }
              : ext
          ),
        }));
      },

      activateLicense: async (code: string) => {
        try {
          const res = await fetch('/api/v1/payments/licenses/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code: code.trim() }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || err.message || 'Invalid or unconfirmed activation code');
          }

          const data = await res.json();
          if (data.success) {
            if (
              data.extension_id === PRO_BUNDLE_ID ||
              (data.license_key && data.license_key.startsWith('KV-PRO-'))
            ) {
              get().unlockProLifetime(data.license_key);
            } else if (data.extension_id) {
              set((state) => ({
                extensions: state.extensions.map((ext) =>
                  ext.id === data.extension_id
                    ? { ...ext, isPurchased: true, installed: true, enabled: true }
                    : ext
                ),
              }));
            }
            // Refetch licenses in background
            get().fetchLicenses();
          }

          return {
            success: true,
            extension_id: data.extension_id,
            message: data.message || 'Lifetime license activated!',
          };
        } catch (err: any) {
          return {
            success: false,
            message: err.message || 'Failed to activate code',
          };
        }
      },

      fetchLicenses: async () => {
        try {
          const res = await fetch('/api/v1/payments/licenses', {
            credentials: 'include',
          });
          if (res.ok) {
            const licenses: { extension_id: string; license_key?: string }[] = await res.json();
            const licensedIds = new Set(licenses.map((l) => l.extension_id));
            const isPro = licensedIds.has(PRO_BUNDLE_ID);
            const proLicense = licenses.find((l) => l.extension_id === PRO_BUNDLE_ID);

            set((state) => {
              return {
                isProLicensed: isPro,
                proLicenseKey: proLicense?.license_key || (isPro ? state.proLicenseKey : null),
                extensions: state.extensions.map((ext) => {
                  const isPurchased = isPro || !ext.isPaid || licensedIds.has(ext.id);
                  return {
                    ...ext,
                    isPurchased,
                    installed: isPurchased ? (ext.installed ?? true) : false,
                    enabled: isPurchased ? (ext.enabled ?? true) : false,
                  };
                }),
              };
            });
          } else if (res.status === 401) {
            set((state) => ({
              isProLicensed: false,
              proLicenseKey: null,
              extensions: state.extensions.map((ext) => ({
                ...ext,
                isPurchased: !ext.isPaid,
                installed: !ext.isPaid ? Boolean(ext.installed) : false,
                enabled: !ext.isPaid ? Boolean(ext.enabled) : false,
              })),
            }));
          }
        } catch {
          // Ignore network errors in offline/dev
        }
      },

      fetchSystemEdition: async () => {
        try {
          const res = await fetch('/api/v1/system/edition', {
            credentials: 'include',
          });
          if (res.ok) {
            const data: SystemEditionInfo = await res.json();
            set({ systemEdition: data });
            if (data.is_licensed) {
              set((state) => ({
                isProLicensed: true,
                proLicenseKey: data.license_id || state.proLicenseKey,
                extensions: state.extensions.map((ext) => ({
                  ...ext,
                  isPurchased: true,
                  installed: ext.isPaid ? (ext.installed ?? true) : ext.installed,
                  enabled: ext.isPaid ? (ext.enabled ?? true) : ext.enabled,
                })),
              }));
            }
          }
        } catch {
          // Offline fallback
        }
      },

      getPreviewerForExt: (ext: string) => {
        const cleanExt = (ext || '').toLowerCase().replace(/^\./, '');
        return get().extensions.find(
          (e) =>
            e.installed &&
            e.enabled &&
            (!e.isPaid || e.isPurchased || get().isProLicensed) &&
            e.supportedExtensions.includes(cleanExt)
        );
      },

      getAvailableExtensionForExt: (ext: string) => {
        const cleanExt = (ext || '').toLowerCase().replace(/^\./, '');
        return get().extensions.find(
          (e) => e.supportedExtensions.includes(cleanExt)
        );
      },

      resetToDefaults: () => {
        try {
          localStorage.removeItem('kv-file-extensions-storage');
        } catch {}
        set({
          extensions: OFFICIAL_EXTENSIONS_CATALOG,
          isProLicensed: false,
          proLicenseKey: null,
        });
        get().fetchLicenses();
      },
    }),
    {
      name: 'kv-file-extensions-storage',
      merge: (persistedState: any, currentState: ExtensionStoreState) => {
        if (!persistedState || !Array.isArray(persistedState.extensions)) {
          return currentState;
        }
        // In production, licenses are governed strictly by the backend SQLite database.
        // We only restore user UI toggles (installed, enabled), never trusting unverified purchase flags.
        const merged = currentState.extensions.map((defaultExt) => {
          const found = persistedState.extensions.find((p: ExtensionManifest) => p.id === defaultExt.id);
          if (found) {
            return {
              ...defaultExt,
              installed: Boolean(found.installed),
              enabled: Boolean(found.enabled),
              isPurchased: !defaultExt.isPaid,
            };
          }
          return defaultExt;
        });
        return {
          ...currentState,
          isProLicensed: false,
          proLicenseKey: null,
          extensions: merged,
        };
      },
    }
  )
);
