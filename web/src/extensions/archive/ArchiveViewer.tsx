import React, { useState, useEffect, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import {
  Archive,
  File,
  Folder,
  ChevronRight,
  Download,
  Search,
  Eye,
  X,
  FileText,
  FileCode,
  FileImage,
} from 'lucide-react';
import { PreviewExtensionProps } from '../../types';
import { formatHumanSize } from '../../utils/format';

interface ArchiveEntry {
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  date: Date;
  parentDir: string;
  extension: string;
}

async function decompressGzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Response(buffer).body?.pipeThrough(new DecompressionStream('gzip'));
  if (!stream) throw new Error('Browser does not support DecompressionStream');
  return new Response(stream).arrayBuffer();
}

function parseTar(buffer: ArrayBuffer): { entries: ArchiveEntry[]; dataMap: Map<string, Uint8Array> } {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  const entries: ArchiveEntry[] = [];
  const dataMap = new Map<string, Uint8Array>();
  let offset = 0;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    const rawName = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '').trim();
    const prefix = decoder.decode(header.subarray(345, 500)).replace(/\0.*$/, '').trim();
    const fullPath = prefix ? `${prefix}/${rawName}` : rawName;

    const sizeStr = decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim();
    const size = parseInt(sizeStr, 8) || 0;

    const mtimeStr = decoder.decode(header.subarray(136, 148)).replace(/\0.*$/, '').trim();
    const mtime = (parseInt(mtimeStr, 8) || 0) * 1000;

    const typeflag = header[156];
    const isDir = typeflag === 53 || fullPath.endsWith('/');

    const dataOffset = offset + 512;
    const cleanPath = fullPath.replace(/\/$/, '');

    if (cleanPath) {
      const parts = cleanPath.split('/');
      const name = parts[parts.length - 1];
      const parentDir = parts.slice(0, -1).join('/');
      const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';

      if (!isDir) {
        dataMap.set(cleanPath, bytes.subarray(dataOffset, dataOffset + size));
      }

      entries.push({
        path: cleanPath,
        name,
        isDir,
        size: isDir ? 0 : size,
        date: new Date(mtime || Date.now()),
        parentDir,
        extension: ext,
      });
    }

    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return { entries, dataMap };
}

export const ArchiveViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
  onDownload,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
  const tarDataMapRef = useRef<Map<string, Uint8Array>>(new Map());
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string>('');
  
  // Single-file in-archive preview
  const [previewItem, setPreviewItem] = useState<{
    entry: ArchiveEntry;
    text?: string;
    blobUrl?: string;
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(fileUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download archive`);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        tarDataMapRef.current.clear();
        const lowerName = fileName.toLowerCase();
        const isTarGz = lowerName.endsWith('.tar.gz') || lowerName.endsWith('.tgz');
        const isTar = lowerName.endsWith('.tar') || isTarGz;
        const isGz = lowerName.endsWith('.gz') && !isTarGz;

        if (isTar || isGz) {
          let tarBuffer = buffer;
          if (isTarGz || isGz) {
            tarBuffer = await decompressGzip(buffer);
          }

          if (isGz && !isTarGz) {
            const rawName = fileName.replace(/\.gz$/i, '');
            const rawBytes = new Uint8Array(tarBuffer);
            tarDataMapRef.current.set(rawName, rawBytes);
            setEntries([{
              path: rawName,
              name: rawName,
              isDir: false,
              size: rawBytes.length,
              date: new Date(),
              parentDir: '',
              extension: rawName.split('.').pop()?.toLowerCase() || '',
            }]);
          } else {
            const { entries: tarList, dataMap } = parseTar(tarBuffer);
            tarDataMapRef.current = dataMap;
            tarList.sort((a, b) => {
              if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
              return a.path.localeCompare(b.path);
            });
            setEntries(tarList);
          }
          setLoading(false);
          return;
        }

        const zip = await JSZip.loadAsync(buffer);
        if (cancelled) return;
        setZipInstance(zip);

        const list: ArchiveEntry[] = [];
        zip.forEach((relPath, file) => {
          const parts = relPath.replace(/\/$/, '').split('/');
          const name = parts[parts.length - 1];
          const parentDir = parts.slice(0, -1).join('/');
          const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';

          list.push({
            path: relPath,
            name,
            isDir: file.dir,
            // @ts-ignore internal metadata or 0
            size: (file as any)._data?.uncompressedSize || 0,
            date: file.date || new Date(),
            parentDir,
            extension: ext,
          });
        });

        // Sort folders first, then alphabetically
        list.sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.path.localeCompare(b.path);
        });

        setEntries(list);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to parse archive format');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, fileName]);

  // Statistics
  const stats = useMemo(() => {
    const totalFiles = entries.filter((e) => !e.isDir).length;
    const totalFolders = entries.filter((e) => e.isDir).length;
    const totalUncompressed = entries.reduce((acc, cur) => acc + (cur.isDir ? 0 : cur.size), 0);
    const savings =
      totalUncompressed > 0 && fileSize < totalUncompressed
        ? Math.round((1 - fileSize / totalUncompressed) * 100)
        : 0;

    return { totalFiles, totalFolders, totalUncompressed, savings };
  }, [entries, fileSize]);

  // Filtered entries
  const visibleEntries = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return entries.filter((e) => e.path.toLowerCase().includes(q));
    }
    // Folder traversal view
    return entries.filter((e) => e.parentDir === currentFolder);
  }, [entries, searchQuery, currentFolder]);

  // Handle previewing file inside archive
  const handlePreviewFile = async (entry: ArchiveEntry) => {
    if (entry.isDir) return;

    // 1. Tar entry preview
    if (tarDataMapRef.current.has(entry.path)) {
      setPreviewItem({ entry, loading: true });
      try {
        const ext = entry.extension;
        const isText = [
          'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'html', 'css', 'js', 'ts', 'tsx',
          'rs', 'py', 'sh', 'sql', 'toml', 'ini', 'log', 'env', 'tf', 'csv'
        ].includes(ext);
        const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
        const data = tarDataMapRef.current.get(entry.path)!;

        if (isText) {
          const text = new TextDecoder('utf-8').decode(data);
          setPreviewItem({ entry, text, loading: false });
        } else if (isImage) {
          const blob = new Blob([data as unknown as BlobPart], { type: `image/${ext === 'svg' ? 'svg+xml' : ext}` });
          const blobUrl = URL.createObjectURL(blob);
          setPreviewItem({ entry, blobUrl, loading: false });
        } else {
          setPreviewItem({ entry, loading: false });
        }
      } catch {
        setPreviewItem({ entry, text: 'Unable to preview file content.', loading: false });
      }
      return;
    }

    // 2. ZIP entry preview
    if (!zipInstance) return;
    const zipFile = zipInstance.file(entry.path);
    if (!zipFile) return;

    setPreviewItem({ entry, loading: true });

    try {
      const ext = entry.extension;
      const isText = [
        'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'html', 'css', 'js', 'ts', 'tsx',
        'rs', 'py', 'sh', 'sql', 'toml', 'ini', 'log', 'env', 'tf', 'csv'
      ].includes(ext);

      const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);

      if (isText) {
        const text = await zipFile.async('text');
        setPreviewItem({ entry, text, loading: false });
      } else if (isImage) {
        const blob = await zipFile.async('blob');
        const blobUrl = URL.createObjectURL(blob);
        setPreviewItem({ entry, blobUrl, loading: false });
      } else {
        setPreviewItem({ entry, loading: false });
      }
    } catch {
      setPreviewItem({ entry, text: 'Unable to preview file content.', loading: false });
    }
  };

  const handleDownloadSingleFile = async (entry: ArchiveEntry) => {
    if (entry.isDir) return;

    // 1. Tar entry download
    if (tarDataMapRef.current.has(entry.path)) {
      const data = tarDataMapRef.current.get(entry.path)!;
      const blob = new Blob([data as unknown as BlobPart]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 2. ZIP entry download
    if (!zipInstance) return;
    const zipFile = zipInstance.file(entry.path);
    if (!zipFile) return;

    const blob = await zipFile.async('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const breadcrumbParts = currentFolder ? currentFolder.split('/') : [];

  const getFileIcon = (entry: ArchiveEntry) => {
    if (entry.isDir) return <Folder size={15} className="text-amber-500 shrink-0" />;
    const ext = entry.extension;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return <FileImage size={15} className="text-pink-500 shrink-0" />;
    }
    if (['rs', 'ts', 'tsx', 'js', 'py', 'json', 'yaml', 'sql', 'toml', 'tf'].includes(ext)) {
      return <FileCode size={15} className="text-blue-500 shrink-0" />;
    }
    if (['txt', 'md', 'log', 'doc', 'pdf'].includes(ext)) {
      return <FileText size={15} className="text-emerald-500 shrink-0" />;
    }
    return <File size={15} className="text-slate-400 shrink-0" />;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-[#12141c] text-slate-800 dark:text-slate-200 select-none overflow-hidden font-sans">
      {/* Studio Header Toolbar */}
      <div className="h-11 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#171a26]/95 backdrop-blur-md px-3 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 text-[11px] font-semibold">
            <Archive size={14} />
            <span>Archive Deep Inspector</span>
          </div>

          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-medium truncate hidden sm:inline">
            {fileName}
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            ({formatHumanSize(fileSize)})
          </span>

          {!loading && !error && (
            <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 ml-1">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                {stats.totalFiles} files
              </span>
              {stats.savings > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                  {stats.savings}% compression ratio
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* In-archive search */}
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search archive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 sm:w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download Archive</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Main File List Pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumb path bar */}
          {!searchQuery && (
            <div className="h-8 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-[#151824]/60 px-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 shrink-0 overflow-x-auto">
              <button
                onClick={() => setCurrentFolder('')}
                className={`hover:text-blue-500 flex items-center gap-1 font-medium ${
                  !currentFolder ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
                }`}
              >
                <Archive size={13} />
                <span>Root</span>
              </button>

              {breadcrumbParts.map((part, idx) => {
                const stepPath = breadcrumbParts.slice(0, idx + 1).join('/');
                const isLast = idx === breadcrumbParts.length - 1;
                return (
                  <React.Fragment key={stepPath}>
                    <ChevronRight size={12} className="text-slate-400 shrink-0" />
                    <button
                      onClick={() => setCurrentFolder(stepPath)}
                      className={`hover:text-blue-500 truncate max-w-[120px] ${
                        isLast ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
                      }`}
                    >
                      {part}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Error / Loading / Content State */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Decompressing archive index...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-rose-500 gap-2">
              <Archive size={36} className="opacity-40" />
              <p className="text-sm font-semibold">Failed to read archive</p>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-[#1a1d29] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium z-10 select-none">
                  <tr>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3 text-right w-24">Size</th>
                    <th className="py-2 px-3 text-right hidden sm:table-cell w-36">Date</th>
                    <th className="py-2 px-3 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {/* "Up to parent directory" button if inside subfolder */}
                  {!searchQuery && currentFolder && (
                    <tr
                      onClick={() => {
                        const parts = currentFolder.split('/');
                        setCurrentFolder(parts.slice(0, -1).join('/'));
                      }}
                      className="hover:bg-slate-100/80 dark:hover:bg-slate-800/40 cursor-pointer text-slate-600 dark:text-slate-300"
                    >
                      <td className="py-2 px-3 flex items-center gap-2" colSpan={4}>
                        <Folder size={15} className="text-amber-500" />
                        <span className="font-sans font-semibold">.. (Parent folder)</span>
                      </td>
                    </tr>
                  )}

                  {visibleEntries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-sans">
                        No files or folders found in this directory.
                      </td>
                    </tr>
                  ) : (
                    visibleEntries.map((entry) => (
                      <tr
                        key={entry.path}
                        onClick={() => {
                          if (entry.isDir) {
                            setCurrentFolder(entry.path.replace(/\/$/, ''));
                          } else {
                            handlePreviewFile(entry);
                          }
                        }}
                        className={`hover:bg-blue-50/70 dark:hover:bg-blue-950/20 cursor-pointer transition-colors ${
                          previewItem?.entry.path === entry.path
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300'
                            : ''
                        }`}
                      >
                        <td className="py-2 px-3 flex items-center gap-2 truncate max-w-xs sm:max-w-md font-sans">
                          {getFileIcon(entry)}
                          <span className={`truncate ${entry.isDir ? 'font-semibold text-slate-800 dark:text-slate-200' : ''}`}>
                            {searchQuery ? entry.path : entry.name}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">
                          {entry.isDir ? '—' : formatHumanSize(entry.size)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400 hidden sm:table-cell">
                          {entry.date ? entry.date.toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {!entry.isDir && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handlePreviewFile(entry)}
                                title="Inspect / Preview"
                                className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => handleDownloadSingleFile(entry)}
                                title="Extract file"
                                className="p-1 rounded text-slate-400 hover:text-emerald-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Download size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Preview Drawer (if single file selected) */}
        {previewItem && (
          <div className="w-80 md:w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151824] flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
            <div className="h-9 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between bg-slate-50 dark:bg-[#1b1e2e]">
              <div className="flex items-center gap-1.5 truncate">
                {getFileIcon(previewItem.entry)}
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {previewItem.entry.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownloadSingleFile(previewItem.entry)}
                  title="Download File"
                  className="p-1 text-slate-400 hover:text-blue-500 rounded"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 flex flex-col">
              {previewItem.loading ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                  Decompressing item...
                </div>
              ) : previewItem.text !== undefined ? (
                <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-slate-800 dark:text-slate-200 leading-relaxed overflow-auto">
                  {previewItem.text}
                </pre>
              ) : previewItem.blobUrl ? (
                <div className="flex-1 flex items-center justify-center p-2">
                  <img
                    src={previewItem.blobUrl}
                    alt={previewItem.entry.name}
                    className="max-w-full max-h-72 object-contain rounded shadow-xs"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-slate-400 p-4">
                  <File size={36} className="opacity-40" />
                  <span className="text-xs font-medium">Binary asset</span>
                  <span className="text-[10px] text-slate-500">
                    Extract or download to view with native desktop software.
                  </span>
                  <button
                    onClick={() => handleDownloadSingleFile(previewItem.entry)}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <Download size={13} />
                    <span>Extract ({formatHumanSize(previewItem.entry.size)})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
