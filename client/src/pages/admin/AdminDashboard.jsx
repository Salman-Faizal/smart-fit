import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { api } from "../../lib/api";
import { formatLKR } from "../../lib/formatLKR";
import {
  ShoppingBag,
  ShoppingCart,
  Users,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  AlertTriangle,
  Package,
} from "lucide-react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const AMBER = "#d97706";
const DONUT_COLORS = ["#d97706", "#f59e0b", "#fbbf24", "#b45309", "#92400e", "#f97316", "#ea580c", "#78350f"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

function CardShell({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function EmptyState({ label = "No data available" }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
      <p className="text-sm">{label}</p>
    </div>
  );
}

function ThreeDotMenu({ options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 min-w-[140px] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => { opt.onClick(); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingModal({ title, label, unit = "LKR", currentValue, onSave, onClose }) {
  const [value, setValue] = useState(String(currentValue ?? ""));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    const num = Number(value);
    if (!value || isNaN(num) || num < 0) { setErr("Please enter a valid number"); return; }
    setSaving(true);
    setErr("");
    try {
      await onSave(num);
      onClose();
    } catch (e) {
      setErr(e.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold text-slate-900">{title}</h3>
        <p className="mb-4 text-xs text-slate-400">{label}</p>
        <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-amber-500">
          {unit && <span className="border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">{unit}</span>}
          <input
            type="number"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSave}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-700">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row 1: Weekly KPI Cards ──────────────────────────────────────────────────
function WeeklyStatCards() {
  const { data, loading } = useFetch(() => api.getDashboardWeeklyStats());

  const cards = [
    {
      key: "sales",
      title: "Total Sales",
      icon: ShoppingBag,
      color: "text-amber-600",
      bg: "bg-amber-50",
      format: (v) => formatLKR(v),
    },
    {
      key: "orders",
      title: "Total Orders",
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
      format: (v) => v.toLocaleString(),
    },
    {
      key: "customers",
      title: "New Customers",
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      format: (v) => v.toLocaleString(),
    },
  ];

  if (loading) {
    return (
      <>
        {cards.map((c) => (
          <CardShell key={c.key}>
            <Skeleton className="mb-3 h-9 w-9" />
            <Skeleton className="mb-2 h-7 w-32" />
            <Skeleton className="h-4 w-20" />
          </CardShell>
        ))}
      </>
    );
  }

  return (
    <>
      {cards.map((card) => {
        const Icon = card.icon;
        const stat = data?.[card.key] || { current: 0, change: 0 };
        const positive = stat.change >= 0;

        return (
          <CardShell key={card.key} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className={`rounded-xl p-2 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {positive ? "+" : ""}{stat.change}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{card.format(stat.current)}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-400">{card.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">vs last week</p>
            </div>
          </CardShell>
        );
      })}
    </>
  );
}

// ─── Row 1: Top Categories Donut ──────────────────────────────────────────────
function TopCategoriesCard() {
  const { data, loading } = useFetch(() => api.getDashboardTopCategoriesDonut(8));

  const total = data?.reduce((s, d) => s + d.value, 0) || 0;

  const renderCenter = ({ cx, cy }) => (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" fontSize="11" fill="#94a3b8">Revenue</tspan>
      <tspan x={cx} dy="18" fontSize="13" fontWeight="700" fill="#1e293b">{formatLKR(total)}</tspan>
    </text>
  );

  return (
    <CardShell className="flex flex-col">
      <CardHeader title="Top Categories" subtitle="Revenue from paid orders" />

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <Skeleton className="h-36 w-36 rounded-full" />
        </div>
      ) : !data?.length ? (
        <EmptyState label="No category data yet" />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  dataKey="value"
                  paddingAngle={2}
                  label={renderCenter}
                  labelLine={false}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatLKR(v), "Revenue"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full space-y-1.5">
            {data.slice(0, 5).map((item, i) => (
              <li key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-slate-700 font-medium">{item.name}</span>
                </span>
                <span className="text-slate-500">{formatLKR(item.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardShell>
  );
}

// ─── Row 2: Revenue Analytics Chart ──────────────────────────────────────────
const RANGES = [
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "3 Months", value: "90" },
  { label: "Custom", value: "custom" },
];

function RevenueChartCard() {
  const [range, setRange] = useState("7");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchParams = range === "custom"
    ? { dateFrom, dateTo }
    : { range };

  const { data, loading } = useFetch(
    () => {
      if (range === "custom" && (!dateFrom || !dateTo)) return Promise.resolve([]);
      return api.getDashboardRevenueChart(fetchParams);
    },
    [range, range === "custom" ? dateFrom : null, range === "custom" ? dateTo : null],
  );

  const maxRevenue = Math.max(...(data || []).map((d) => d.revenue), 1);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg text-xs">
        <p className="mb-1.5 font-semibold text-slate-700">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === "revenue" ? formatLKR(p.value) : `${p.value} orders`}
          </p>
        ))}
      </div>
    );
  };

  const tickDate = (d) => {
    const parts = d.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <CardShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Revenue Analytics</h2>
          <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 rounded-full bg-amber-500" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 rounded" style={{ background: "repeating-linear-gradient(90deg,#94a3b8 0,#94a3b8 4px,transparent 4px,transparent 6px)" }} />
              Orders
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setRange(r.value);
                setShowDatePicker(r.value === "custom");
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                range === r.value
                  ? "bg-amber-600 text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {showDatePicker && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      {loading ? (
        <Skeleton className="h-52 w-full" />
      ) : !data?.length ? (
        <EmptyState label="No revenue data for this period" />
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AMBER} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={tickDate}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(Math.floor((data?.length || 1) / 8) - 1, 0)}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={38}
                domain={[0, maxRevenue * 1.2]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke={AMBER}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: AMBER }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 3, fill: "#94a3b8" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

// ─── Row 2: Monthly Target Gauge ──────────────────────────────────────────────
function MonthlyTargetCard() {
  const { data, loading, reload } = useFetch(() => api.getDashboardMonthlyTarget());
  const [showModal, setShowModal] = useState(false);

  const percent = data?.percent ?? 0;
  const label =
    percent >= 80 ? "Great Progress! 🎉" : percent >= 50 ? "On Track 💪" : "Keep Pushing! 🚀";

  const gaugeData = [
    { value: percent },
    { value: Math.max(0, 100 - percent) },
  ];

  const handleSaveTarget = async (value) => {
    await api.updateAdminSettings({ monthlyTarget: value });
    reload();
  };

  return (
    <CardShell className="flex flex-col">
      <CardHeader
        title="Monthly Target"
        subtitle={new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
        right={
          <ThreeDotMenu
            options={[{ label: "Set Target", onClick: () => setShowModal(true) }]}
          />
        }
      />

      {loading ? (
        <div className="flex flex-1 flex-col items-center gap-3 py-4">
          <Skeleton className="h-32 w-32 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center">
          <div className="relative h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="88%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={1}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill={AMBER} />
                  <Cell fill="#f1f5f9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{percent}%</p>
              </div>
            </div>
          </div>

          <p className="mt-1 text-sm font-semibold text-amber-600">{label}</p>
          <p className="mt-1 text-xs text-slate-400">
            Our target is {formatLKR(data?.target || 0)} / month
          </p>

          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
              <p className="text-[10px] text-slate-400">Revenue</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{formatLKR(data?.revenue || 0)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center">
              <p className="text-[10px] text-slate-400">Target</p>
              <p className="mt-0.5 text-sm font-bold text-amber-700">{formatLKR(data?.target || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <SettingModal
          title="Set Monthly Target"
          label="Enter the monthly revenue target in LKR"
          currentValue={data?.target}
          onSave={handleSaveTarget}
          onClose={() => setShowModal(false)}
        />
      )}
    </CardShell>
  );
}

// ─── Row 3: Conversion Funnel ─────────────────────────────────────────────────
function ConversionFunnelCard() {
  const { data, loading } = useFetch(() => api.getDashboardConversionFunnel());

  const maxCount = Math.max(...(data || []).map((d) => d.count), 1);

  const CustomBarLabel = ({ x, y, width, value, index }) => {
    const item = data?.[index];
    if (!item) return null;
    return (
      <text x={x + width + 8} y={y + 9} fontSize={10} fill="#94a3b8" dominantBaseline="middle">
        {item.fromPrev !== null ? `${item.fromPrev}%` : ""}
      </text>
    );
  };

  return (
    <CardShell className="flex flex-col">
      <CardHeader title="Conversion Rate" subtitle="All-time funnel stages" />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-7 w-full" />)}
        </div>
      ) : !data?.length ? (
        <EmptyState label="No activity data yet" />
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 2, right: 50, left: 0, bottom: 2 }}
              barSize={14}
            >
              <XAxis
                type="number"
                domain={[0, maxCount]}
                hide
              />
              <YAxis
                type="category"
                dataKey="stage"
                width={90}
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v, _name, props) => [
                  `${v.toLocaleString()} (${props.payload?.rate ?? 0}% of views)`,
                  "Count",
                ]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px" }}
              />
              <Bar dataKey="count" fill={AMBER} radius={[0, 6, 6, 0]}>
                <LabelList content={<CustomBarLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

// ─── Row 3: Top Products ──────────────────────────────────────────────────────
function TopProductsCard() {
  const [limit, setLimit] = useState(5);
  const { data, loading } = useFetch(() => api.getDashboardTopProducts(limit), [limit]);

  return (
    <CardShell className="flex flex-col">
      <CardHeader
        title="Top Products"
        subtitle="By total purchases"
        right={
          <ThreeDotMenu
            options={[5, 10, 20].map((n) => ({
              label: `Top ${n}`,
              onClick: () => setLimit(n),
            }))}
          />
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState label="No product data yet" />
      ) : (
        <div className="max-h-52 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="space-y-2.5">
            {data.map((p, i) => (
              <li key={p._id} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                  {i + 1}
                </span>
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                    <Package className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{p.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-900">{p.purchases ?? 0}</p>
                  <p className="text-[10px] text-slate-400">sales</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardShell>
  );
}

// ─── Row 3: Low Stock Alert ───────────────────────────────────────────────────
function LowStockCard() {
  const { data, loading, reload } = useFetch(() => api.getDashboardLowStock());
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const threshold = data?.threshold ?? 10;

  const handleSaveThreshold = async (value) => {
    await api.updateAdminSettings({ lowStockThreshold: value });
    reload();
  };

  return (
    <CardShell className="flex flex-col">
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Low Stock Alerts
          </span>
        }
        subtitle={`Stock ≤ ${threshold} units`}
        right={
          <ThreeDotMenu
            options={[{ label: "Set Threshold", onClick: () => setShowModal(true) }]}
          />
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          ))}
        </div>
      ) : !data?.products?.length ? (
        <EmptyState label="All products are well stocked" />
      ) : (
        <div className="max-h-52 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="space-y-2.5">
            {data.products.map((p) => (
              <li
                key={p._id}
                onClick={() => navigate(`/admin/products/edit/${p._id}`)}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-slate-50"
              >
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                    <Package className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{p.category}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                  p.stock <= 5 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {p.stock}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && (
        <SettingModal
          title="Set Low Stock Threshold"
          label="Products with stock at or below this number will appear here"
          unit=""
          currentValue={threshold}
          onSave={handleSaveThreshold}
          onClose={() => setShowModal(false)}
        />
      )}
    </CardShell>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  return (
    <div className="space-y-5">
      {/* Row 1: KPI cards + Donut */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:col-span-3">
          <WeeklyStatCards />
        </div>
        <TopCategoriesCard />
      </div>

      {/* Row 2: Revenue chart + Monthly target */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[3fr_2fr]">
        <RevenueChartCard />
        <MonthlyTargetCard />
      </div>

      {/* Row 3: Conversion + Top Products + Low Stock */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ConversionFunnelCard />
        <TopProductsCard />
        <LowStockCard />
      </div>
    </div>
  );
}
