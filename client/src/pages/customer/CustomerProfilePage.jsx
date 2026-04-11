import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, assetUrl } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

export default function CustomerProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const previewUrl = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }

    return assetUrl(user?.avatar?.url);
  }, [avatarFile, user?.avatar?.url]);

  const handleLogout = () => {
    logout();
    navigate("/signin", { replace: true });
  };

  const handleAvatarSubmit = async (event) => {
    event.preventDefault();

    if (!avatarFile) {
      setError("Please choose an image first");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const data = await api.uploadAvatar(formData);
      updateUser(data.user);
      setAvatarFile(null);
      setMessage("Avatar updated successfully");
    } catch (err) {
      setError(err.message || "Failed to upload avatar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setOrdersLoading(true);
        const data = await api.getMyOrders();
        setOrders(data.orders || []);
      } catch {
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-500">
          Manage your account and view order history.
        </p>
      </header>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <img
            src={previewUrl || "https://placehold.co/140x140?text=Avatar"}
            alt="Avatar preview"
            className="h-20 w-20 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleAvatarSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Avatar image
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setAvatarFile(event.target.files?.[0] || null)
              }
              className="mt-2 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {loading ? "Uploading..." : "Save Avatar"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Order History</h3>
        <p className="mt-1 text-sm text-slate-500">
          Track your latest orders and payment status.
        </p>

        {ordersLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading orders...</p>
        ) : !orders.length ? (
          <p className="mt-4 text-sm text-slate-500">No orders found yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((order) => (
              <li
                key={order._id}
                className="rounded-xl border border-slate-200 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs text-slate-500">
                    {order._id}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {order.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-slate-600">
                  <p>Items: {order.items?.length || 0}</p>
                  <p>Total: ${Number(order.totalPrice || 0).toFixed(2)}</p>
                  <p>Payment: {order.paymentMethod}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
