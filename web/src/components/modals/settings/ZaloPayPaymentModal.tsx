import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  ShieldCheck,
  Copy,
  Check,
  KeyRound,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ExtensionManifest, PaymentCreateResponse, PRO_BUNDLE_ID, PRO_BUNDLE_PRICE } from '../../../types';
import { useExtensionStore } from '../../../stores/useExtensionStore';
import { useAuthStore } from '../../../stores/useAuthStore';

interface ZaloPayPaymentModalProps {
  extension?: ExtensionManifest;
  isProBundle?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ZaloPayPaymentModal: React.FC<ZaloPayPaymentModalProps> = ({
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
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [issuedLicenseKey, setIssuedLicenseKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Format currency in VND
  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(targetPrice);

  // 1. Initialize ZaloPay payment session
  const initPayment = useCallback(async (forceTest = false) => {
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

      const res = await fetch('/api/v1/payments/zalopay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          extension_id: targetId,
          test_mode: forceTest ? true : undefined,
        }),
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

        throw new Error(errMsg || 'Failed to create ZaloPay payment session');
      }

      const data: PaymentCreateResponse = await res.json();
      setPaymentData(data);
      setOrderStatus('PENDING');
      setIsPolling(true);
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [extension?.isPurchased, fetchLicenses, isPro, isProLicensed, markExtensionPurchased, onSuccess, proLicenseKey, targetId, unlockProLifetime]);

  useEffect(() => {
    initPayment(false);
  }, [initPayment]);

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


  // Confirm transfer submitted
  const handleConfirmTransfer = async () => {
    if (!paymentData?.order_id) return;
    try {
      setIsSubmittingTransfer(true);
      const res = await fetch(`/api/v1/payments/orders/${paymentData.order_id}/submit-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          note: 'User confirmed payment via ZaloPay / VietQR',
          trans_id: paymentData.app_trans_id,
        }),
      });
      if (res.ok) {
        setOrderStatus('AWAITING_VERIFICATION');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || 'Failed to submit transfer confirmation');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Network error');
    } finally {
      setIsSubmittingTransfer(false);
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
        {/* Header with ZaloPay Branding */}
        <div className="bg-gradient-to-r from-[#0068ff] via-[#0084f4] to-[#0052cc] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-md">
              <svg viewBox="0 0 100 100" className="w-full h-full fill-[#0068ff]">
                <rect width="100" height="100" rx="20" fill="white" />
                <path
                  d="M26 30h48c2.2 0 4 1.8 4 4v3.5c0 1.2-.5 2.3-1.4 3.1L48.2 65H74c2.2 0 4 1.8 4 4v2c0 2.2-1.8 4-4 4H26c-2.2 0-4-1.8-4-4v-3.5c0-1.2.5-2.3 1.4-3.1L51.8 39H26c-2.2 0-4-1.8-4-4v-2c0-2.2 1.8-4 4-4z"
                  fill="#0068ff"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-1.5">
                <span>Thanh toán ZaloPay / VietQR</span>
              </h3>
              <p className="text-white/80 text-xs">Quét mã QR để nâng cấp bản quyền</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Order Details Summary */}
          <div className="bg-gray-50 dark:bg-[#16161a] p-3.5 rounded-2xl border border-gray-100 dark:border-[#2a2a32] flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {targetName}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isPro ? 'Bản quyền vĩnh viễn (Trọn đời)' : targetVersion}
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-[#0068ff] dark:text-[#38bdf8]">
                {formattedPrice}
              </span>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Trọn gói 1 lần</p>
            </div>
          </div>

          {/* Dynamic Content: Loading / Error / Success / Awaiting / QR Form */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="animate-spin text-[#0068ff]" size={36} />
              <p className="text-xs font-medium">Initializing Secure ZaloPay Session...</p>
            </div>
          ) : error ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-500">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                  Payment Initialization Error
                </h5>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium max-w-sm mx-auto">
                  {error}
                </p>
              </div>

              <div className="w-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-3.5 text-left text-xs space-y-3">
                <div className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-200">
                  <span>💡 ZaloPay Developer Guide:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300">
                  ZaloPay sandbox credentials (AppID <code>2554</code>) are configured by default. You can test immediately using sandbox mode:
                </p>

                {/* 1-Click Sandbox Test Mode Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      initPayment(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-[#0068ff] to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Sparkles size={14} />
                    <span>Thử nghiệm thanh toán ngay (Sandbox Mode)</span>
                  </button>
                </div>

                <div className="pt-0.5 flex items-center justify-between">
                  <a
                    href="https://developers.zalopay.vn/v2/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0068ff] dark:text-blue-400 hover:underline"
                  >
                    <span>Mở ZaloPay Developer Docs</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-1 px-5 py-2 rounded-xl bg-gray-200 dark:bg-[#2d2d35] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors"
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
                  Your payment proof has been recorded. The host administrator or ZaloPay automated gateway is reviewing your transaction.
                </p>
              </div>

              <div className="w-full bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-300 text-[11px]">
                  <span>Order Reference:</span>
                  <span className="font-mono font-bold">{paymentData?.order_id}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  <Loader2 size={13} className="animate-spin shrink-0" />
                  <span>Listening for ZaloPay callback webhook in background...</span>
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
            /* Pending Checkout State (Clean QR & Simple Instructions) */
            <>
              {/* QR Code Card */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#16161a] rounded-2xl border border-gray-100 dark:border-[#262630]">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-200 max-w-[220px] w-full flex items-center justify-center">
                  <img
                    src={paymentData?.qr_code_url || '/zalopay_pro_qr.png'}
                    alt="QR Code"
                    className="w-full h-auto rounded-xl object-contain block"
                  />
                </div>

                <div className="mt-3 flex flex-col items-center gap-1 text-center">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    <Smartphone size={14} className="text-[#0068ff]" />
                    <span>Quét bằng Ví ZaloPay hoặc App Ngân Hàng (VietQR)</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Hỗ trợ tất cả ngân hàng: Vietcombank, MB, Techcombank, ACB, VPBank...
                  </p>
                </div>
              </div>

              {/* Minimal Transfer Details */}
              <div className="bg-gray-50 dark:bg-[#16161a] p-3 rounded-2xl border border-gray-100 dark:border-[#2a2a32] text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">Ngân hàng:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {paymentData?.bank_name || 'BVBank (Bản Việt)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-gray-900 dark:text-gray-100">
                    <span className="text-blue-600 dark:text-blue-400 select-all">
                      {paymentData?.bank_account || '99ZP26264M777568'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentData?.bank_account || '99ZP26264M777568', 'bank_account')}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === 'bank_account' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="select-all">{paymentData?.transfer_content || 'KV FILE PRO'}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentData?.transfer_content || 'KV FILE PRO', 'content')}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      title="Sao chép nội dung"
                    >
                      {copiedField === 'content' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center justify-center gap-2 py-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Tự động kích hoạt ngay sau khi chuyển khoản thành công</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  disabled={isSubmittingTransfer}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isSubmittingTransfer ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Tôi đã chuyển khoản / Xác nhận thanh toán</span>
                </button>

                {/* Admin Quick Action */}
                {isAdmin && (
                  <button
                    onClick={handleAdminApprove}
                    disabled={isAdminApproving}
                    className="w-full py-2 px-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isAdminApproving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    <span>Admin Instant Approve & Unlock</span>
                  </button>
                )}

                <button
                  onClick={handleCancelOrder}
                  className="w-full py-1 text-gray-400 hover:text-red-500 text-[11px] transition-colors cursor-pointer"
                >
                  Đóng / Hủy đơn
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
