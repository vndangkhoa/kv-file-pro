import React from 'react';
import { ExtensionManifest, PreviewExtensionProps } from '../../types';
import { CadViewer } from '../../extensions/cad/CadViewer';
import { FontViewer } from '../../extensions/font/FontViewer';
import { AdobeSuiteViewer } from '../../extensions/adobe/AdobeSuiteViewer';
import { MarkdownViewer } from '../../extensions/markdown/MarkdownViewer';
import { SysVisViewer } from '../../extensions/sysvis/SysVisViewer';
import { ArchiveViewer } from '../../extensions/archive/ArchiveViewer';
import { CorelDrawViewer } from '../../extensions/coreldraw/CorelDrawViewer';
import { VectorStudioViewer } from '../../extensions/vector/VectorStudioViewer';
import { CodeConfigViewer } from './CodeConfigViewer';
import { Box, AlertCircle, Loader2 } from 'lucide-react';

const CodeConfigHost: React.FC<PreviewExtensionProps & { ext?: string }> = ({
  fileUrl,
  fileName,
  fileSize,
  ext,
  onDownload,
}) => {
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(fileUrl, { credentials: 'include' })
      .then((res) => res.text())
      .then((txt) => {
        setContent(txt);
        setLoading(false);
      })
      .catch((err) => {
        setContent(`// Error loading file content: ${err.message}`);
        setLoading(false);
      });
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#141416] text-neutral-400 text-xs gap-2">
        <Loader2 size={16} className="animate-spin text-blue-500" />
        <span>Loading document stream...</span>
      </div>
    );
  }

  return (
    <CodeConfigViewer
      content={content || ''}
      fileName={fileName}
      fileSize={fileSize}
      extension={ext}
      onDownload={onDownload}
    />
  );
};

interface ExtensionPreviewHostProps {
  extension: ExtensionManifest;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  ext: string;
  onDownload?: () => void;
}

export const ExtensionPreviewHost: React.FC<ExtensionPreviewHostProps> = ({
  extension,
  fileUrl,
  fileName,
  fileSize,
  ext,
  onDownload,
}) => {
  const previewProps: PreviewExtensionProps = {
    fileUrl,
    fileName,
    fileSize,
    extension: ext,
    onDownload,
  };

  if (extension.id === 'cad-viewer') {
    return <CadViewer {...previewProps} />;
  }

  if (extension.id === 'adobe-suite-viewer' || extension.id === 'psd-viewer') {
    return <AdobeSuiteViewer {...previewProps} />;
  }

  if (extension.id === 'font-viewer') {
    return <FontViewer {...previewProps} />;
  }

  if (extension.id === 'markdown-enhanced') {
    return <MarkdownViewer {...previewProps} />;
  }

  if (extension.id === 'sysvis-flow-viewer') {
    return <SysVisViewer {...previewProps} />;
  }

  if (extension.id === 'archive-inspector') {
    return <ArchiveViewer {...previewProps} />;
  }

  if (extension.id === 'coreldraw-viewer') {
    return <CorelDrawViewer {...previewProps} />;
  }

  if (extension.id === 'vector-svg-studio') {
    return <VectorStudioViewer {...previewProps} />;
  }

  if (extension.id === 'code-config-studio') {
    return <CodeConfigHost {...previewProps} ext={ext} />;
  }

  // Fallback for sandboxed web component / external iframe plugins
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gray-900 text-gray-300">
      <Box size={40} className="text-blue-500 mb-3" />
      <h3 className="font-semibold text-sm text-white mb-1">
        Rendered by {extension.name} ({extension.version})
      </h3>
      <p className="text-xs text-gray-400 max-w-md text-center mb-4">
        {extension.description}
      </p>
      <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 text-xs font-mono text-gray-300 flex items-center gap-2">
        <AlertCircle size={14} className="text-amber-400" />
        <span>Custom runtime extension container active</span>
      </div>
    </div>
  );
};
