import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatLKR } from "../../lib/formatLKR";
import { Search, ChevronLeft, ChevronRight, X, ShieldBan, ShieldCheck } from "lucide-react";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hasOrdersFilter, setHasOrdersFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const [banLoading, setBanLoading] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getAdminCustomers({ page, limit: 20, search, status: statusFilter, hasOrders: hasOrdersFilter });
      setCustomers(data.customers || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, hasOrdersFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  const openDrawer = async (cust) => {
    try {
      const data = await api.getAdminCustomerById(cust._id);
      setSelected(data.customer);
    } catch {
      setSelected(cust);
    }
  };

  const handleToggleBan = async (customerId, currentBanned) => {
    setBanLoading(true);
    try {
      await api.toggleCustomerBan(customerId, !currentBanned);
      const msg = !currentBanned ? "Customer banned" : "Customer unbanned";
      showToast(msg);
      setCustomers((prev) => prev.map((c) => c._id === customerId ? { ...c, isBanned: !currentBanned } : c));
      if (selected?._id === customerId) setSelected((p) => p ? { ...p, isBanned: !currentBanned } : p);
    } catch (err) {
      showToast(err.message || "Action failed");
    } finally {
      setBanLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name or email..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </form>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">All Customers</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>

        <select value={hasOrdersFilter} onChange={(e) => { setHasOrdersFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">All</option>
          <option value="yes">Has Orders</option>
          <option value="no">No Orders</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading customers...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr className="text-left text-xs font-medium text-slate-400">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Total Spent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDrawer(c)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {c.avatar?.url ? (
                          <img src={c.avatar.url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                            {getInitials(c.name)}
                          </div>
                        )}
                        <span className="font-medium text-slate-900">{c.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-700">{c.totalOrders}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatLKR(c.totalSpent)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.isBanned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {c.isBanned ? "Banned" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={banLoading}
                        onClick={() => handleToggleBan(c._id, c.isBanned)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                          c.isBanned
                            ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            : "border-red-200 text-red-600 hover:bg-red-50"
                        }`}
                      >
                        {c.isBanned ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldBan className="h-3.5 w-3.5" />}
                        {c.isBanned ? "Unban" : "Ban"}
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
            <p className="text-xs text-slate-400">{total} customers · Page {page} of {totalPages}</p>
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

      {/* Customer Drawer */}
      {selected && (
        <CustomerDrawer
          customer={selected}
          onClose={() => setSelected(null)}
          onToggleBan={handleToggleBan}
          banLoading={banLoading}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
          <button type="button" onClick={() => setToast("")}><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

function CustomerDrawer({ customer, onClose, onToggleBan, banLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Customer Details</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            {customer.avatar?.url ? (
              <img src={customer.avatar.url} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
                {getInitials(customer.name)}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-slate-900">{customer.name || "—"}</p>
              <p className="text-sm text-slate-500">{customer.email}</p>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                customer.isBanned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {customer.isBanned ? "Banned" : "Active"}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="Phone" value={customer.phone || "—"} />
            <InfoBox label="Registered" value={new Date(customer.createdAt).toLocaleDateString()} />
            <InfoBox label="Total Orders" value={customer.totalOrders ?? "—"} />
            <InfoBox label="Total Spent" value={formatLKR(customer.totalSpent ?? 0)} />
            <InfoBox label="Wishlist Items" value={customer.wishlistCount ?? 0} />
            <InfoBox label="Last Login" value={customer.lastLogin ? new Date(customer.lastLogin).toLocaleDateString() : "Never"} />
          </div>

          {/* Order History */}
          {customer.orders?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Order History</p>
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {customer.orders.map((o) => (
                  <li key={o._id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-mono text-slate-500">{String(o._id).slice(-8)}</p>
                      <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatLKR(o.totalPrice)}</p>
                      <span className={`text-xs font-medium ${
                        o.status === "DELIVERED" ? "text-emerald-600" :
                        o.status === "CANCELLED" ? "text-red-500" :
                        o.status === "SHIPPED" ? "text-blue-600" : "text-amber-600"
                      }`}>{o.status?.replace(/_/g, " ")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ban/Unban */}
          <button
            type="button"
            disabled={banLoading}
            onClick={() => onToggleBan(customer._id, customer.isBanned)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              customer.isBanned
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {customer.isBanned ? <ShieldCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
            {customer.isBanned ? "Unban Customer" : "Ban Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-medium text-slate-400 uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
