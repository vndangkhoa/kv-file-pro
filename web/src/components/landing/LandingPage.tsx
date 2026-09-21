import React, { useState } from 'react';
import { 
  Zap, 
  Folder, 
  HardDrive, 
  ShieldCheck, 
  FileArchive, 
  Play, 
  ChevronRight, 
  ArrowRight, 
  Terminal, 
  Copy, 
  Check, 
  Moon, 
  Sun, 
  Layers, 
  Code2, 
  Cpu, 
  BookOpen, 
  Eye, 
  Download, 
  FileText,
  Box,
  Palette,
  Type,
  Workflow,
  KeyRound,
  Crown,
  Sparkles,
  Server
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [copiedDocker, setCopiedDocker] = useState(false);
  const [copiedCargo, setCopiedCargo] = useState(false);
  const [copiedKeygen, setCopiedKeygen] = useState(false);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  const copyCommand = (cmd: string, type: 'docker' | 'cargo' | 'keygen') => {
    navigator.clipboard.writeText(cmd);
    if (type === 'docker') {
      setCopiedDocker(true);
      setTimeout(() => setCopiedDocker(false), 2000);
    } else if (type === 'cargo') {
      setCopiedCargo(true);
      setTimeout(() => setCopiedCargo(false), 2000);
    } else {
      setCopiedKeygen(true);
      setTimeout(() => setCopiedKeygen(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fbfbfd] dark:bg-[#0d0e12] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR                                                     */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full bg-[#fbfbfd]/80 dark:bg-[#0d0e12]/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-md shadow-blue-500/25">
              ⯃
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight">KV FILE PRO</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs uppercase tracking-wider">
                PRO v2.1
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#pro-studios" className="hover:text-blue-600 transition-colors flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
              <Crown className="w-3.5 h-3.5" />
              <span>PRO Studios</span>
            </a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#miller-columns" className="hover:text-blue-600 transition-colors">Miller Columns</a>
            <a href="docs/" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Documentation</span>
            </a>
            <a href="#deploy" className="hover:text-blue-600 transition-colors">Deploy</a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <a
              href="docs/"
              className="hidden sm:inline-flex items-center gap-1 text-xs sm:text-sm font-semibold px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
            >
              Docs
            </a>

            <a
              href="#deploy"
              className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get KV FILE PRO</span>
            </a>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION: PRIORITIZE-INSPIRED BLUEPRINT CANVAS                     */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-12 sm:pt-20 pb-16 lg:pb-32 px-4 sm:px-8 overflow-hidden">
        {/* Geometric Dot-Grid Pattern */}
        <div className="absolute inset-0 dot-grid-pattern pointer-events-none opacity-50 dark:opacity-25" />

        {/* Soft Radial Ambient Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_65%)]" />

        <div className="max-w-7xl mx-auto relative">
          
          {/* --------------------------------------------------------------------- */}
          {/* DESKTOP-ONLY FLOATING ARTIFACTS (Absolute Orbit Layout)               */}
          {/* --------------------------------------------------------------------- */}
          
          {/* Top-Left: Sticky Note + Frosted Glass Speed Badge */}
          <div 
            className="hidden lg:block absolute -top-4 left-2 xl:left-8 z-10 animate-float-1 pointer-events-auto"
            style={{ '--tw-rotate': '-4deg' } as React.CSSProperties}
          >
            <div className="relative w-68 p-5 bg-[#fff9c2] dark:bg-[#fef08a] rounded-sm shadow-xl shadow-amber-950/10 border-t-4 border-amber-200/90">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full shadow-md border-2 border-white ring-1 ring-red-400" />
              <p className="font-serif italic text-amber-950 text-xs sm:text-sm leading-relaxed pt-1">
                "Zero cloud telemetry. Pure native Rust speed, 3D CAD/BIM viewports, and Ed25519 offline asymmetric licensing."
              </p>
            </div>
            <div className="absolute -bottom-4 -right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-lg flex items-center gap-2 rotate-[4deg]">
              <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                <Zap className="w-3 h-3 fill-current" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">0.4ms Latency • Offline First</span>
            </div>
          </div>

          {/* Top-Right: 3D CAD & BIM Viewport Orbit Card */}
          <div 
            className="hidden lg:block absolute -top-6 right-2 xl:right-8 z-10 animate-float-2 pointer-events-auto"
            style={{ '--tw-rotate': '3deg' } as React.CSSProperties}
          >
            <div className="w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl shadow-slate-300/40 dark:shadow-black/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">3D CAD & BIM Studio</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold uppercase">
                    PRO
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-mono">60 FPS</span>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">engine_block.step</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">14.2 MB</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-amber-900 dark:text-amber-200 truncate max-w-[130px]">
                      branding_deck.psd
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0">
                    12 Layers
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Zero Cloud Upload</span>
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">WebGL Canvas</span>
              </div>
            </div>
          </div>

          {/* Bottom-Left: Mounted Storage Pools + Inotify Badge */}
          <div 
            className="hidden lg:block absolute bottom-0 left-2 xl:left-8 z-10 animate-float-3 pointer-events-auto"
            style={{ '--tw-rotate': '-3deg' } as React.CSSProperties}
          >
            <div className="w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl shadow-slate-300/40 dark:shadow-black/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Storage Pools</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Inotify Active
                </div>
              </div>
              <div className="mt-3.5 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <HardDrive className="w-3.5 h-3.5 text-blue-500" /> /mnt/nvme-pool
                    </span>
                    <span className="text-slate-500 text-[11px]">64% used</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full w-[64%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <HardDrive className="w-3.5 h-3.5 text-amber-500" /> /mnt/synology-nas
                    </span>
                    <span className="text-slate-500 text-[11px]">38% used</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-[38%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom-Right: Instant PRO Utilities */}
          <div 
            className="hidden lg:block absolute bottom-0 right-2 xl:right-8 z-10 animate-float-4 pointer-events-auto"
            style={{ '--tw-rotate': '4deg' } as React.CSSProperties}
          >
            <div className="w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl shadow-slate-300/40 dark:shadow-black/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block pb-3 border-b border-slate-100 dark:border-slate-800">
                PRO Studio Engines
              </span>
              <div className="grid grid-cols-3 gap-2.5 mt-3.5">
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:scale-105 transition-transform">
                  <Box className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">CAD / BIM</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:scale-105 transition-transform">
                  <Palette className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Adobe Suite</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:scale-105 transition-transform">
                  <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Ed25519 Key</span>
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* CENTER HERO COPY & ACTIONS (Universal: Mobile & Desktop)              */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative z-20 max-w-2xl mx-auto text-center flex flex-col items-center pt-4 sm:pt-8 pb-10">
            {/* Glassmorphic Logo Card with PRO Badge */}
            <div className="relative mb-6 sm:mb-8 hover:scale-105 transition-transform cursor-pointer">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xl shadow-blue-500/20 flex items-center justify-center">
                <div className="w-11 h-11 sm:w-13 sm:h-13 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-inner">
                  ⯃
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md">
                PRO
              </div>
            </div>

            {/* High-Impact 2-Tone Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]">
              Military-Grade File Management
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent font-extrabold mt-2">
                & Studio Workspace
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
              Ultra-fast self-hosted file manager uniting <strong>macOS Miller Columns</strong> and <strong>Windows Explorer</strong> with native <strong>3D CAD/BIM viewports</strong>, <strong>Adobe Creative Suite studios</strong>, and zero-telemetry <strong>Ed25519 licensing</strong>.
            </p>

            {/* CTA Group */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <a
                href="#deploy"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm sm:text-base font-semibold rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <span>Deploy in 60 seconds</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="#pro-studios"
                className="w-full sm:w-auto px-6 py-4 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-sm sm:text-base font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Explore PRO Studios</span>
              </a>

              <a
                href="docs/"
                className="w-full sm:w-auto px-6 py-4 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white text-sm sm:text-base font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Documentation</span>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 100% Private (No Phone-Home)
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-500" /> Pure Rust Axum
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-amber-500" /> 3D CAD/BIM WebGL
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> Ed25519 Offline DRM
              </span>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* MOBILE/TABLET-ONLY BENTO STACK (< 1024px)                             */}
          {/* --------------------------------------------------------------------- */}
          <div className="block lg:hidden mt-8 w-full max-w-lg mx-auto space-y-4">
            
            {/* Mobile Card 1: CAD & BIM Studio */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">3D CAD & BIM Studio</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold uppercase">
                    PRO
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono">60 FPS WebGL</div>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="font-medium text-slate-700 dark:text-slate-300">AutoCAD .DWG & STEP 3D</span>
                  <span className="text-slate-400">Native</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40">
                  <span className="font-semibold text-amber-900 dark:text-amber-200">Adobe PSD / AI Artboards</span>
                  <span className="text-[10px] text-amber-600 font-bold">In-Browser</span>
                </div>
              </div>
            </div>

            {/* Mobile Card 2: Miller Columns Drilldown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Miller Columns</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-semibold">
                    Finder UI
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-blue-500 fill-blue-100 dark:fill-blue-950" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Engineering_CAD</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/40">
                  <div className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-current" />
                    <span className="font-semibold text-blue-900 dark:text-blue-200">robot_arm.step</span>
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">18 MB</span>
                </div>
              </div>
            </div>

            {/* Mobile Card 3: Storage Gauges */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Storage Pools</span>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Inotify Active
                </div>
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">/mnt/nvme-pool</span>
                    <span className="text-slate-500">64%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full w-[64%]" />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PRO STUDIO SUITE & CAPABILITIES (FLAGSHIP BENTO GRID)                   */}
      {/* ========================================================================= */}
      <section id="pro-studios" className="w-full py-24 px-4 sm:px-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/60 dark:to-[#0d0e12]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>Commercial & Enterprise Tier</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              KV FILE PRO Studio Suite
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Eliminate expensive desktop subscriptions and sluggish cloud portals. KV FILE PRO equips your browser with GPU-accelerated 3D viewports, Adobe creative parsing, typography specimens, and offline cryptography.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Pro Feature 1: Universal CAD & BIM Viewport */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#15161c] border border-slate-200/80 dark:border-slate-800 shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5 border border-amber-100 dark:border-amber-900/50">
                  <Box className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    CAD, BIM & 3D Studio
                  </h3>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white">PRO</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Native 3D WebGL viewport for AutoCAD (<code>.dwg</code>, <code>.dxf</code>), BIM (<code>.ifc</code>), Parametric Solids (<code>.step</code>, <code>.iges</code>), and Meshes (<code>.stl</code>, <code>.obj</code>, <code>.gltf</code>). Includes 3-Axis Sectioning, ViewCube, and Exploded Assemblies.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1.5">
                {['DWG', 'DXF', 'IFC', 'STEP', 'STL', 'OBJ'].map((fmt) => (
                  <span key={fmt} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    .{fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* Pro Feature 2: Adobe Creative Suite Studio */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#15161c] border border-slate-200/80 dark:border-slate-800 shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-5 border border-blue-100 dark:border-blue-900/50">
                  <Palette className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Adobe Creative Suite Studio
                  </h3>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-600 text-white">PRO</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  In-browser layer hierarchy and vector artboard streaming for Photoshop (<code>.psd</code>, <code>.psb</code>), Illustrator (<code>.ai</code>), InDesign (<code>.indd</code>, <code>.idml</code>), PostScript (<code>.eps</code>), and Adobe XD. Zero Adobe Cloud dependencies.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1.5">
                {['PSD', 'PSB', 'AI', 'EPS', 'INDD', 'XD'].map((fmt) => (
                  <span key={fmt} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    .{fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* Pro Feature 3: Asymmetric Ed25519 Cryptographic Licensing */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#15161c] border border-slate-200/80 dark:border-slate-800 shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 border border-emerald-100 dark:border-emerald-900/50">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Ed25519 Offline Licensing
                  </h3>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white">DRM-FREE</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cryptographically signed licenses (<code>KVPRO-...</code>) verified 100% offline using embedded master public keys. Zero phone-home requests, zero network calls, total sovereignty for air-gapped deployments.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">0ms Offline Verify</span>
                <span className="text-[11px]">Air-Gapped Ready</span>
              </div>
            </div>

            {/* Pro Feature 4: Typography & Font Specimen Studio */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#15161c] border border-slate-200/80 dark:border-slate-800 shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 border border-indigo-100 dark:border-indigo-900/50">
                  <Type className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Typography Specimen Studio
                  </h3>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white">PRO</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Dynamic waterfall scale tester (14px to 64px), pangrams, custom live text inputs, and complete Unicode glyph map inspections for TTF, OTF, WOFF, and WOFF2 typography.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1.5">
                {['TTF', 'OTF', 'WOFF', 'WOFF2'].map((fmt) => (
                  <span key={fmt} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    .{fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* Pro Feature 5: SysVis Architecture Flow Animator */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#15161c] border border-slate-200/80 dark:border-slate-800 shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-5 border border-purple-100 dark:border-purple-900/50">
                  <Workflow className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    SysVis Flow Animator
                  </h3>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-600 text-white">PRO</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Interactive systems architecture with live SVG edge flow pulses (<code>animateMotion</code>), Dagre orthogonal auto-layout, and an embedded compiler for Mermaid diagrams.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1.5">
                {['MMD', 'MERMAID', 'FLOW', 'ARCH'].map((fmt) => (
                  <span key={fmt} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    .{fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* Pro Feature 6: ZaloPay & MoMo Instant Gateway */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#15161c] border border-slate-200/80 dark:border-slate-800 shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-5 border border-cyan-100 dark:border-cyan-900/50">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Instant QR Payment Checkout
                  </h3>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-cyan-600 text-white">PRO</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Embedded production gateway supporting ZaloPay v2 and MoMo QR codes. Scan with banking or e-wallet apps for immediate verification and lifetime license unlocking.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">Scan & Activate</span>
                <span className="text-[11px]">Lifetime Ownership</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CORE ARCHITECTURE & SPEED SECTION                                      */}
      {/* ========================================================================= */}
      <section id="features" className="w-full py-20 px-4 sm:px-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Engineered for Speed
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-slate-900 dark:text-white">
              Why Engineers & Creators Switch to KV FILE PRO
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Say goodbye to sluggish web portals and heavy Electron clients. KV FILE PRO gives you bare-metal speed with modern desktop elegance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/40 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-5">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                macOS Miller Columns View
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Drill through complex nested folders with effortless horizontal column navigation, instant video/audio QuickLook previews, and seamless keyboard navigation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/40 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Inotify Kernel Watcher
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                No need to hit refresh. Changes on the disk from CLI tools, rsync, or background jobs broadcast to all connected browser tabs via WebSockets instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/40 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Multi-Root Sandbox Security
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Mount any number of storage roots (<code>/mnt/nas</code>, <code>/data/media</code>). Protected by path canonicalization to eliminate directory traversal risks completely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. MILLER COLUMNS DEDICATED SHOWCASE SECTION                              */}
      {/* ========================================================================= */}
      <section id="miller-columns" className="w-full py-24 px-4 sm:px-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-[#f8f9fc] dark:bg-[#111217]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900">
              macOS Finder Experience
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-3 text-slate-900 dark:text-white">
              Miller Columns View
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Drill down through endless directories without losing parent context. Experience the precision of macOS Finder with live horizontal cascading columns, full keyboard navigation, and instant file inspection.
            </p>
          </div>

          {/* Interactive Visual Miller Columns Display Mockup */}
          <div className="w-full rounded-3xl bg-white dark:bg-[#18191e] border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Window title bar */}
            <div className="h-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              </div>
              <div className="text-xs font-semibold text-slate-500 font-mono flex items-center gap-1.5">
                <span>/Storage_Pools/Engineering/CAD_Assemblies/engine_block.step</span>
              </div>
              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                Miller Columns Mode (Ctrl+1)
              </div>
            </div>

            {/* 3 Columns + 1 Inspector Viewport */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 text-xs min-h-[380px]">
              
              {/* Column 1: Root Directories */}
              <div className="p-3 space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Root Pools</div>
                <div className="flex items-center justify-between p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-2"><Folder className="w-4 h-4 text-blue-500 fill-blue-100" /> Documents</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-600 text-white font-semibold shadow-sm">
                  <span className="flex items-center gap-2"><Folder className="w-4 h-4 fill-white text-white" /> Engineering</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-2"><Folder className="w-4 h-4 text-blue-500 fill-blue-100" /> Creative_Media</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-2"><Folder className="w-4 h-4 text-blue-500 fill-blue-100" /> Backups_Archive</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Column 2: Engineering subfolders */}
              <div className="p-3 space-y-1 bg-slate-50/30 dark:bg-slate-900/20">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Engineering (4)</div>
                <div className="flex items-center justify-between p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-2"><Folder className="w-4 h-4 text-blue-500 fill-blue-100" /> Rust_Axum_Core</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-600 text-white font-semibold shadow-sm">
                  <span className="flex items-center gap-2"><Folder className="w-4 h-4 fill-white text-white" /> CAD_Assemblies</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-2"><Folder className="w-4 h-4 text-blue-500 fill-blue-100" /> BIM_Architectural</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-2"><Folder className="w-4 h-4 text-blue-500 fill-blue-100" /> WebAssembly_WASM</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Column 3: CAD_Assemblies files */}
              <div className="p-3 space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">CAD_Assemblies (3)</div>
                <div className="flex items-center justify-between p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-2 truncate"><FileText className="w-4 h-4 text-slate-400" /> blueprint_spec.dwg</span>
                  <span className="text-[10px] text-slate-400">8.4 MB</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-600 text-white font-semibold shadow-sm">
                  <span className="flex items-center gap-2 truncate"><Box className="w-4 h-4 text-white" /> engine_block.step</span>
                  <span className="text-[10px] text-white/90">14.2 MB</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-2 truncate"><FileArchive className="w-4 h-4 text-amber-500" /> structural_bim.ifc</span>
                  <span className="text-[10px] text-slate-400">22.8 MB</span>
                </div>
              </div>

              {/* Column 4: Quick Look Inspector Panel */}
              <div className="p-5 flex flex-col items-center text-center justify-between bg-white dark:bg-[#18191e]">
                <div className="w-full">
                  <div className="w-full aspect-video rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center text-white relative shadow-inner mb-4 overflow-hidden group border border-slate-800">
                    <Box className="w-10 h-10 text-amber-400 animate-pulse" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-3 py-1 bg-amber-500/90 text-white rounded-full text-[11px] font-bold">3D Orbit Studio (Space)</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    engine_block.step
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Parametric Solid Model • 14.2 MB</p>

                  <div className="mt-4 text-left text-[11px] space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between"><span className="text-slate-400">Renderer:</span> <span className="font-mono font-medium text-amber-500">3D WebGL (PRO)</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Faces / Vertices:</span> <span className="font-mono font-medium">84,210 / 42,105</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Sectioning:</span> <span className="font-mono font-medium">3-Axis Active</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">License:</span> <span className="font-mono font-bold text-emerald-500">Offline Valid</span></div>
                  </div>
                </div>

                <div className="w-full pt-4 flex gap-2">
                  <a
                    href="docs/features/pro-extensions-and-licensing/"
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open 3D Studio</span>
                  </a>
                  <a 
                    href="docs/"
                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    title="Docs"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Feature Highlights beneath columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Zero Breadcrumb Blindness
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Never wonder where you are in a deeply nested file tree. Parent folders stay fixed side-by-side as you navigate downwards.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Lightning Fast Keyboard Nav
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Use your keyboard arrow keys (←, →, ↑, ↓) to glide between hierarchy levels without touching your mouse.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Integrated Pro QuickLook
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Hit Spacebar to instantly orbit 3D CAD parts, view Adobe PSD layers, preview 4K videos, test fonts, or inspect source code.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ONE-COMMAND DEPLOY TERMINAL SECTION                                     */}
      {/* ========================================================================= */}
      <section id="deploy" className="w-full py-20 px-4 sm:px-8 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Self-Host Anywhere
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-slate-900 dark:text-white">
            Deploy KV FILE PRO in 60 Seconds
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Available as a single static Linux/macOS binary, Synology DSM 7.x SPK package, or lightweight multi-arch Docker container.
          </p>

          <div className="mt-10 space-y-4 text-left">
            {/* Docker Command Card */}
            <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" /> Docker Run (Official Image)
                </span>
                <button
                  onClick={() => copyCommand('docker run -d -p 8866:8866 -v /data:/data ghcr.io/vndangkhoa/kv-file-pro:latest', 'docker')}
                  className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedDocker ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDocker ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="text-xs sm:text-sm font-mono text-emerald-400 break-all select-all">
                docker run -d -p 8866:8866 -v /data:/data ghcr.io/vndangkhoa/kv-file-pro:latest
              </code>
            </div>

            {/* Quickstart Launch Script */}
            <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" /> Build & Run from Source (Fastest)
                </span>
                <button
                  onClick={() => copyCommand('./launch.sh run', 'cargo')}
                  className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedCargo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCargo ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="text-xs sm:text-sm font-mono text-amber-400 break-all select-all">
                git clone https://github.com/vndangkhoa/kv-file-pro.git && cd kv-file-pro && ./launch.sh run
              </code>
            </div>

            {/* Offline License Verification Command */}
            <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" /> Verify Offline Ed25519 License
                </span>
                <button
                  onClick={() => copyCommand('./launch.sh keygen verify "KVPRO-..."', 'keygen')}
                  className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedKeygen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKeygen ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="text-xs sm:text-sm font-mono text-purple-400 break-all select-all">
                ./launch.sh keygen verify "KVPRO-..."
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="w-full py-12 px-4 sm:px-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50 dark:bg-[#0a0b0e] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs">
              ⯃
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">KV FILE PRO</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-white uppercase tracking-wider">
                v2.1.0
              </span>
            </div>
          </div>
          <p>
            Built with pure Rust & React by <a href="https://github.com/vndangkhoa" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Khoa Vo (@vndangkhoa)</a>
          </p>
          <div className="flex items-center gap-4">
            <a href="#pro-studios" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">PRO Studios</a>
            <a href="#deploy" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Deploy</a>
            <a href="#features" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Features</a>
            <a href="docs/" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <a href="https://github.com/vndangkhoa/kv-file-pro" target="_blank" rel="noreferrer" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-semibold">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
};
