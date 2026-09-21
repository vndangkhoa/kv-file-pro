import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Search,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { OrderStatusResponse, AdminOrdersListResponse } from '../../../types';
import { useExtensionStore } from '../../../stores/useExtensionStore';

interface AdminOrdersModalProps {
  onClose: () => void;
}

export const AdminOrdersModal: React.FC<AdminOrdersModalProps> = ({ onClose }) => {
  const { fetchLicenses } = useExtensionStore();

  const [orders, setOrders] = useState<OrderStatusResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('AWAITING_VERIFICATION');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let url = '/api/v1/payments/admin/orders?limit=100';
      if (filterStatus !== 'ALL') {
        url += `&status=${encodeURIComponent(filterStatus)}`;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Failed to fetch admin orders`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server returned an unexpected non-JSON response. Please restart the backend server to apply recent API changes.');
      }

      const data: AdminOrdersListResponse = await res.json();
      setOrders(data.orders || []);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = async (orderId: string) => {
    try {
      setActionInProgress(orderId);
      setError(null);

      const res = await fetch(`/api/v1/payments/admin/orders/${encodeURIComponent(orderId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: 'Manually verified and approved by Administrator' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to approve order');
      }

      const updatedOrder: OrderStatusResponse = await res.json();
      setActionSuccess(`Order ${orderId} approved and license issued successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);

      // Update in local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updatedOrder, status: 'PAID' } : o))
      );

      // Refresh license store
      fetchLicenses();
    } catch (err: any) {
      setError(err.message || 'Error approving order');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (orderId: string) => {
    const reason = window.prompt('Enter rejection reason (optional):', 'Transfer could not be verified');
    if (reason === null) return; // cancelled prompt

    try {
      setActionInProgress(orderId);
      setError(null);

      const res = await fetch(`/api/v1/payments/admin/orders/${encodeURIComponent(orderId)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: reason.trim() || 'Payment verification rejected by Administrator' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to reject order');
      }

      const updatedOrder: OrderStatusResponse = await res.json();
      setActionSuccess(`Order ${orderId} rejected.`);
      setTimeout(() => setActionSuccess(null), 4000);

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updatedOrder, status: 'FAILED' } : o))
      );
    } catch (err: any) {
      setError(err.message || 'Error rejecting order');
    } finally {
      setActionInProgress(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.user_id.toLowerCase().includes(q) ||
      o.extension_id.toLowerCase().includes(q) ||
      (o.gateway_trans_id && o.gateway_trans_id.toLowerCase().includes(q)) ||
      (o.app_trans_id && o.app_trans_id.toLowerCase().includes(q)) ||
      (o.momo_trans_id && o.momo_trans_id.toLowerCase().includes(q)) ||
      (o.user_note && o.user_note.toLowerCase().includes(q))
    );
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 size={12} />
            <span>PAID</span>
          </span>
        );
      case 'AWAITING_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock size={12} />
            <span>AWAITING VERIFICATION</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Clock size={12} />
            <span>PENDING</span>
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            <XCircle size={12} />
            <span>{status}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-[#2b2b34] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-[#262630] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
              <ShieldCheck size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                  Payment Orders Management
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-bold">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Review manual bank / ZaloPay transfers and issue cryptographically signed licenses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              title="Refresh orders list"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#25252d] transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-blue-500' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#25252d] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-gray-100 dark:border-[#262630] bg-gray-50/50 dark:bg-[#1f1f26]/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { label: 'Awaiting Review', val: 'AWAITING_VERIFICATION' },
              { label: 'Pending', val: 'PENDING' },
              { label: 'Paid', val: 'PAID' },
              { label: 'Failed / Cancelled', val: 'FAILED' },
              { label: 'All Orders', val: 'ALL' },
            ].map((tab) => (
              <button
                key={tab.val}
                onClick={() => setFilterStatus(tab.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  filterStatus === tab.val
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#24242d] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2c2c36] border border-gray-200 dark:border-[#33333e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, user, note..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#24242d] border border-gray-200 dark:border-[#33333e] text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-hidden focus:border-purple-500"
            />
          </div>
        </div>

        {/* Action feedback banners */}
        {actionSuccess && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="px-5 py-2.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {isLoading && orders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400">
              <Loader2 size={32} className="animate-spin text-purple-600 mb-3" />
              <p className="text-xs">Loading orders catalog...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="p-3 rounded-2xl bg-gray-100 dark:bg-[#22222a] text-gray-400 mb-2">
                <CreditCard size={28} />
              </div>
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                No orders found
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                {filterStatus === 'AWAITING_VERIFICATION'
                  ? 'There are currently no orders awaiting manual verification.'
                  : 'No payment records match the current status filter or search criteria.'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isActioning = actionInProgress === order.id;

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-[#2e2e38] bg-white dark:bg-[#202027] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-purple-300 dark:hover:border-purple-800/80"
                >
                  {/* Left Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                        {order.id}
                      </span>
                      {getStatusBadge(order.status)}
                      <span className="text-[11px] text-gray-400 font-mono">
                        {new Date(order.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300 flex-wrap">
                      <div>
                        <span className="text-gray-400">Item: </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {order.extension_id === 'kv-files-pro-lifetime'
                            ? 'KV Files Pro (Lifetime All-Access)'
                            : order.extension_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Amount: </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(order.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">User: </span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {order.user_id}
                        </span>
                      </div>
                    </div>

                    {/* Customer Notes / Reference Proof */}
                    {(order.user_note || order.gateway_trans_id || order.app_trans_id || order.momo_trans_id) && (
                      <div className="mt-2 p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181f] border border-gray-100 dark:border-[#292933] text-[11px] space-y-1">
                        {(order.gateway_trans_id || order.app_trans_id || order.momo_trans_id) && (
                          <div className="flex items-center gap-1.5 font-mono text-gray-700 dark:text-gray-300">
                            <span className="text-gray-400">Gateway Trans ID:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {order.gateway_trans_id || order.app_trans_id || order.momo_trans_id}
                            </span>
                          </div>
                        )}
                        {order.user_note && (
                          <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300">
                            <MessageSquare size={13} className="shrink-0 mt-0.5 text-gray-400" />
                            <span>
                              <strong className="text-gray-500">Note: </strong>
                              {order.user_note}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* License key display if paid */}
                    {order.license_key && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">Issued Key:</span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                          {order.license_key}
                        </span>
                        <button
                          onClick={() => copyToClipboard(order.license_key!)}
                          title="Copy license key"
                          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#2b2b35] text-gray-500"
                        >
                          {copiedKey === order.license_key ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {(order.status === 'AWAITING_VERIFICATION' || order.status === 'PENDING') && (
                      <>
                        <button
                          onClick={() => handleReject(order.id)}
                          disabled={isActioning}
                          className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(order.id)}
                          disabled={isActioning}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isActioning ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          <span>Approve & Grant License</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-gray-100 dark:border-[#262630] bg-gray-50/50 dark:bg-[#1a1a20]/50 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span>Total Records: {totalCount}</span>
          <span>Approving an order automatically mints an HMAC-signed license key.</span>
        </div>
      </div>
    </div>
  );
};
