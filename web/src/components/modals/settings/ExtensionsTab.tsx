import React, { useState, useEffect } from 'react';
import {
  Blocks,
  Search,
  Check,
  Download,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Box,
  Layers,
  Palette,
  FileText,
  Cpu,
  Type,
  Star,
  ShieldCheck,
  RefreshCw,
  Workflow,
  KeyRound,
  X,
  Loader2,
  Crown,
  Sparkles,
  Copy,
} from 'lucide-react';
import { useExtensionStore } from '../../../stores/useExtensionStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { ExtensionCategory } from '../../../types';
import { ZaloPayPaymentModal } from './ZaloPayPaymentModal';
import { AdminOrdersModal } from './AdminOrdersModal';

interface RedeemLicenseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const RedeemLicenseModal: React.FC<RedeemLicenseModalProps> = ({ onClose, onSuccess }) => {
  const { activateLicense } = useExtensionStore();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter a valid activation code or ZaloPay transaction ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await activateLicense(trimmed);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Lifetime license activated successfully!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(res.message || 'Failed to activate code. Please check your code and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#33333d] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-gray-100 dark:border-[#2b2b34] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
              <KeyRound size={18} />
            </span>
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Redeem Lifetime License
            </h4>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#282830] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleActivate} className="p-6 space-y-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Enter your <strong>Lifetime License Key</strong> or your <strong>ZaloPay Transaction ID / Order ID</strong> to unlock lifetime access on this machine.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Activation Code / ZaloPay Trans ID
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. KV-CAD-XXXXXXXX, ZP-..., or 240919_..."
              className="w-full px-3.5 py-2.5 rounded-xl font-mono bg-gray-50 dark:bg-[#16161a] border border-gray-200 dark:border-[#33333e] focus:border-blue-500 focus:outline-hidden text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <X size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#282830] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !code.trim() || !!successMsg}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              {isLoading && <Loader2 size={13} className="animate-spin" />}
              <span>{isLoading ? 'Activating...' : 'Activate Lifetime License'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ExtensionsTab: React.FC = () => {
  const {
    extensions,
    isProLicensed,
    proLicenseKey,
    enableAllExtensions,
    disableAllExtensions,
    installExtension,
    uninstallExtension,
    toggleExtension,
    resetToDefaults,
    fetchLicenses,
    fetchSystemEdition,
  } = useExtensionStore();

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExtensionCategory>('all');
  const [filterInstalledOnly, setFilterInstalledOnly] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    fetchLicenses();
    fetchSystemEdition();
  }, [fetchLicenses, fetchSystemEdition]);

  const formatLicenseDisplay = (key: string) => {
    if (!key) return '';
    if (key.startsWith('KVPRO-')) {
      try {
        const parts = key.replace('KVPRO-', '').split('.');
        if (parts.length === 2) {
          const payloadJson = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
          const payload = JSON.parse(payloadJson);
          const owner = payload.customer_email || payload.user || 'Pro';
          return `${payload.id} (${owner})`;
        }
      } catch {}
      return key.slice(0, 16) + '...' + key.slice(-6);
    }
    return key.length > 24 ? key.slice(0, 14) + '...' + key.slice(-6) : key;
  };

  const CATEGORY_LABELS: Record<ExtensionCategory, string> = {
    all: 'All Formats',
    previewer: 'Previewers',
    editor: 'Editors',
    utility: 'Utilities',
  };

  const getExtensionIcon = (icon: string) => {
    switch (icon) {
      case 'box':
        return <Box size={22} className="text-sky-500" />;
      case 'palette':
        return <Palette size={22} className="text-purple-500" />;
      case 'layers':
        return <Layers size={22} className="text-amber-500" />;
      case 'file-text':
        return <FileText size={22} className="text-emerald-500" />;
      case 'cpu':
        return <Cpu size={22} className="text-rose-500" />;
      case 'type':
        return <Type size={22} className="text-amber-500" />;
      case 'workflow':
        return <Workflow size={22} className="text-indigo-500" />;
      default:
        return <Blocks size={22} className="text-blue-500" />;
    }
  };

  const filteredExtensions = extensions.filter((ext) => {
    const matchesSearch =
      ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.supportedExtensions.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
    const matchesInstalled = !filterInstalledOnly || ext.installed;

    return matchesSearch && matchesCategory && matchesInstalled;
  });

  const installedCount = extensions.filter((e) => e.installed).length;

  return (
    <div className="space-y-3.5 max-w-6xl mx-auto text-xs w-full">
      {/* Unified Executive Header */}
      {isProLicensed ? (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 p-3 sm:px-4 sm:py-3 rounded-2xl border border-emerald-300/70 dark:border-emerald-700/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Crown size={18} className="text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-1.5">
                  <span>KV Files PRO</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">• Lifetime Active</span>
                </h3>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] font-bold">
                  ALL-ACCESS
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono text-[9px] font-semibold">
                  {installedCount}/{extensions.length} Active
                </span>
              </div>

              {/* License Metadata */}
              {proLicenseKey && (
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                  <span>Key: {formatLicenseDisplay(proLicenseKey)}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(proLicenseKey);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    title="Copy license key"
                    className="p-0.5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    {copiedKey ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap self-start sm:self-center">
            {installedCount < extensions.length ? (
              <button
                onClick={enableAllExtensions}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Sparkles size={12} className="text-amber-200" />
                <span>Enable All</span>
              </button>
            ) : (
              <button
                onClick={disableAllExtensions}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#282830] text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all active:scale-95"
              >
                <span>Disable All</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 hover:border-purple-400 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-all"
              >
                <ShieldCheck size={12} className="text-purple-600 dark:text-purple-400" />
                <span>Orders</span>
              </button>
            )}

            <button
              onClick={() => setShowRedeemModal(true)}
              title="Redeem another license key"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1a1a22] border border-blue-200 dark:border-blue-900/70 hover:border-blue-400 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-all"
            >
              <KeyRound size={12} />
              <span>Redeem</span>
            </button>

            <button
              onClick={resetToDefaults}
              title="Reset catalog to defaults"
              className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-500/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-[#0068ff] text-white flex items-center justify-center shadow-xs shrink-0">
              <Crown size={16} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 tracking-tight">
                  KV Files Pro — Lifetime All-Access Pass
                </h4>
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold shadow-xs">
                  199.000 ₫
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight line-clamp-1 max-w-lg mt-0.5">
                Permanently unlock all present & future studio viewers (CAD, 3D, PSD, SysVis, Archive).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:border-purple-400 transition-all flex items-center gap-1"
              >
                <ShieldCheck size={12} className="text-purple-600 dark:text-purple-400" />
                <span>Orders</span>
              </button>
            )}
            <button
              onClick={() => setShowProModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Sparkles size={12} className="text-amber-200" />
              <span>Unlock Pro • 199.000 ₫</span>
            </button>
            <button
              onClick={() => setShowRedeemModal(true)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#1a1a22] border border-blue-200 dark:border-blue-900/70 hover:border-blue-400 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
            >
              <KeyRound size={12} />
              <span>Enter Key</span>
            </button>
            <button
              onClick={resetToDefaults}
              title="Reset catalog"
              className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#333] text-gray-500 transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions or file formats (.dxf, .psd, .step)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333333] focus:border-blue-500 focus:outline-hidden text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400"
          />
        </div>

        {/* Categories & Filter Toggle */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
          {(['all', 'previewer', 'utility'] as ExtensionCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}

          <button
            onClick={() => setFilterInstalledOnly(!filterInstalledOnly)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
              filterInstalledOnly
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]'
            }`}
          >
            <Check size={11} className={filterInstalledOnly ? 'opacity-100' : 'opacity-0'} />
            <span>Installed</span>
          </button>
        </div>
      </div>

      {/* Extension Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredExtensions.length === 0 ? (
          <div className="md:col-span-2 py-8 text-center text-gray-400 space-y-1.5 bg-gray-50/50 dark:bg-[#1e1e1e]/40 rounded-xl border border-dashed border-gray-200 dark:border-[#333333]">
            <Blocks size={26} className="mx-auto opacity-40 text-gray-400" />
            <p className="font-medium text-xs">No extensions match your search query</p>
            <p className="text-[11px] text-gray-500">Try searching for .dxf, .psd, .stl, or clear filters.</p>
          </div>
        ) : (
          filteredExtensions.map((ext) => {
            const isInstalled = !!ext.installed;
            const isEnabled = !!ext.enabled;
            const isPaid = !!ext.isPaid;
            const isPurchased = !isPaid || !!ext.isPurchased;

            return (
              <div
                key={ext.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isInstalled && isEnabled
                    ? 'border-blue-300 dark:border-blue-900/60 bg-white dark:bg-[#20222a] shadow-2xs'
                    : 'border-gray-200 dark:border-[#2d2e36] bg-white/70 dark:bg-[#1c1d22]'
                }`}
              >
                <div>
                  {/* Top row: Icon, title, badges, actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#2a2d36] flex items-center justify-center shrink-0 mt-0.5">
                        {getExtensionIcon(ext.icon)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                            {ext.name}
                          </h4>
                          <span className="font-mono text-[9px] text-gray-400">
                            v{ext.version}
                          </span>
                          {ext.badge && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-semibold text-[9px]">
                              {ext.badge}
                            </span>
                          )}
                          {isPaid ? (
                            isPurchased ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 font-semibold text-[9px]">
                                Licensed
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold text-[9px] border border-amber-200 dark:border-amber-900/50 flex items-center gap-0.5">
                                <Crown size={9} />
                                <span>PRO</span>
                              </span>
                            )
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 text-[9px]">
                              Free
                            </span>
                          )}
                        </div>

                        <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-1 line-clamp-2 leading-snug">
                          {ext.description}
                        </p>
                      </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isPaid && !isPurchased ? null : isInstalled ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleExtension(ext.id)}
                            title={isEnabled ? 'Disable Extension' : 'Enable Extension'}
                            className={`p-1 px-2 rounded-lg font-medium text-[11px] flex items-center gap-1 transition-colors ${
                              isEnabled
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-[#282830] text-gray-500'
                            }`}
                          >
                            {isEnabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                            <span>{isEnabled ? 'On' : 'Off'}</span>
                          </button>
                          <button
                            onClick={() => uninstallExtension(ext.id)}
                            title="Uninstall"
                            className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => installExtension(ext.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                        >
                          <Download size={11} />
                          <span>Install</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact Bottom row: Formats & Telemetry in single clean row */}
                <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-[#282b33] flex items-center justify-between text-[10px] text-gray-400">
                  <div className="flex items-center gap-1 overflow-hidden">
                    <span className="text-gray-400 uppercase font-semibold text-[9px]">Formats:</span>
                    {ext.supportedExtensions.slice(0, 3).map((fe) => (
                      <span
                        key={fe}
                        className="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-[#272932] text-gray-600 dark:text-gray-300 font-mono text-[9px] font-medium"
                      >
                        .{fe}
                      </span>
                    ))}
                    {ext.supportedExtensions.length > 3 && (
                      <span
                        title={ext.supportedExtensions.slice(3).map((e) => `.${e}`).join(', ')}
                        className="text-gray-400 font-mono text-[9px]"
                      >
                        +{ext.supportedExtensions.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 font-mono text-[10px]">
                    <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                      <Star size={10} className="fill-amber-400" />
                      <span>{ext.rating || 4.9}</span>
                    </span>
                    {ext.downloads && <span>{ext.downloads}</span>}
                    <span>{ext.size}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Developer note */}
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1e] border border-gray-200 dark:border-[#2d2d33] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            <strong>Client-Side Sandboxed Architecture:</strong> All preview extensions execute locally via HTML5 WebGL and Web Workers. No server uploads or external data egress.
          </p>
        </div>
      </div>

      {/* ZaloPay Payment Checkout Modal (Pro All-Access Lifetime Pass) */}
      {showProModal && (
        <ZaloPayPaymentModal
          isProBundle={true}
          onClose={() => setShowProModal(false)}
          onSuccess={() => fetchLicenses()}
        />
      )}

      {/* Redeem Lifetime License Modal */}
      {showRedeemModal && (
        <RedeemLicenseModal
          onClose={() => setShowRedeemModal(false)}
          onSuccess={() => fetchLicenses()}
        />
      )}

      {/* Admin Orders Review Modal */}
      {showAdminModal && (
        <AdminOrdersModal onClose={() => setShowAdminModal(false)} />
      )}
    </div>
  );
};
