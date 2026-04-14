import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { formatLKR } from "../../lib/formatLKR";

const currencyFormatter = { format: (v) => formatLKR(v) };

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.getAdminDashboardMetrics({
          range: 7,
          categoryLimit: 5,
          trendingLimit: 5,
          threshold: 5,
        });
        setMetrics(response);
      } catch (err) {
        setError(err.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  const revenueSeries = useMemo(
    () => metrics?.revenueAnalytics?.daily ?? [],
    [metrics?.revenueAnalytics?.daily],
  );

  const revenuePoints = useMemo(() => {
    if (!revenueSeries.length) return "";

    const maxRevenue = Math.max(
      ...revenueSeries.map((entry) => entry.revenue),
      1,
    );

    return revenueSeries
      .map((entry, index) => {
        const x = (index / Math.max(revenueSeries.length - 1, 1)) * 100;
        const y = 100 - (entry.revenue / maxRevenue) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [revenueSeries]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading admin analytics...</p>;
  }

  if (error) {
    return (
      <article className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
        {error}
      </article>
    );
  }

  if (!metrics) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/signin", { replace: true });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Logout
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Sales"
          value={currencyFormatter.format(metrics.totalSales || 0)}
        />
        <MetricCard title="Total Orders" value={metrics.totalOrders || 0} />
        <MetricCard title="Total Visitors" value={metrics.totalVisitors || 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Revenue (Last 7 Days)
              </h2>
              <p className="text-sm text-slate-500">
                Daily paid-order revenue trend.
              </p>
            </div>
            <RevenueDelta
              value={metrics.revenueAnalytics?.revenueChangePercent || 0}
            />
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <svg
              viewBox="0 0 100 100"
              className="h-40 w-full"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                points={revenuePoints}
              />
            </svg>
            <div className="mt-3 grid grid-cols-7 gap-2 text-[11px] text-slate-500">
              {revenueSeries.map((entry) => (
                <div key={entry.date} className="text-center">
                  <p>{entry.date.slice(5)}</p>
                  <p className="font-semibold text-slate-700">
                    {currencyFormatter.format(entry.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Top Categories
          </h2>
          <p className="text-sm text-slate-500">
            By units sold in paid orders.
          </p>
          <ul className="mt-4 space-y-3">
            {metrics.topCategories?.map((category, index) => (
              <li
                key={category.category}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    {index + 1}. {category.category}
                  </p>
                  <p className="text-sm text-slate-500">
                    {category.unitsSold} sold
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  Revenue: {currencyFormatter.format(category.revenue || 0)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Conversion Funnel
          </h2>
          <p className="text-sm text-slate-500">
            Views → Cart Adds → Checkout → Paid
          </p>
          <ConversionBar
            label="Product Views"
            value={metrics.conversionMetrics?.productViews || 0}
            max={metrics.conversionMetrics?.productViews || 1}
          />
          <ConversionBar
            label="Cart Adds"
            value={metrics.conversionMetrics?.cartAdds || 0}
            max={metrics.conversionMetrics?.productViews || 1}
          />
          <ConversionBar
            label="Checkouts"
            value={metrics.conversionMetrics?.checkouts || 0}
            max={metrics.conversionMetrics?.productViews || 1}
          />
          <ConversionBar
            label="Paid Orders"
            value={metrics.conversionMetrics?.paidOrders || 0}
            max={metrics.conversionMetrics?.productViews || 1}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <FunnelRate
              label="Views → Paid"
              value={metrics.conversionMetrics?.rates?.viewsToPaid || 0}
            />
            <FunnelRate
              label="Checkout → Paid"
              value={metrics.conversionMetrics?.rates?.checkoutToPaid || 0}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Trending Products
          </h2>
          <p className="text-sm text-slate-500">
            Score = views + (purchases × 2)
          </p>
          <div className="mt-4 space-y-3">
            {metrics.trendingProducts?.map((product) => (
              <article
                key={product._id}
                className="rounded-xl border border-amber-200 bg-amber-50/50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">{product.category}</p>
                  </div>
                  <p className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">
                    Score {product.score}
                  </p>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-slate-600">
                  <span>Views: {product.views}</span>
                  <span>Purchases: {product.purchases}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Low Stock Alerts
            </h2>
            <p className="text-sm text-slate-500">
              Products with stock below threshold (5).
            </p>
          </div>

          <Link
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            to="/admin/products"
          >
            Manage Products
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.lowStockProducts?.map((product) => (
                <tr key={product._id}>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {product.name}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {product.category}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {currencyFormatter.format(product.price || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function MetricCard({ title, value }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

function RevenueDelta({ value }) {
  const positive = value >= 0;

  return (
    <p
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      }`}
    >
      {positive ? "+" : ""}
      {value}% vs previous 7d
    </p>
  );
}

function ConversionBar({ label, value, max }) {
  const width = Math.min((value / Math.max(max, 1)) * 100, 100);

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-sm">
        <p className="font-medium text-slate-700">{label}</p>
        <p className="text-slate-500">{value}</p>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function FunnelRate({ label, value }) {
  return (
    <article className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}%</p>
    </article>
  );
}
