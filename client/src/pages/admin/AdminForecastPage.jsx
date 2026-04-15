import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Package,
  Database,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { api } from "../../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  Critical: { color: "bg-red-100 text-red-700 border border-red-200", dot: "bg-red-500", label: "Critical", chipBg: "bg-red-50 border border-red-200 text-red-700" },
  Low:      { color: "bg-amber-100 text-amber-700 border border-amber-200", dot: "bg-amber-500", label: "Low", chipBg: "bg-amber-50 border border-amber-200 text-amber-700" },
  Moderate: { color: "bg-yellow-100 text-yellow-700 border border-yellow-200", dot: "bg-yellow-500", label: "Moderate", chipBg: "bg-yellow-50 border border-yellow-200 text-yellow-700" },
  Healthy:  { color: "bg-green-100 text-green-700 border border-green-200", dot: "bg-green-500", label: "Healthy", chipBg: "bg-green-50 border border-green-200 text-green-700" },
  Inactive: { color: "bg-slate-100 text-slate-500 border border-slate-200", dot: "bg-slate-400", label: "Inactive", chipBg: "bg-slate-100 border border-slate-200 text-slate-500" },
};

const STATUS_ORDER = ["Critical", "Low", "Moderate", "Healthy", "Inactive"];

const LINE_COLORS = ["#d97706", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444"];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Sk = ({ h = "h-4", w = "w-full", className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200 ${h} ${w} ${className}`} />
);

function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Sk key={i} h="h-14" w="w-32" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Sk h="h-72" />
        <Sk h="h-72" />
      </div>
      {/* Table */}
      <div className="space-y-2">
        <Sk h="h-10" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Sk key={i} h="h-12" />
        ))}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {status}
    </span>
  );
}

// ─── Trend Cell ───────────────────────────────────────────────────────────────

function TrendCell({ trend, trendPercent }) {
  if (trend === "rising") {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
        <TrendingUp className="h-3.5 w-3.5" />
        +{trendPercent}%
      </span>
    );
  }
  if (trend === "declining") {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 text-sm font-medium">
        <TrendingDown className="h-3.5 w-3.5" />
        -{trendPercent}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-400 text-sm font-medium">
      <Minus className="h-3.5 w-3.5" />
      {trendPercent}%
    </span>
  );
}

// ─── Days Left Cell ───────────────────────────────────────────────────────────

function DaysLeftCell({ days, status }) {
  if (days === null || days === undefined) return <span className="text-slate-400 text-sm">—</span>;
  const colorMap = { Critical: "text-red-600 font-bold", Low: "text-amber-600 font-bold", Moderate: "text-yellow-600 font-semibold", Healthy: "text-green-600 font-semibold", Inactive: "text-slate-400" };
  return (
    <span className={`text-sm tabular-nums ${colorMap[status] || "text-slate-700"}`}>
      {days >= 999 ? "999+" : days}
    </span>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function barColor(days) {
  if (days <= 7) return "#ef4444";
  if (days <= 30) return "#f59e0b";
  return "#10b981";
}

const RunwayTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-800 mb-1">{d.name}</p>
      <p className="text-slate-500">Stock: <span className="font-medium text-slate-700">{d.currentStock} units</span></p>
      <p className="text-slate-500">Days left: <span className="font-medium text-slate-700">{d.days >= 999 ? "999+" : d.days}</span></p>
      <p className="text-slate-500">Stockout: <span className="font-medium text-slate-700">{d.stockoutDate || "—"}</span></p>
    </div>
  );
};

function RunwayChart({ products }) {
  if (!products?.length) {
    return (
      <div className="flex h-56 items-center justify-center text-slate-400 text-sm">
        No at-risk products to display.
      </div>
    );
  }

  // Top 15 most at-risk, excluding nulls (Inactive without days)
  const atRisk = products
    .filter((p) => p.daysUntilStockout !== null)
    .slice(0, 15)
    .map((p) => ({
      name: p.name.length > 22 ? p.name.slice(0, 20) + "…" : p.name,
      days: Math.min(p.daysUntilStockout, 999),
      currentStock: p.currentStock,
      stockoutDate: p.stockoutDate,
    }));

  if (atRisk.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-slate-400 text-sm">
        All products have healthy stock levels.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        layout="vertical"
        data={atRisk}
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 11, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<RunwayTooltip />} />
        <Bar dataKey="days" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {atRisk.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColor(entry.days)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Sales Trend Chart ────────────────────────────────────────────────────────

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs max-w-[200px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="leading-snug">
          {p.name}: <span className="font-semibold">{p.value} units</span>
        </p>
      ))}
    </div>
  );
};

function SalesTrendChart({ trendData, loading }) {
  if (loading) {
    return <Sk h="h-72" />;
  }

  if (!trendData || !trendData.series?.length) {
    return (
      <div className="flex h-56 items-center justify-center text-slate-400 text-sm">
        No sales data for the last 30 days.
      </div>
    );
  }

  // Build recharts data: array of { day: "Apr 1", "Product A": 3, ... }
  const chartData = trendData.days.map((day, i) => {
    const point = { day };
    trendData.series.forEach((s) => {
      point[s.name] = s.data[i] ?? 0;
    });
    return point;
  });

  // Show every 5th label to avoid clutter
  const tickFormatter = (val, idx) => (idx % 5 === 0 ? val : "");

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={tickFormatter}
        />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip content={<TrendTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        {trendData.series.map((s, i) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Summary Chips ────────────────────────────────────────────────────────────

function SummaryChips({ summary, activeFilter, onFilter }) {
  const all = { label: "All", count: summary.total ?? 0, key: "All" };
  const chips = [
    all,
    ...STATUS_ORDER.map((s) => ({
      label: s,
      count: summary[s.toLowerCase()] ?? 0,
      key: s,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const isActive = activeFilter === chip.key;
        const meta = STATUS_META[chip.label];
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onFilter(chip.key)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
              isActive
                ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {meta && !isActive && (
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            )}
            {chip.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                isActive ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronUp className="h-3.5 w-3.5 opacity-20" />;
  return sortDir === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-amber-600" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-amber-600" />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminForecastPage() {
  const navigate = useNavigate();

  // Data
  const [forecastData, setForecastData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Table sort
  const [sortCol, setSortCol] = useState("daysUntilStockout");
  const [sortDir, setSortDir] = useState("asc");

  // Seed button
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getForecast();
      setForecastData(data);
    } catch (err) {
      setError(err.message || "Failed to load forecast data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const data = await api.getForecastSalesTrend();
      setTrendData(data);
    } catch (_) {
      setTrendData(null);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
    fetchTrend();
  }, [fetchForecast, fetchTrend]);

  // ── Seed handler ───────────────────────────────────────────────────────────

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await api.runSeedSalesData();
      setSeedMsg(res.message || "Done.");
      await fetchForecast();
      await fetchTrend();
    } catch (err) {
      setSeedMsg(err.message || "Seed failed.");
    } finally {
      setSeeding(false);
    }
  };

  // ── Derived: unique categories ─────────────────────────────────────────────

  const categories = useMemo(() => {
    if (!forecastData?.products) return [];
    const cats = [...new Set(forecastData.products.map((p) => p.category))].sort();
    return cats;
  }, [forecastData]);

  // ── Filtered + sorted rows ─────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    if (!forecastData?.products) return [];
    let rows = forecastData.products;

    if (statusFilter !== "All") {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter !== "All") {
      rows = rows.filter((r) => r.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }

    // Sort
    rows = [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];

      // Handle nulls (push to end always)
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;

      if (typeof av === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return rows;
  }, [forecastData, statusFilter, categoryFilter, search, sortCol, sortDir]);

  // ── Sort toggle ────────────────────────────────────────────────────────────

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // ── Table header cell ──────────────────────────────────────────────────────

  const Th = ({ col, children, className = "" }) => (
    <th
      className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-amber-600 transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <p className="text-lg font-semibold text-slate-700">Failed to load forecast</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={fetchForecast}
          className="mt-5 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!forecastData?.products?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Package className="h-14 w-14 text-slate-300 mb-4" />
        <p className="text-lg font-semibold text-slate-700">No products found</p>
        <p className="mt-1 text-sm text-slate-500">Add products to see inventory forecasts.</p>
      </div>
    );
  }

  const summary = forecastData.summary || {};

  return (
    <div className="space-y-6">
      {/* ── Top bar: summary chips + controls ─────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SummaryChips
          summary={summary}
          activeFilter={statusFilter}
          onFilter={(f) => {
            setStatusFilter(f);
          }}
        />

        <div className="flex items-center gap-2 shrink-0">
          {/* Seed button */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700 transition disabled:opacity-60"
            >
              {seeding ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              {seeding ? "Seeding…" : "Run Seed Data"}
            </button>
            <span className="pointer-events-none absolute -bottom-8 right-0 z-10 hidden whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1 text-[10px] text-white group-hover:block">
              Populate demo sales data
            </span>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => { fetchForecast(); fetchTrend(); }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700 transition"
            title="Refresh forecast"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Seed message */}
      {seedMsg && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {seedMsg}
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Runway chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-slate-800">
            Days Until Stockout — Top At-Risk Products
          </h2>
          <p className="mb-4 text-xs text-slate-400">Based on 30-day avg sales velocity</p>
          <RunwayChart products={forecastData.products} />
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded bg-red-500" /> ≤7 days</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded bg-amber-400" /> ≤30 days</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded bg-emerald-500" /> &gt;30 days</span>
          </div>
        </div>

        {/* Sales trend chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-slate-800">
            Sales Velocity — Last 30 Days
          </h2>
          <p className="mb-4 text-xs text-slate-400">Top 5 best-selling products</p>
          <SalesTrendChart trendData={trendData} loading={trendLoading} />
        </div>
      </div>

      {/* ── Table filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition w-52"
        />

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <Th col="name" className="min-w-[200px]">Product</Th>
                <Th col="category">Category</Th>
                <Th col="currentStock">Stock</Th>
                <Th col="avgDailySales">Avg Daily Sales</Th>
                <Th col="daysUntilStockout">Days Left</Th>
                <Th col="stockoutDate">Projected Stockout</Th>
                <Th col="trend">Trend</Th>
                <Th col="suggestedRestock">Restock Suggestion</Th>
                <Th col="status">Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <Package className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm font-semibold text-slate-500">No products match this filter</p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("All");
                        setCategoryFilter("All");
                        setSearch("");
                      }}
                      className="mt-2 text-sm text-amber-600 underline underline-offset-2 hover:text-amber-700"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={String(row.productId)}
                    onClick={() => navigate(`/admin/products/edit/${row.productId}`)}
                    className="cursor-pointer hover:bg-amber-50 transition-colors"
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.thumbnail ? (
                          <img
                            src={row.thumbnail}
                            alt={row.name}
                            className="h-9 w-9 rounded-lg object-cover shrink-0 border border-slate-100"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 shrink-0">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-800 line-clamp-2 max-w-[160px]">
                          {row.name}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                      {row.category}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-sm tabular-nums font-medium text-slate-700 whitespace-nowrap">
                      {row.currentStock}
                    </td>

                    {/* Avg daily */}
                    <td className="px-4 py-3 text-sm tabular-nums text-slate-600 whitespace-nowrap">
                      {row.avgDailySales > 0 ? row.avgDailySales : "—"}
                    </td>

                    {/* Days left */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DaysLeftCell days={row.daysUntilStockout} status={row.status} />
                    </td>

                    {/* Stockout date */}
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                      {row.stockoutDate || "—"}
                    </td>

                    {/* Trend */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <TrendCell trend={row.trend} trendPercent={row.trendPercent} />
                    </td>

                    {/* Restock */}
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {row.suggestedRestock > 0 ? (
                        <span className="font-medium text-amber-700">
                          Order {row.suggestedRestock} units
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Row count footer */}
        {filteredRows.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
            Showing {filteredRows.length} of {forecastData.products.length} products
          </div>
        )}
      </div>
    </div>
  );
}
