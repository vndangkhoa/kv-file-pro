import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  KeyRound,
  Clock,
} from 'lucide-react';
import { ExtensionManifest, PaymentCreateResponse, PRO_BUNDLE_ID, PRO_BUNDLE_PRICE } from '../../../types';
import { useExtensionStore } from '../../../stores/useExtensionStore';
import { useAuthStore } from '../../../stores/useAuthStore';

interface MoMoPaymentModalProps {
  extension?: ExtensionManifest;
  isProBundle?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MoMoPaymentModal: React.FC<MoMoPaymentModalProps> = ({
  extension,
  isProBundle = true,
  onClose,
  onSuccess,
}) => {
  const { markExtensionPurchased, unlockProLifetime, isProLicensed, proLicenseKey, fetchLicenses } = useExtensionStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const isPro = isProBundle || !extension || extension.id === PRO_BUNDLE_ID;
  const targetId = isPro ? PRO_BUNDLE_ID : extension.id;
  const targetName = isPro ? 'KV Files Pro — Lifetime All-Access Pass' : extension.name;
  const targetVersion = isPro ? 'All Extensions Lifetime' : `Permanent • v${extension.version}`;
  const targetPrice = isPro ? PRO_BUNDLE_PRICE : (extension.price || 0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentCreateResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<'PENDING' | 'AWAITING_VERIFICATION' | 'PAID' | 'FAILED' | 'CANCELLED'>('PENDING');
  const [isPolling, setIsPolling] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAdminApproving, setIsAdminApproving] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [issuedLicenseKey, setIssuedLicenseKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Format currency in VND
  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(targetPrice);

  // 1. Initialize MoMo payment session on mount
  useEffect(() => {
    let isMounted = true;

    const initPayment = async () => {
      // If already active in local store, immediately show success
      if ((isPro && isProLicensed) || (!isPro && extension?.isPurchased)) {
        if (proLicenseKey) {
          setIssuedLicenseKey(proLicenseKey);
        }
        setIsSuccess(true);
        setOrderStatus('PAID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/v1/payments/momo/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ extension_id: targetId }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg: string = errData.error || errData.message || '';

          // If backend indicates already licensed for current user
          if (errMsg.toLowerCase().includes('already licensed') || errMsg.toLowerCase().includes('already own')) {
            if (isPro) {
              unlockProLifetime(proLicenseKey || undefined);
            } else {
              markExtensionPurchased(targetId);
            }
            await fetchLicenses();
            if (proLicenseKey) {
              setIssuedLicenseKey(proLicenseKey);
            }
            setIsSuccess(true);
            setOrderStatus('PAID');
            setIsLoading(false);
            if (onSuccess) onSuccess();
            return;
          }

          if (res.status === 401) {
            throw new Error('Authentication required. Please sign in to purchase extensions or unlock Pro.');
          }

          throw new Error(errMsg || 'Failed to create MoMo payment session');
        }

        const data: PaymentCreateResponse = await res.json();
        if (isMounted) {
          setPaymentData(data);
          setOrderStatus('PENDING');
          setIsPolling(true);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Network error occurred');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initPayment();

    return () => {
      isMounted = false;
    };
  }, [targetId]);

  // 2. Poll order status every 2.5s until paid or closed
  useEffect(() => {
    if (!isPolling || !paymentData?.order_id || isSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/payments/orders/${paymentData.order_id}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const order = await res.json();
          if (order.status === 'PAID') {
            setIsPolling(false);
            setOrderStatus('PAID');
            handlePaymentSuccess(order.license_key);
          } else if (order.status === 'AWAITING_VERIFICATION') {
            setOrderStatus('AWAITING_VERIFICATION');
          } else if (order.status === 'FAILED' || order.status === 'CANCELLED') {
            setOrderStatus(order.status);
            setIsPolling(false);
          }
        }
      } catch {
        // Polling error, retry on next tick
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isPolling, paymentData?.order_id, isSuccess]);

  const handlePaymentSuccess = (licenseKey?: string) => {
    setIsSuccess(true);
    setOrderStatus('PAID');
    if (licenseKey) {
      setIssuedLicenseKey(licenseKey);
    }
    markExtensionPurchased(targetId, licenseKey);
    if (onSuccess) onSuccess();
  };

  const copyToClipboard = (text: string, field: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Admin instant approval
  const handleAdminApprove = async () => {
    if (!paymentData?.order_id || !isAdmin) return;
    try {
      setIsAdminApproving(true);
      const res = await fetch(`/api/v1/payments/admin/orders/${paymentData.order_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: 'Admin verified via checkout modal' }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPolling(false);
        handlePaymentSuccess(data.license_key);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || 'Admin approval failed');
      }
    } catch (e) {
      console.error(e);
      alert('Network error during admin approval');
    } finally {
      setIsAdminApproving(false);
    }
  };

  // Developer simulation helper for testing environments
  const handleSimulatePayment = async () => {
    if (!paymentData?.order_id) return;
    try {
      setIsSimulating(true);
      const res = await fetch(`/api/v1/payments/dev/simulate/${paymentData.order_id}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setIsPolling(false);
        handlePaymentSuccess(data.license_key);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || 'Simulation not permitted in production');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!paymentData?.order_id) return;
    if (!confirm('Are you sure you want to cancel this pending payment order?')) return;
    try {
      await fetch(`/api/v1/payments/orders/${paymentData.order_id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      onClose();
    } catch {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#33333d] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl transition-all">
        {/* Header with MoMo Branding */}
        <div className="bg-gradient-to-r from-[#a50064] via-[#d82d8b] to-[#b0006d] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-md">
              <img
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                alt="MoMo"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-[#a50064] font-black text-xs">MOMO</span>
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">MoMo Quick Checkout</h3>
              <p className="text-white/80 text-xs">Official Payment Gateway & Direct Transfer</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Order Details Summary */}
          <div className="bg-gray-50 dark:bg-[#16161a] p-4 rounded-2xl border border-gray-100 dark:border-[#2a2a32] flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {targetName}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                License: {targetVersion}
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-[#d82d8b] dark:text-[#f06292]">
                {formattedPrice}
              </span>
              <p className="text-[10px] text-gray-400 uppercase">One-Time Lifetime</p>
            </div>
          </div>

          {/* Dynamic Content: Loading / Error / Success / Awaiting / QR Form */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="animate-spin text-[#d82d8b]" size={36} />
              <p className="text-xs font-medium">Initializing Secure Payment Session...</p>
            </div>
          ) : error ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-500">
                <AlertCircle size={24} />
              </div>
              <div>
                <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                  Payment Initialization Error
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-1.5 rounded-xl bg-gray-200 dark:bg-[#2d2d35] text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300"
              >
                Dismiss
              </button>
            </div>
          ) : isSuccess || orderStatus === 'PAID' ? (
            <div className="py-6 flex flex-col items-center justify-center gap-4 text-center animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">
                  Lifetime License Unlocked!
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  {isPro ? (
                    <span>Your lifetime license for <strong>KV Files Pro</strong> has been activated! All present and future extensions are permanently unlocked.</span>
                  ) : (
                    <span>Your license for <span className="font-semibold text-gray-800 dark:text-gray-200">{targetName}</span> has been permanently activated.</span>
                  )}
                </p>
              </div>

              {/* Lifetime Activation Code Card */}
              <div className="w-full bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 text-left space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                  <span className="flex items-center gap-1.5">
                    <KeyRound size={13} />
                    Cryptographically Signed License Key
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full font-mono">
                    Lifetime
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-[#121215] border border-blue-100 dark:border-blue-950/80 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100 select-all tracking-wide truncate max-w-[240px]">
                    {issuedLicenseKey || paymentData?.order_id}
                  </span>
                  <button
                    onClick={() => {
                      const keyToCopy = issuedLicenseKey || paymentData?.order_id || '';
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(keyToCopy);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }
                    }}
                    className="ml-2 px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-1 shrink-0"
                  >
                    {copiedKey ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  💡 <strong>Stored in Database & Synced!</strong> This key is saved in persistent storage. You can also supply <code>KV_LICENSE_KEY={issuedLicenseKey || paymentData?.order_id}</code> in your <code>docker-compose.yml</code> so your Pro pass survives any container rebuilds.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold shadow-md transition-all mt-1"
              >
                Start Using Extension
              </button>
            </div>
          ) : orderStatus === 'AWAITING_VERIFICATION' ? (
            /* Awaiting Verification State */
            <div className="py-6 flex flex-col items-center justify-center gap-4 text-center animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/20">
                <Clock size={30} className="animate-pulse" />
              </div>

              <div>
                <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">
                  Transfer Submitted for Verification
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Your payment proof has been recorded. The host administrator or MoMo automated system is reviewing your transaction.
                </p>
              </div>

              <div className="w-full bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-300 text-[11px]">
                  <span>Order Reference:</span>
                  <span className="font-mono font-bold">{paymentData?.order_id}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  <Loader2 size={13} className="animate-spin shrink-0" />
                  <span>Listening for payment confirmation in background...</span>
                </div>
              </div>

              {/* Admin Quick Action if current user is Host Admin */}
              {isAdmin && (
                <div className="w-full p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-left space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-blue-800 dark:text-blue-300 font-semibold">
                    <span>Host Admin Action:</span>
                    <span className="text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-mono">
                      Admin
                    </span>
                  </div>
                  <button
                    onClick={handleAdminApprove}
                    disabled={isAdminApproving}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    {isAdminApproving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    <span>Confirm & Issue License (Admin)</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  onClick={() => setOrderStatus('PENDING')}
                  className="flex-1 py-2 px-3 bg-gray-100 dark:bg-[#282830] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-medium hover:bg-gray-200"
                >
                  View QR Details
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 bg-gray-200 dark:bg-[#33333d] text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-300"
                >
                  Close (Syncs in Background)
                </button>
              </div>
            </div>
          ) : (
            /* Pending Checkout State (QR & Transfer Form) */
            <>
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#16161a] rounded-2xl border border-dashed border-gray-200 dark:border-[#2f2f38] relative">
                {paymentData?.qr_code_url ? (
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <img
                      src={paymentData.qr_code_url}
                      alt="MoMo Payment QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-2xl text-xs text-gray-400">
                    QR Not Available
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  <Smartphone size={14} className="text-[#d82d8b]" />
                  <span>Scan with MoMo App or Banking App (VietQR)</span>
                </div>
              </div>

              {/* Gateway Order Details Card */}
              <div className="bg-gray-50 dark:bg-[#16161a] p-3.5 rounded-2xl border border-gray-100 dark:border-[#2a2a32] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Order Reference:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-gray-900 dark:text-gray-100">
                    <span className="text-[11px] truncate max-w-[200px]">
                      {paymentData?.order_id}
                    </span>
                    <button
                      onClick={() => paymentData?.order_id && copyToClipboard(paymentData.order_id, 'order_id')}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      title="Copy order ID"
                    >
                      {copiedField === 'order_id' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[#d82d8b] dark:text-[#f06292]">
                    <span>{formattedPrice}</span>
                    <button
                      onClick={() => copyToClipboard(targetPrice.toString(), 'amount')}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      title="Copy amount"
                    >
                      {copiedField === 'amount' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Gateway:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    MoMo All-In-One Gateway
                  </span>
                </div>
              </div>

              {/* Real-time IPN listener status */}
              <div className="flex items-center justify-center gap-2 py-1 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Awaiting payment confirmation via MoMo Gateway...</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {paymentData?.pay_url && (
                  <a
                    href={paymentData.pay_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-[#a50064] to-[#d82d8b] hover:from-[#8a0053] hover:to-[#be2077] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#d82d8b]/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Open MoMo Payment Gateway</span>
                    <ExternalLink size={14} />
                  </a>
                )}

                {/* Prominent Sandbox Simulator for Self-Testing */}
                <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300/70 dark:border-amber-700/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-500 fill-amber-500" />
                      <span>Self-Testing & Sandbox Mode</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      NO REAL MONEY NEEDED
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-snug">
                    Testing on your own machine? Click below to instantly simulate payment confirmation, mint the signed cryptographic license, and unlock features without needing phone transfer.
                  </p>
                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={isSimulating}
                    className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isSimulating ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <Zap size={14} className="fill-white" />
                    )}
                    <span>Simulate Successful Payment (Instant Unlock)</span>
                  </button>
                </div>

                {/* Admin Quick Action */}
                {isAdmin && (
                  <button
                    onClick={handleAdminApprove}
                    disabled={isAdminApproving}
                    className="w-full py-2 px-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    {isAdminApproving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    <span>Admin Instant Approve & Unlock</span>
                  </button>
                )}

                <button
                  onClick={handleCancelOrder}
                  className="w-full py-1 text-gray-400 hover:text-red-500 text-[11px] transition-colors"
                >
                  Cancel Order
                </button>
              </div>

              {/* Security Footnote */}
              <div className="pt-2 border-t border-gray-100 dark:border-[#282830] flex items-center justify-between text-[11px] text-gray-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>MoMo Official Gateway & Direct P2P</span>
                </div>
                <span>KV Files Store</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
