import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatLKR } from "../../lib/formatLKR";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  FileText,
} from "lucide-react";

const ORDER_STATUSES = ["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED"];

function sortByRelevance(orders, query) {
  const q = query.toLowerCase();
  const score = (o) => {
    const id = String(o._id).toLowerCase();
    const name = (o.user?.name || "").toLowerCase();
    if (id === q || id.endsWith(q)) return 0;
    if (name === q) return 1;
    if (id.includes(q)) return 2;
    if (name.includes(q)) return 3;
    return 4;
  };
  return [...orders].sort((a, b) => {
    const diff = score(a) - score(b);
    if (diff !== 0) return diff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function Badge({ type, value }) {
  const paymentColors = {
    PAID: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    FAILED: "bg-red-100 text-red-700",
  };
  const orderColors = {
    PAID: "bg-emerald-100 text-emerald-700",
    SHIPPED: "bg-blue-100 text-blue-700",
    DELIVERED: "bg-violet-100 text-violet-700",
    CANCELLED: "bg-red-100 text-red-700",
    PENDING_PAYMENT: "bg-amber-100 text-amber-700",
    CART: "bg-slate-100 text-slate-500",
  };
  const colors = type === "payment" ? paymentColors : orderColors;
  const label = value?.replace(/_/g, " ") || value;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[value] || "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [tab, setTab] = useState("all");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {["all", "bank"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t === "all" ? "All Orders" : "Pending Bank Payments"}
          </button>
        ))}
      </div>

      {tab === "all" ? <AllOrdersTab /> : <BankPaymentsTab />}
    </div>
  );
}

function AllOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [drawerOrder, setDrawerOrder] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getAdminOrders({ page, limit: 20, search, status: statusFilter, paymentStatus: paymentStatusFilter, paymentMethod: paymentMethodFilter, dateFrom, dateTo });
      const raw = data.orders || [];
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matched = raw.filter((o) => {
          const id = String(o._id).toLowerCase();
          const name = (o.user?.name || "").toLowerCase();
          return id.includes(q) || name.includes(q);
        });
        setOrders(sortByRelevance(matched, search.trim()));
      } else {
        setOrders(raw);
      }
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentStatusFilter, paymentMethodFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); };

  const exportCsv = () => {
    const rows = [
      ["Order #", "Date", "Customer", "Items", "Total", "Payment Method", "Payment Status", "Order Status"],
      ...orders.map((o) => [
        o._id,
        new Date(o.createdAt).toLocaleDateString(),
        o.user?.name || "—",
        o.items?.length || 0,
        o.totalPrice || 0,
        o.paymentMethod || "—",
        o.paymentStatus || "—",
        o.status || "—",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "orders.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <button type="submit" className="shrink-0 text-slate-400 hover:text-slate-600">
            <Search className="h-4 w-4" />
          </button>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Order # or customer..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </form>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>

        <select value={paymentStatusFilter} onChange={(e) => { setPaymentStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">All Payments</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={paymentMethodFilter} onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">All Methods</option>
          <option value="STRIPE">Stripe</option>
          <option value="MANUAL">Bank Transfer</option>
        </select>

        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
        </div>

        <button type="button" onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? <LoadingRows /> : error ? <ErrorRow msg={error} /> : orders.length === 0 ? <EmptyRow label="No orders found" /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr className="text-left text-xs font-medium text-slate-400">
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{String(o._id).slice(-8)}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{o.user?.name || "—"}</p>
                      <p className="text-xs text-slate-400">{o.user?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.items?.length || 0}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatLKR(o.totalPrice)}</td>
                    <td className="px-4 py-3 text-slate-500">{o.paymentMethod || "—"}</td>
                    <td className="px-4 py-3"><Badge type="payment" value={o.paymentStatus} /></td>
                    <td className="px-4 py-3"><Badge type="order" value={o.status} /></td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setDrawerOrder(o)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">{total} orders · Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Drawer */}
      {drawerOrder && (
        <OrderDrawer
          order={drawerOrder}
          onClose={() => setDrawerOrder(null)}
          onUpdated={(updated) => {
            setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
            setDrawerOrder(updated);
            showToast("Order status updated");
          }}
        />
      )}

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </div>
  );
}

function OrderDrawer({ order, onClose, onUpdated }) {
  const [newStatus, setNewStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (newStatus === order.status) return;
    setSaving(true);
    setErr("");
    try {
      const data = await api.updateAdminOrderStatus(order._id, newStatus);
      onUpdated(data.order);
    } catch (e) {
      setErr(e.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">Order Details</h3>
            <p className="text-xs text-slate-400 font-mono">{order._id}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {/* Customer */}
          <Section title="Customer">
            <p className="font-medium text-slate-900">{order.user?.name || "—"}</p>
            <p className="text-sm text-slate-500">{order.user?.email}</p>
            {order.user?.phone && <p className="text-sm text-slate-500">{order.user.phone}</p>}
          </Section>

          {/* Items */}
          <Section title="Items">
            <ul className="divide-y divide-slate-100">
              {order.items?.map((item, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  {item.product?.images?.[0] && (
                    <img src={item.product.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.product?.name || "Product"}</p>
                    <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatLKR(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
          </Section>

          {/* Totals */}
          <Section title="Summary">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-900">{formatLKR(order.totalPrice)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-slate-900">{formatLKR(order.totalPrice)}</span>
              </div>
            </div>
          </Section>

          {/* Status */}
          <Section title="Order Status">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <Badge type="payment" value={order.paymentStatus} />
                <Badge type="order" value={order.status} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <button type="button" onClick={handleSave} disabled={saving || newStatus === order.status}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-700">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          </Section>
        </div>
      </div>
    </div>
  );
}

function BankPaymentsTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState("");
  const [processing, setProcessing] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getAdminPendingBankOrders({ page, limit: 20, search });
      const raw = data.orders || [];
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matched = raw.filter((o) => {
          const id = String(o._id).toLowerCase();
          const name = (o.user?.name || "").toLowerCase();
          return id.includes(q) || name.includes(q);
        });
        setOrders(sortByRelevance(matched, search.trim()));
      } else {
        setOrders(raw);
      }
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err.message || "Failed to load bank orders");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (orderId) => {
    setProcessing(orderId);
    try {
      await api.approveBankPayment(orderId);
      showToast("Payment approved successfully");
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      showToast(err.message || "Approval failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (orderId) => {
    setProcessing(orderId);
    try {
      await api.rejectBankPayment(orderId);
      showToast("Payment rejected");
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      showToast(err.message || "Rejection failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleBankSearch = (e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="flex rounded-2xl bg-white p-4 shadow-sm">
        <form onSubmit={handleBankSearch} className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <button type="submit" className="shrink-0 text-slate-400 hover:text-slate-600">
            <Search className="h-4 w-4" />
          </button>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Order # or customer..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </form>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? <LoadingRows /> : error ? <ErrorRow msg={error} /> : orders.length === 0 ? (
          <EmptyRow label="No pending bank payments" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr className="text-left text-xs font-medium text-slate-400">
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <>
                    <tr key={o._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{String(o._id).slice(-8)}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{o.user?.name || "—"}</p>
                        <p className="text-xs text-slate-400">{o.user?.email || ""}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatLKR(o.totalPrice)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
                            {expandedId === o._id ? "Hide" : "View"}
                          </button>
                          <button type="button" disabled={processing === o._id} onClick={() => handleApprove(o._id)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-emerald-700">
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button type="button" disabled={processing === o._id} onClick={() => handleReject(o._id)}
                            className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-red-700">
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === o._id && (
                      <tr key={`${o._id}-detail`}>
                        <td colSpan={5} className="bg-slate-50 px-4 py-4">
                          <div className="flex flex-wrap gap-6">
                            <div className="flex-1 min-w-[200px]">
                              <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order Items</p>
                              <ul className="space-y-1.5">
                                {o.items?.map((item, i) => (
                                  <li key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-700">{item.product?.name || "Product"} × {item.quantity}</span>
                                    <span className="font-medium text-slate-900">{formatLKR(item.price * item.quantity)}</span>
                                  </li>
                                ))}
                                <li className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900">
                                  <span>Total</span>
                                  <span>{formatLKR(o.totalPrice)}</span>
                                </li>
                              </ul>
                            </div>
                            <div className="w-52">
                              <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Slip</p>
                              <PaymentSlipPreview url={o.paymentSlipUrl} resourceType={o.paymentSlipResourceType} format={o.paymentSlipFormat} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </div>
  );
}

function openPdfInline(url) {
  // Cloudinary raw PDFs default to attachment delivery — insert fl_attachment:false
  // so the browser renders the PDF inline rather than downloading it
  const inlineUrl = url.replace(/\/upload\/(?!fl_)/, "/upload/fl_attachment:false/");
  window.open(inlineUrl, "_blank");
}

function PaymentSlipPreview({ url, resourceType, format }) {
  if (!url) return <p className="text-xs text-slate-400">No slip uploaded</p>;

  const isPdf =
    format === "pdf" ||
    resourceType === "raw" ||
    /\.pdf(\?|$)/i.test(url) ||
    url.toLowerCase().includes("/raw/upload/");

  return (
    <div className="space-y-2">
      {isPdf ? (
        <div
          onClick={() => openPdfInline(url)}
          className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100"
        >
          <FileText className="h-8 w-8 text-slate-400" />
          <p className="text-xs font-medium text-slate-500">Payment Slip (PDF)</p>
        </div>
      ) : (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt="Payment slip"
            className="max-h-40 w-full rounded-xl border border-slate-200 object-contain"
          />
        </a>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function LoadingRows() {
  return <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading orders...</div>;
}
function ErrorRow({ msg }) {
  return <div className="p-6 text-sm text-red-600">{msg}</div>;
}
function EmptyRow({ label }) {
  return <div className="flex flex-col items-center justify-center py-16 text-slate-400"><p className="text-sm">{label}</p></div>;
}
function Toast({ msg, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
      {msg}
      <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
    </div>
  );
}
