/**
 * CustomerProfilePage — full rebuild as e-commerce account dashboard.
 *
 * Layout: left sidebar + right content area (tabs on mobile).
 * Sections: Overview | My Orders | Wishlist | Personal Info | Addresses | Account Settings
 *
 * Changes vs old version:
 *  - Full sidebar navigation with avatar/name display
 *  - Overview: welcome, quick stats, recent orders, wishlist preview
 *  - My Orders: full history, expandable items, status badges
 *  - Wishlist: grid of product cards with remove + add to cart
 *  - Personal Info: editable form (name, phone, DOB, gender)
 *  - Addresses: add/edit/delete saved addresses with default flag
 *  - Account Settings: change password, danger zone (delete account)
 *  - LKR formatting throughout
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingBag, Heart, Award } from "lucide-react";
import { api, assetUrl } from "../../lib/api";
import { formatLKR } from "../../lib/formatLKR";
import { useAuth } from "../../hooks/useAuth";
import { useWishlist } from "../../context/WishlistContext";
import ProductCard from "../../components/products/ProductCard";

function formatStatNumber(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  CART: "bg-slate-100 text-slate-600",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-sky-100 text-sky-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "bg-slate-100 text-slate-600";
  const label = status?.replace("_", " ") || "Unknown";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ path, className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { key: "orders", label: "My Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { key: "wishlist", label: "Wishlist", icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
  { key: "personal", label: "Personal Info", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { key: "addresses", label: "Addresses", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { key: "settings", label: "Account Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

// ─── Overview section ─────────────────────────────────────────────────────────

function Overview({ user, orders, wishlistIds, onTabChange }) {
  const recentOrders = useMemo(
    () => orders.filter((o) => o.status !== "CART").slice(0, 3),
    [orders]
  );
  const loyaltyPoints = (orders.filter((o) => o.status !== "CART").length * 50);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">
        Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
      </h2>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Orders", value: orders.filter((o) => o.status !== "CART").length, Icon: ShoppingBag, color: "text-amber-600 bg-amber-50" },
          { label: "Wishlist Items", value: wishlistIds.size, Icon: Heart, color: "text-rose-500 bg-rose-50" },
          { label: "Loyalty Points", value: loyaltyPoints, Icon: Award, color: "text-sky-600 bg-sky-50" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-2xl bg-white p-4 text-center shadow-sm border border-slate-100 space-y-2">
            <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${color}`}>
              <Icon size={16} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatStatNumber(value)}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Recent Orders</h3>
          <button type="button" onClick={() => onTabChange("orders")} className="text-xs text-amber-600 hover:underline">
            View All →
          </button>
        </div>
        {!recentOrders.length ? (
          <p className="text-sm text-slate-400">No orders yet. Start shopping!</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <div key={order._id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2.5 px-1">
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-700">#{order._id.slice(-8)}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(order.createdAt)}</p>
                </div>
                <StatusBadge status={order.status} />
                <p className="text-right text-sm font-semibold text-slate-800">{formatLKR(order.totalPrice)}</p>
                <button type="button" onClick={() => onTabChange("orders")} className="text-right text-xs font-medium text-amber-600 hover:underline">
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── My Orders section ────────────────────────────────────────────────────────

const ORDERS_PAGE_SIZE = 5;
const ITEMS_PREVIEW = 2;

function OrderItemsList({ items }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, ITEMS_PREVIEW);
  const hidden = items.length - ITEMS_PREVIEW;

  return (
    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2.5">
      {visible.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3 text-sm">
          {item.product?.images?.[0] ? (
            <img
              src={assetUrl(item.product.images[0])}
              alt={item.product?.name}
              className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-slate-100" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 line-clamp-1">{item.product?.name || "Product"}</p>
            <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
          </div>
          <p className="font-semibold text-slate-700 shrink-0">{formatLKR(item.price * item.quantity)}</p>
        </div>
      ))}
      {!showAll && hidden > 0 && (
        <button type="button" onClick={() => setShowAll(true)}
          className="text-xs text-amber-600 hover:underline">
          Show {hidden} more item{hidden !== 1 ? "s" : ""} →
        </button>
      )}
      {showAll && items.length > ITEMS_PREVIEW && (
        <button type="button" onClick={() => setShowAll(false)}
          className="text-xs text-slate-400 hover:underline">
          Show less
        </button>
      )}
    </div>
  );
}

function MyOrders({ orders }) {
  const [expanded, setExpanded] = useState(null);
  const [visibleCount, setVisibleCount] = useState(ORDERS_PAGE_SIZE);
  const realOrders = orders.filter((o) => o.status !== "CART");
  const visibleOrders = realOrders.slice(0, visibleCount);
  const hasMore = visibleCount < realOrders.length;

  if (!realOrders.length) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-100">
        <p className="text-4xl mb-3">📦</p>
        <p className="font-semibold text-slate-700">No orders yet</p>
        <p className="mt-1 text-sm text-slate-400">When you place your first order, it will appear here.</p>
        <Link to="/home" className="mt-4 inline-block rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900">My Orders</h2>
      {visibleOrders.map((order) => (
        <div key={order._id} className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 transition-all duration-200">
          <button
            type="button"
            onClick={() => setExpanded(expanded === order._id ? null : order._id)}
            className="flex w-full items-center gap-4 p-4 text-left hover:bg-slate-50 transition"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-slate-500">#{order._id.slice(-12)}</p>
              <p className="mt-0.5 text-xs text-slate-400">{formatDate(order.createdAt)} · {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}</p>
            </div>
            <StatusBadge status={order.status} />
            <p className="font-semibold text-slate-800 shrink-0">{formatLKR(order.totalPrice)}</p>
            <span className="text-xs text-slate-400 shrink-0">{order.paymentMethod}</span>
            <ChevronDownIcon open={expanded === order._id} />
          </button>

          {expanded === order._id && order.items?.length > 0 && (
            <OrderItemsList items={order.items} />
          )}
        </div>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + ORDERS_PAGE_SIZE)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Show more orders ({realOrders.length - visibleCount} remaining)
        </button>
      )}
      {!hasMore && realOrders.length > ORDERS_PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setVisibleCount(ORDERS_PAGE_SIZE)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-50 transition"
        >
          Show less
        </button>
      )}
    </div>
  );
}

// ─── Wishlist section ─────────────────────────────────────────────────────────

function WishlistSection() {
  const { wishlistIds, toggle } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getWishlist()
      .then((data) => setProducts(data.products || data.wishlist?.map((w) => w.product).filter(Boolean) || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // Filter to only show currently-wishlisted products
  const visibleProducts = products.filter((p) => wishlistIds.has(String(p._id)));

  if (loading) {
    return <div className="py-8 text-center text-sm text-slate-400">Loading wishlist…</div>;
  }

  if (!visibleProducts.length) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-100">
        <p className="text-4xl mb-3">♡</p>
        <p className="font-semibold text-slate-700">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-slate-400">Start saving items you love by tapping the heart icon.</p>
        <Link to="/home" className="mt-4 inline-block rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700">
          Discover Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Wishlist ({visibleProducts.length})</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            to={`/products/${product._id}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Personal Info section ────────────────────────────────────────────────────

function PersonalInfo({ user, onUpdate }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
    gender: user?.gender || "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(""); setErr("");
    try {
      const data = await api.updateProfile(form);
      onUpdate(data.user);
      setMsg("Profile updated successfully.");
    } catch (error) {
      setErr(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Personal Info</h2>
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
            <input name="name" value={form.name} onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
            <input value={user?.email || ""} readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed" />
            <p className="mt-1 text-xs text-slate-400">Email cannot be changed.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Phone Number</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="+94 77 123 4567" type="tel" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Date of Birth</label>
            <input name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              type="date" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {err && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{err}</p>}
          {msg && <p className="rounded-lg bg-green-50 p-3 text-xs text-green-700">{msg}</p>}

          <button type="submit" disabled={saving}
            className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Addresses section ────────────────────────────────────────────────────────

const EMPTY_ADDRESS = { label: "Home", fullName: "", line1: "", line2: "", city: "", province: "", postalCode: "", phone: "", isDefault: false };

function AddressForm({ initial = EMPTY_ADDRESS, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Label</label>
          <select name="label" value={form.label} onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none">
            <option>Home</option><option>Work</option><option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Full Name</label>
          <input required name="fullName" value={form.fullName} onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none" placeholder="Recipient name" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Address Line 1</label>
        <input required name="line1" value={form.line1} onChange={handleChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none" placeholder="Street address" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Address Line 2</label>
        <input name="line2" value={form.line2} onChange={handleChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none" placeholder="Apt, suite, etc. (optional)" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">City</label>
          <input required name="city" value={form.city} onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none" placeholder="Colombo" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Province</label>
          <input name="province" value={form.province} onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none" placeholder="Western" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Postal Code</label>
          <input name="postalCode" value={form.postalCode} onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none" placeholder="10200" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Phone</label>
        <input name="phone" value={form.phone} onChange={handleChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none" placeholder="+94 77 123 4567" type="tel" />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Address"}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    api.getAddresses()
      .then((data) => setAddresses(data.addresses || []))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (form) => {
    setSaving(true); setErr("");
    try {
      await api.addAddress(form);
      load();
      setAdding(false);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id, form) => {
    setSaving(true); setErr("");
    try {
      await api.updateAddress(id, form);
      load();
      setEditingId(null);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteAddress(id);
      load();
    } catch (e) { setErr(e.message); }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.setDefaultAddress(id);
      load();
    } catch (e) { setErr(e.message); }
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Loading addresses…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Addresses</h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700">
            + Add New
          </button>
        )}
      </div>

      {err && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{err}</p>}

      {adding && (
        <AddressForm onSave={handleAdd} onCancel={() => setAdding(false)} saving={saving} />
      )}

      {!addresses.length && !adding ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-100">
          <p className="text-4xl mb-2">📍</p>
          <p className="font-semibold text-slate-700">No saved addresses</p>
          <p className="mt-1 text-sm text-slate-400">Add an address for faster checkout.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr._id} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              {editingId === addr._id ? (
                <AddressForm
                  initial={addr}
                  onSave={(form) => handleEdit(addr._id, form)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                        {addr.label || "Home"}
                      </span>
                      {addr.isDefault && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-slate-800">{addr.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[addr.line1, addr.line2, addr.city, addr.province, addr.postalCode].filter(Boolean).join(", ")}
                    </p>
                    {addr.phone && <p className="text-xs text-slate-500">{addr.phone}</p>}
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <button type="button" onClick={() => setEditingId(addr._id)}
                      className="text-xs text-amber-600 hover:underline">Edit</button>
                    <button type="button" onClick={() => handleDelete(addr._id)}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline">Delete</button>
                    {!addr.isDefault && (
                      <button type="button" onClick={() => handleSetDefault(addr._id)}
                        className="text-xs text-slate-400 hover:text-slate-600 hover:underline">Set default</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Account Settings section ─────────────────────────────────────────────────

function AccountSettings({ onLogout }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handlePwChange = (e) => setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwErr("New passwords do not match.");
      return;
    }
    setPwSaving(true); setPwMsg(""); setPwErr("");
    try {
      await api.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg("Password changed successfully.");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwErr(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteAccount();
      logout();
      navigate("/signin", { replace: true });
    } catch (err) {
      setPwErr(err.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Account Settings</h2>

      {/* Change password */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-md">
          {["currentPassword", "newPassword", "confirmPassword"].map((field) => (
            <div key={field}>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                {field === "currentPassword" ? "Current Password" : field === "newPassword" ? "New Password" : "Confirm New Password"}
              </label>
              <input
                type="password"
                name={field}
                value={pwForm[field]}
                onChange={handlePwChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
          ))}
          {pwErr && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{pwErr}</p>}
          {pwMsg && <p className="rounded-lg bg-green-50 p-3 text-xs text-green-700">{pwMsg}</p>}
          <button type="submit" disabled={pwSaving}
            className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
            {pwSaving ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-600 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button type="button" onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl border border-red-400 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition">
            Delete Account
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-700 font-medium">Are you absolutely sure?</p>
            <button type="button" onClick={handleDeleteAccount} disabled={deleteLoading}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {deleteLoading ? "Deleting…" : "Yes, Delete"}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white transition">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { wishlistIds } = useWishlist();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");

  const previewUrl = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    return assetUrl(user?.avatar?.url);
  }, [avatarFile, user?.avatar?.url]);

  useEffect(() => {
    api.getMyOrders()
      .then((data) => setOrders(data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, []);

  // Sync tab from URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && NAV_ITEMS.some((n) => n.key === tab)) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate("/signin", { replace: true });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarLoading(true);
    setAvatarMsg("");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const data = await api.uploadAvatar(formData);
      updateUser(data.user);
      setAvatarMsg("Avatar updated!");
      setAvatarFile(null);
    } catch (err) {
      setAvatarMsg(err.message || "Failed to upload");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8 lg:items-start">
        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside className="lg:w-64 shrink-0">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center gap-3">
              <label className="relative cursor-pointer group">
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-amber-400 transition" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center ring-2 ring-slate-200 group-hover:ring-amber-400 transition">
                    <span className="text-2xl font-bold text-amber-700">{getInitials(user?.name)}</span>
                  </div>
                )}
                <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white shadow-sm text-xs group-hover:bg-amber-700 transition">
                  {avatarLoading ? "…" : "✎"}
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={avatarLoading} />
              </label>
              {avatarMsg && <p className="text-[10px] text-emerald-600">{avatarMsg}</p>}
              <div>
                <p className="font-semibold text-slate-900">{user?.name || "—"}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            {/* Nav links */}
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleTabChange(item.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition text-left ${
                    activeTab === item.key
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon path={item.icon} className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {ordersLoading && activeTab === "overview" ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : activeTab === "overview" ? (
            <Overview user={user} orders={orders} wishlistIds={wishlistIds} onTabChange={handleTabChange} />
          ) : activeTab === "orders" ? (
            <MyOrders orders={orders} />
          ) : activeTab === "wishlist" ? (
            <WishlistSection />
          ) : activeTab === "personal" ? (
            <PersonalInfo user={user} onUpdate={updateUser} />
          ) : activeTab === "addresses" ? (
            <Addresses />
          ) : activeTab === "settings" ? (
            <AccountSettings onLogout={handleLogout} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
