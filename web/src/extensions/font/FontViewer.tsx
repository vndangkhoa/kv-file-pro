import React, { useState, useEffect, useMemo } from 'react';
import {
  Type,
  Sliders,
  AlignLeft,
  Grid,
  Download,
  Copy,
  Check,
  RotateCcw,
  Info,
  Sun,
  Moon,
} from 'lucide-react';
import { PreviewExtensionProps } from '../../types';
import { formatHumanSize } from '../../utils/format';

const PANGRAM_PRESETS = [
  { label: 'Classic Pangram', text: 'The quick brown fox jumps over the lazy dog.' },
  { label: 'Mythical Pangram', text: 'Sphinx of black quartz, judge my vow.' },
  { label: 'Packaging Pangram', text: 'Pack my box with five dozen liquor jugs.' },
  { label: 'European Accents', text: 'Voix ambiguë d’un cœur qui au zéphyr préfère les jattes de kiwis.' },
  { label: 'Numbers & Symbols', text: '0123456789 • !@#$%^&*()_+-=[]{}|;:\',.<>/?~`"' },
];

const WATERFALL_SIZES = [14, 18, 24, 32, 48, 64];

const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const NUMBERS = '0123456789'.split('');
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:\',.<>/?~`"\\'.split('');

export const FontViewer: React.FC<PreviewExtensionProps> = ({
  fileUrl,
  fileName,
  fileSize,
  extension,
  onDownload,
}) => {
  const fontId = useMemo(
    () => `preview-font-${Math.random().toString(36).substring(2, 9)}`,
    []
  );

  const cleanFontName = useMemo(() => {
    return fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [fileName]);

  const [fontLoaded, setFontLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Studio controls
  const [activeTab, setActiveTab] = useState<'specimen' | 'waterfall' | 'glyphs'>('specimen');
  const [customText, setCustomText] = useState(
    'All their equipment and instruments are alive.'
  );
  const [selectedPangramIdx, setSelectedPangramIdx] = useState(0);
  const [fontSize, setFontSize] = useState(36);
  const [lineHeight, setLineHeight] = useState(1.4);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [copiedChar, setCopiedChar] = useState<string | null>(null);
  const [selectedGlyph, setSelectedGlyph] = useState<string | null>(null);

  // Load font dynamically via FontFace API
  useEffect(() => {
    let active = true;
    setFontLoaded(false);
    setLoadError(null);

    const fontFace = new FontFace(fontId, `url("${fileUrl}")`);

    fontFace
      .load()
      .then((loadedFace) => {
        if (!active) return;
        document.fonts.add(loadedFace);
        setFontLoaded(true);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load dynamic font:', err);
        setLoadError('Failed to parse font file. The font stream may be corrupted or unsupported.');
      });

    return () => {
      active = false;
      try {
        document.fonts.delete(fontFace);
      } catch {
        // ignore cleanup error
      }
    };
  }, [fileUrl, fontId]);

  const handleCopyGlyph = (char: string) => {
    navigator.clipboard.writeText(char);
    setCopiedChar(char);
    setTimeout(() => setCopiedChar(null), 1500);
  };

  const handlePangramChange = (idx: number) => {
    setSelectedPangramIdx(idx);
    setCustomText(PANGRAM_PRESETS[idx].text);
  };

  const bgClasses =
    themeMode === 'light'
      ? 'bg-white text-gray-900 border-gray-200'
      : themeMode === 'dark'
      ? 'bg-[#121316] text-gray-100 border-[#2b2d35]'
      : 'bg-white dark:bg-[#18191e] text-gray-900 dark:text-gray-100 border-gray-200 dark:border-[#2a2c35]';

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden select-none ${bgClasses}`}>
      {/* Top Studio Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-[#2a2c35] bg-gray-50/80 dark:bg-[#1f2128] gap-3 shrink-0">
        {/* Font Information Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base shadow-xs">
            <Type size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-xs">
                {cleanFontName}
              </h3>
              <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold">
                .{extension}
              </span>
              <span className="text-[10px] text-gray-400 font-mono hidden xs:inline">
                {formatHumanSize(fileSize)}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span>Dynamic FontFace</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {fontLoaded ? 'Loaded & Rendered' : 'Loading font stream...'}
              </span>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-gray-200/70 dark:bg-[#282a33] p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('specimen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'specimen'
                ? 'bg-white dark:bg-[#1a1b22] text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <AlignLeft size={13} />
            <span>Specimen</span>
          </button>
          <button
            onClick={() => setActiveTab('waterfall')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'waterfall'
                ? 'bg-white dark:bg-[#1a1b22] text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Sliders size={13} />
            <span>Waterfall</span>
          </button>
          <button
            onClick={() => setActiveTab('glyphs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'glyphs'
                ? 'bg-white dark:bg-[#1a1b22] text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Grid size={13} />
            <span>Glyphs</span>
          </button>
        </div>

        {/* Theme Contrast Toggle & Download */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setThemeMode(themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'auto' : 'light')
            }
            title="Toggle Preview Contrast (Light / Dark / Auto)"
            className="p-2 rounded-xl bg-gray-100 dark:bg-[#282a33] hover:bg-gray-200 dark:hover:bg-[#333540] text-gray-600 dark:text-gray-300 transition-colors text-xs flex items-center gap-1"
          >
            {themeMode === 'light' ? <Sun size={14} /> : <Moon size={14} />}
            <span className="text-[10px] uppercase font-mono">{themeMode}</span>
          </button>

          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Font Tuning Bar (Visible in Specimen & Waterfall) */}
      {activeTab !== 'glyphs' && (
        <div className="px-4 py-2 border-b border-gray-100 dark:border-[#252731] bg-gray-50/50 dark:bg-[#1a1c22] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Preset Pangrams Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Preset:</span>
            {PANGRAM_PRESETS.map((p, idx) => (
              <button
                key={p.label}
                onClick={() => handlePangramChange(idx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  selectedPangramIdx === idx
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#252731]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Size & Spacing Controls */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-mono">Size: {fontSize}px</span>
              <input
                type="range"
                min="12"
                max="96"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-24 h-1.5 accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-mono">Spacing: {letterSpacing}px</span>
              <input
                type="range"
                min="-2"
                max="10"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-20 h-1.5 accent-amber-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                setFontSize(36);
                setLineHeight(1.4);
                setLetterSpacing(0);
              }}
              title="Reset typography settings"
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#333] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {loadError ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-500 flex items-center justify-center mb-3">
              <Info size={24} />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Font Parsing Failed
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">{loadError}</p>
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
              >
                Download File
              </button>
            )}
          </div>
        ) : !fontLoaded ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-mono">Tessellating glyph outlines...</p>
          </div>
        ) : (
          <div>
            {/* 1. Specimen Studio View */}
            {activeTab === 'specimen' && (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Editable Hero Specimen */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                    <span className="uppercase text-[10px] font-bold">Interactive Type Tester:</span>
                    <span className="text-[11px]">Click text below to edit</span>
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setCustomText(e.currentTarget.textContent || '')}
                    style={{
                      fontFamily: fontId,
                      fontSize: `${fontSize}px`,
                      lineHeight: lineHeight,
                      letterSpacing: `${letterSpacing}px`,
                    }}
                    className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#1b1c24] border border-gray-100 dark:border-[#272935] outline-hidden focus:border-amber-500/50 transition-colors cursor-text min-h-[120px]"
                  >
                    {customText}
                  </div>
                </div>

                {/* Character Sets Showcase */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Uppercase */}
                  <div className="p-4 rounded-xl bg-gray-50/40 dark:bg-[#1a1b22] border border-gray-100 dark:border-[#252732] space-y-2">
                    <div className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                      Uppercase Alphabet
                    </div>
                    <div
                      style={{ fontFamily: fontId }}
                      className="text-lg tracking-wider break-words text-gray-800 dark:text-gray-200"
                    >
                      A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
                    </div>
                  </div>

                  {/* Lowercase */}
                  <div className="p-4 rounded-xl bg-gray-50/40 dark:bg-[#1a1b22] border border-gray-100 dark:border-[#252732] space-y-2">
                    <div className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                      Lowercase Alphabet
                    </div>
                    <div
                      style={{ fontFamily: fontId }}
                      className="text-lg tracking-wider break-words text-gray-800 dark:text-gray-200"
                    >
                      a b c d e f g h i j k l m n o p q r s t u v w x y z
                    </div>
                  </div>

                  {/* Numerals */}
                  <div className="p-4 rounded-xl bg-gray-50/40 dark:bg-[#1a1b22] border border-gray-100 dark:border-[#252732] space-y-2">
                    <div className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                      Numerals & Figures
                    </div>
                    <div
                      style={{ fontFamily: fontId }}
                      className="text-lg tracking-widest text-gray-800 dark:text-gray-200"
                    >
                      0 1 2 3 4 5 6 7 8 9
                    </div>
                  </div>

                  {/* Symbols */}
                  <div className="p-4 rounded-xl bg-gray-50/40 dark:bg-[#1a1b22] border border-gray-100 dark:border-[#252732] space-y-2">
                    <div className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
                      Punctuation & Symbols
                    </div>
                    <div
                      style={{ fontFamily: fontId }}
                      className="text-lg tracking-widest break-words text-gray-800 dark:text-gray-200"
                    >
                      ! ? @ # $ % ^ & * ( ) _ + - = [ ] {`{ }`} | ; : , .
                    </div>
                  </div>
                </div>

                {/* Paragraph Typography Rendering */}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#272935]">
                  <div className="text-[10px] uppercase font-bold text-gray-400 font-mono">
                    Body Text Rendering (16px)
                  </div>
                  <p
                    style={{ fontFamily: fontId }}
                    className="text-base leading-relaxed text-gray-700 dark:text-gray-300"
                  >
                    Typography exists to honor content. In a world saturated with information, well-proportioned
                    letterforms, harmonious contrast, and natural rhythmic spacing elevate reading into an
                    effortless experience. This preview validates client-side rendering accuracy across all screen
                    densities directly within KV Files.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Waterfall Scale View */}
            {activeTab === 'waterfall' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {WATERFALL_SIZES.map((size) => (
                  <div
                    key={size}
                    className="pb-4 border-b border-gray-100 dark:border-[#252732] space-y-1"
                  >
                    <div className="text-[10px] font-mono text-gray-400">
                      {size}px
                    </div>
                    <div
                      style={{
                        fontFamily: fontId,
                        fontSize: `${size}px`,
                        lineHeight: 1.2,
                        letterSpacing: `${letterSpacing}px`,
                      }}
                      className="text-gray-900 dark:text-gray-100 break-words"
                    >
                      {customText}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Glyphs Map Inspector */}
            {activeTab === 'glyphs' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Active Selected Glyph Details Card */}
                {selectedGlyph && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/40 dark:border-amber-700/40 flex items-center justify-between gap-4 animate-in fade-in duration-150">
                    <div className="flex items-center gap-4">
                      <div
                        style={{ fontFamily: fontId }}
                        className="w-16 h-16 rounded-xl bg-white dark:bg-[#1e1f26] border border-amber-300 dark:border-amber-700 flex items-center justify-center text-4xl shadow-sm text-gray-900 dark:text-gray-100"
                      >
                        {selectedGlyph}
                      </div>
                      <div className="space-y-0.5 text-xs font-mono">
                        <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                          Glyph: {selectedGlyph}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          Unicode: U+{selectedGlyph.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          HTML Entity: &#38;#{selectedGlyph.charCodeAt(0)};
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyGlyph(selectedGlyph)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      {copiedChar === selectedGlyph ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedChar === selectedGlyph ? 'Copied' : 'Copy Glyph'}</span>
                    </button>
                  </div>
                )}

                {/* Glyph Sets */}
                {[
                  { title: 'Basic Latin Uppercase', chars: UPPERCASE_CHARS },
                  { title: 'Basic Latin Lowercase', chars: LOWERCASE_CHARS },
                  { title: 'Numerals', chars: NUMBERS },
                  { title: 'Punctuation & Mathematical Symbols', chars: SYMBOLS },
                ].map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {group.title}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        {group.chars.length} glyphs
                      </span>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-13 gap-1.5">
                      {group.chars.map((char) => {
                        const isSelected = selectedGlyph === char;
                        return (
                          <button
                            key={char}
                            onClick={() => setSelectedGlyph(char)}
                            style={{ fontFamily: fontId }}
                            className={`aspect-square flex items-center justify-center text-xl rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105'
                                : 'bg-gray-50 dark:bg-[#1e1f26] border-gray-200 dark:border-[#2b2d38] hover:border-amber-400 hover:bg-white dark:hover:bg-[#252733] text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {char}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
