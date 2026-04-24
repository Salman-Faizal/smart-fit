import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { jsPDF } from "jspdf";
import {
  ChevronDown, ChevronUp, Download, Filter,
  TrendingUp, ShoppingCart, DollarSign, XCircle,
  Users, Package, AlertTriangle, BarChart2,
} from "lucide-react";
import { api } from "../../lib/api";
import { formatLKR } from "../../lib/formatLKR";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 3 Months", days: 90 },
  { label: "Last 6 Months", days: 180 },
  { label: "This Year", days: 365 },
  { label: "Custom", days: null },
];

const DONUT_COLORS = ["#d97706", "#f59e0b", "#fbbf24", "#b45309", "#92400e", "#f97316", "#ea580c", "#78350f"];
const AMBER = "#d97706";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

const fmtChange = (n) => {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n}%`;
};

const changeColor = (n) => (n >= 0 ? "text-green-600" : "text-red-500");

const sortRows = (rows, col, dir) => {
  if (!col) return rows;
  return [...rows].sort((a, b) => {
    const av = a[col];
    const bv = b[col];
    if (typeof av === "number") return dir === "asc" ? av - bv : bv - av;
    return dir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });
};

const buildParams = ({ preset, dateFrom, dateTo, selectedCategories }) => {
  const p = {};
  if (preset?.days) {
    p.rangeDays = preset.days;
  } else {
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
  }
  if (selectedCategories.length) {
    p.categories = selectedCategories.join(",");
  }
  return p;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ h = "h-4", w = "w-full", className = "" }) => (
  <div className={`animate-pulse rounded bg-slate-200 ${h} ${w} ${className}`} />
);

// ─── Section Card ─────────────────────────────────────────────────────────────

const Section = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 text-amber-600" />}
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && <div className="px-6 pb-6 pt-1">{children}</div>}
    </div>
  );
};

// ─── Sortable Table ───────────────────────────────────────────────────────────

const SortableTable = ({ columns, rows, loading, emptyMsg = "No data for selected filters." }) => {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const sorted = sortRows(rows || [], sortCol, sortDir);

  if (loading) {
    return (
      <div className="space-y-2 mt-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} h="h-8" />)}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <p className="mt-4 text-center text-sm text-slate-400">{emptyMsg}</p>;
  }

  return (
    <div className="overflow-x-auto mt-3">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="py-2 pr-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
              >
                {col.label}
                {sortCol === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="py-2.5 pr-4 text-slate-700 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Category Multi-Select ────────────────────────────────────────────────────

const CategorySelect = ({ categories, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (cat) => {
    onChange(selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-400 transition-colors min-w-[140px]"
      >
        <Filter className="h-3.5 w-3.5 text-slate-400" />
        {selected.length === 0 ? "All Categories" : `${selected.length} selected`}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-auto" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-48 w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {categories.map((cat) => (
            <label key={cat} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.includes(cat)}
                onChange={() => toggle(cat)}
                className="accent-amber-600"
              />
              <span>{cat}</span>
            </label>
          ))}
          {categories.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No categories</p>}
        </div>
      )}
    </div>
  );
};

// ─── Export Dropdown ──────────────────────────────────────────────────────────

const ExportDropdown = ({ onCsv, onPdf }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        Download Report
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          <button onClick={() => { onCsv(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Export as CSV</button>
          <button onClick={() => { onPdf(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Export as PDF</button>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const navigate = useNavigate();

  // ── Filters ──
  const [preset, setPreset] = useState(PRESETS[1]); // Last 30 Days default
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState({ preset: PRESETS[1], dateFrom: "", dateTo: "", selectedCategories: [] });

  // ── Data ──
  const [salesSummary, setSalesSummary] = useState(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [catPerf, setCatPerf] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [customerInsights, setCustomerInsights] = useState(null);
  const [lowStock, setLowStock] = useState(null);

  // ── Loading ──
  const [loading, setLoading] = useState({
    sales: true, revenue: true, products: true,
    cat: true, status: true, customers: true, lowstock: true,
  });

  // Load categories once
  useEffect(() => {
    api.getAdminCategories()
      .then((d) => setAllCategories((d.categories || []).map((c) => c.name)))
      .catch(() => {});
  }, []);

  const fetchAll = useCallback(async (filters) => {
    const params = buildParams(filters);
    const set = (key) => (val) => {
      setLoading((prev) => ({ ...prev, [key]: false }));
      return val;
    };

    setLoading({ sales: true, revenue: true, products: true, cat: true, status: true, customers: true, lowstock: true });

    await Promise.allSettled([
      api.getReportSalesSummary(params).then((d) => { setSalesSummary(d); set("sales")(d); }).catch(() => { setSalesSummary(null); set("sales")(null); }),
      api.getReportRevenueBreakdown(params).then((d) => { setRevenueBreakdown(d); set("revenue")(d); }).catch(() => { setRevenueBreakdown([]); set("revenue")([]); }),
      api.getReportTopProducts({ ...params, limit: 20 }).then((d) => { setTopProducts(d); set("products")(d); }).catch(() => { setTopProducts([]); set("products")([]); }),
      api.getReportCategoryPerformance(params).then((d) => { setCatPerf(d); set("cat")(d); }).catch(() => { setCatPerf([]); set("cat")([]); }),
      api.getReportOrderStatus(params).then((d) => { setOrderStatus(d); set("status")(d); }).catch(() => { setOrderStatus([]); set("status")([]); }),
      api.getReportCustomerInsights(params).then((d) => { setCustomerInsights(d); set("customers")(d); }).catch(() => { setCustomerInsights(null); set("customers")(null); }),
      api.getReportLowStockSnapshot().then((d) => { setLowStock(d); set("lowstock")(d); }).catch(() => { setLowStock(null); set("lowstock")(null); }),
    ]);

    setLoading({ sales: false, revenue: false, products: false, cat: false, status: false, customers: false, lowstock: false });
  }, []);

  useEffect(() => {
    fetchAll(appliedFilters);
  }, []);

  const applyFilters = () => {
    const filters = { preset, dateFrom, dateTo, selectedCategories };
    setAppliedFilters(filters);
    fetchAll(filters);
  };

  // ── Label for current filter ──
  const filterLabel = () => {
    if (preset?.label === "Custom") {
      return dateFrom && dateTo ? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}` : "Custom range";
    }
    return preset?.label || "Last 30 Days";
  };

  // ── CSV Export ──
  const exportCsv = () => {
    const sections = [];

    sections.push("=== SALES SUMMARY ===");
    if (salesSummary) {
      sections.push("Metric,Current,Previous,Change");
      sections.push(`Total Revenue,${salesSummary.totalRevenue?.current ?? ""},${salesSummary.totalRevenue?.previous ?? ""},${salesSummary.totalRevenue?.change ?? ""}%`);
      sections.push(`Total Orders,${salesSummary.totalOrders?.current ?? ""},${salesSummary.totalOrders?.previous ?? ""},${salesSummary.totalOrders?.change ?? ""}%`);
      sections.push(`Avg Order Value,${salesSummary.avgOrderValue?.current ?? ""},${salesSummary.avgOrderValue?.previous ?? ""},${salesSummary.avgOrderValue?.change ?? ""}%`);
      sections.push(`Cancelled,${salesSummary.cancelled?.current ?? ""},${salesSummary.cancelled?.previous ?? ""},${salesSummary.cancelled?.change ?? ""}%`);
    }

    sections.push("", "=== REVENUE BREAKDOWN ===");
    sections.push("Date,Orders,Revenue (LKR),Avg Order Value (LKR)");
    (revenueBreakdown || []).forEach((r) => sections.push(`${r.date},${r.orders},${r.revenue},${r.avgOrderValue}`));

    sections.push("", "=== TOP PERFORMING PRODUCTS ===");
    sections.push("Rank,Product,Category,Units Sold,Revenue (LKR)");
    (topProducts || []).forEach((r) => sections.push(`${r.rank},"${r.name}",${r.category},${r.unitsSold},${r.revenue}`));

    sections.push("", "=== CATEGORY PERFORMANCE ===");
    sections.push("Category,Products,Units Sold,Revenue (LKR),% of Total");
    (catPerf || []).forEach((r) => sections.push(`${r.name},${r.productCount},${r.unitsSold},${r.revenue},${r.pctOfTotal}%`));

    sections.push("", "=== ORDER STATUS BREAKDOWN ===");
    sections.push("Status,Count,% of Total");
    (orderStatus || []).forEach((r) => sections.push(`${r.label},${r.count},${r.pct}%`));

    sections.push("", "=== CUSTOMER INSIGHTS ===");
    if (customerInsights) {
      sections.push(`New Customers,${customerInsights.newCustomers}`);
      sections.push(`Returning Customers,${customerInsights.returningCustomers}`);
      sections.push("", "Top 5 Customers by Spend");
      sections.push("Name,Orders,Total Spent (LKR)");
      (customerInsights.topSpenders || []).forEach((c) => sections.push(`"${c.name}",${c.orderCount},${c.totalSpent}`));
    }

    sections.push("", "=== LOW STOCK SNAPSHOT ===");
    sections.push("Product,Category,Stock");
    (lowStock?.products || []).forEach((p) => sections.push(`"${p.name}",${p.category},${p.stock}`));

    const blob = new Blob([sections.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-fit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── PDF Export ──
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 18;
    let y = margin;
    let page = 1;

    const addPage = () => {
      doc.addPage();
      page++;
      y = margin;
      footer();
    };

    const checkY = (needed = 10) => { if (y + needed > H - 20) addPage(); };

    const footer = () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Smart Fit — Business Report`, margin, H - 10);
      doc.text(`Page ${page}`, W - margin, H - 10, { align: "right" });
      doc.setTextColor(30);
    };

    // Header
    doc.setFillColor(217, 119, 6);
    doc.rect(0, 0, W, 22, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Smart Fit — Business Report", margin, 13);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${filterLabel()}  |  Generated: ${new Date().toLocaleString("en-LK")}`, margin, 19);
    doc.setTextColor(30);
    y = 32;

    if (selectedCategories.length) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Category filter: ${selectedCategories.join(", ")}`, margin, y);
      y += 6;
      doc.setTextColor(30);
    }

    footer();

    const sectionTitle = (title) => {
      checkY(14);
      doc.setFillColor(245, 246, 247);
      doc.rect(margin - 2, y - 1, W - margin * 2 + 4, 8, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, y + 5);
      doc.setFont("helvetica", "normal");
      y += 12;
    };

    const tableHeader = (cols, colWidths) => {
      checkY(8);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, y, W - margin * 2, 6, "F");
      let x = margin + 1;
      cols.forEach((col, i) => {
        doc.text(String(col), x, y + 4.5);
        x += colWidths[i];
      });
      doc.setFont("helvetica", "normal");
      y += 7;
    };

    const tableRow = (vals, colWidths, shade) => {
      checkY(6);
      if (shade) { doc.setFillColor(250, 250, 250); doc.rect(margin, y, W - margin * 2, 6, "F"); }
      doc.setFontSize(7.5);
      let x = margin + 1;
      vals.forEach((v, i) => {
        const txt = String(v ?? "—").substring(0, 40);
        doc.text(txt, x, y + 4.5);
        x += colWidths[i];
      });
      y += 6.5;
    };

    // 1. Sales Summary
    sectionTitle("1. Sales Summary");
    tableHeader(["Metric", "Current", "Previous", "Change"], [70, 35, 35, 30]);
    const summaryRows = salesSummary ? [
      ["Total Revenue (LKR)", formatLKR(salesSummary.totalRevenue?.current), formatLKR(salesSummary.totalRevenue?.previous), fmtChange(salesSummary.totalRevenue?.change ?? 0)],
      ["Total Orders", salesSummary.totalOrders?.current, salesSummary.totalOrders?.previous, fmtChange(salesSummary.totalOrders?.change ?? 0)],
      ["Avg Order Value (LKR)", formatLKR(salesSummary.avgOrderValue?.current), formatLKR(salesSummary.avgOrderValue?.previous), fmtChange(salesSummary.avgOrderValue?.change ?? 0)],
      ["Cancelled Orders", salesSummary.cancelled?.current, salesSummary.cancelled?.previous, fmtChange(salesSummary.cancelled?.change ?? 0)],
    ] : [["No data", "", "", ""]];
    summaryRows.forEach((r, i) => tableRow(r, [70, 35, 35, 30], i % 2 === 0));
    y += 4;

    // 2. Revenue Breakdown (table only)
    sectionTitle("2. Revenue Breakdown (Daily)");
    tableHeader(["Date", "Orders", "Revenue (LKR)", "Avg Order Value (LKR)"], [38, 25, 55, 55]);
    (revenueBreakdown || []).forEach((r, i) => tableRow([r.date, r.orders, formatLKR(r.revenue), formatLKR(r.avgOrderValue)], [38, 25, 55, 55], i % 2 === 0));
    if (!revenueBreakdown?.length) tableRow(["No data", "", "", ""], [38, 25, 55, 55], false);
    y += 4;

    // 3. Top Products
    sectionTitle("3. Top Performing Products");
    tableHeader(["Rank", "Product", "Category", "Units Sold", "Revenue (LKR)"], [15, 65, 35, 25, 35]);
    (topProducts || []).forEach((r, i) => tableRow([r.rank, r.name, r.category, r.unitsSold, formatLKR(r.revenue)], [15, 65, 35, 25, 35], i % 2 === 0));
    if (!topProducts?.length) tableRow(["No data", "", "", "", ""], [15, 65, 35, 25, 35], false);
    y += 4;

    // 4. Category Performance
    sectionTitle("4. Category Performance");
    tableHeader(["Category", "Products", "Units Sold", "Revenue (LKR)", "% of Total"], [45, 22, 25, 45, 25]);
    (catPerf || []).forEach((r, i) => tableRow([r.name, r.productCount, r.unitsSold, formatLKR(r.revenue), `${r.pctOfTotal}%`], [45, 22, 25, 45, 25], i % 2 === 0));
    if (!catPerf?.length) tableRow(["No data", "", "", "", ""], [45, 22, 25, 45, 25], false);
    y += 4;

    // 5. Order Status
    sectionTitle("5. Order Status Breakdown");
    tableHeader(["Status", "Count", "% of Total"], [70, 35, 35]);
    (orderStatus || []).forEach((r, i) => tableRow([r.label, r.count, `${r.pct}%`], [70, 35, 35], i % 2 === 0));
    if (!orderStatus?.length) tableRow(["No data", "", ""], [70, 35, 35], false);
    y += 4;

    // 6. Customer Insights
    sectionTitle("6. Customer Insights");
    if (customerInsights) {
      checkY(12);
      doc.setFontSize(8);
      doc.text(`New Customers: ${customerInsights.newCustomers}`, margin, y);
      y += 5;
      doc.text(`Returning Customers: ${customerInsights.returningCustomers}`, margin, y);
      y += 8;
      tableHeader(["Name", "Orders", "Total Spent (LKR)"], [90, 25, 55]);
      (customerInsights.topSpenders || []).forEach((c, i) => tableRow([c.name, c.orderCount, formatLKR(c.totalSpent)], [90, 25, 55], i % 2 === 0));
    } else {
      tableRow(["No data", "", ""], [90, 25, 55], false);
    }
    y += 4;

    // 7. Low Stock
    sectionTitle("7. Low Stock Snapshot");
    if (lowStock) {
      checkY(6);
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text(`Snapshot as of ${new Date(lowStock.asOf || Date.now()).toLocaleString("en-LK")}  |  Threshold: ${lowStock.threshold} units`, margin, y);
      doc.setTextColor(30);
      y += 6;
    }
    tableHeader(["Product", "Category", "Stock"], [90, 55, 30]);
    (lowStock?.products || []).forEach((p, i) => tableRow([p.name, p.category, p.stock], [90, 55, 30], i % 2 === 0));
    if (!lowStock?.products?.length) tableRow(["No low-stock products", "", ""], [90, 55, 30], false);

    doc.save(`smart-fit-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <ExportDropdown onCsv={exportCsv} onPdf={exportPdf} />
      </div>

      {/* Global Filters */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Preset buttons */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Date Range</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    preset?.label === p.label
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date pickers */}
          {preset?.label === "Custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500"
              />
              <span className="text-slate-400 text-sm">–</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Category filter */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Category</p>
            <CategorySelect
              categories={allCategories}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>

          {/* Apply */}
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* 1. Sales Summary */}
      <Section title="Sales Summary" icon={DollarSign}>
        {loading.sales ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-slate-100 p-4 space-y-2"><Skeleton h="h-3" w="w-1/2" /><Skeleton h="h-6" w="w-3/4" /><Skeleton h="h-3" w="w-1/3" /></div>)}
          </div>
        ) : !salesSummary ? (
          <p className="text-center text-sm text-slate-400 mt-2">No data for selected filters.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Revenue", icon: TrendingUp, data: salesSummary.totalRevenue, format: formatLKR },
              { label: "Total Orders", icon: ShoppingCart, data: salesSummary.totalOrders, format: (v) => v?.toLocaleString() },
              { label: "Avg Order Value", icon: DollarSign, data: salesSummary.avgOrderValue, format: formatLKR },
              { label: "Cancelled / Refunded", icon: XCircle, data: salesSummary.cancelled, format: (v) => v?.toLocaleString() },
            ].map(({ label, icon: Icon, data, format }) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <Icon className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <p className="text-xl font-bold text-slate-900">{format(data?.current ?? 0)}</p>
                <p className={`text-xs mt-0.5 font-medium ${changeColor(data?.change ?? 0)}`}>
                  {fmtChange(data?.change ?? 0)} vs prior period
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 2. Revenue Breakdown */}
      <Section title="Revenue Breakdown" icon={BarChart2}>
        {loading.revenue ? (
          <><Skeleton h="h-48" className="mb-4" /><Skeleton h="h-8" /><Skeleton h="h-8" className="mt-1" /></>
        ) : !revenueBreakdown?.length ? (
          <p className="text-center text-sm text-slate-400 mt-2">No revenue data for selected filters.</p>
        ) : (
          <>
            <div className="h-52 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueBreakdown} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `LKR ${(v / 1000).toFixed(0)}k`} width={70} />
                  <Tooltip formatter={(v, name) => [name === "revenue" ? formatLKR(v) : v, name === "revenue" ? "Revenue" : "Orders"]} labelFormatter={fmtDate} />
                  <Line type="monotone" dataKey="revenue" stroke={AMBER} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <SortableTable
              rows={revenueBreakdown}
              columns={[
                { key: "date", label: "Date", render: fmtDate },
                { key: "orders", label: "Orders" },
                { key: "revenue", label: "Revenue (LKR)", render: formatLKR },
                { key: "avgOrderValue", label: "Avg Order Value", render: formatLKR },
              ]}
            />
          </>
        )}
      </Section>

      {/* 3. Top Performing Products */}
      <Section title="Top Performing Products" icon={TrendingUp}>
        <SortableTable
          loading={loading.products}
          rows={topProducts}
          columns={[
            { key: "rank", label: "#" },
            { key: "name", label: "Product" },
            { key: "category", label: "Category" },
            { key: "unitsSold", label: "Units Sold" },
            { key: "revenue", label: "Revenue (LKR)", render: formatLKR },
          ]}
          emptyMsg="No product sales for selected filters."
        />
      </Section>

      {/* 4. Category Performance */}
      <Section title="Category Performance" icon={BarChart2}>
        {loading.cat ? (
          <Skeleton h="h-48" />
        ) : !catPerf?.length ? (
          <p className="text-center text-sm text-slate-400 mt-2">No category data.</p>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Donut */}
            <div className="flex-shrink-0 flex justify-center">
              <div style={{ width: 220, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catPerf} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {catPerf.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatLKR(v)} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Table */}
            <div className="flex-1 overflow-x-auto">
              <SortableTable
                rows={catPerf}
                columns={[
                  { key: "name", label: "Category" },
                  { key: "productCount", label: "Products" },
                  { key: "unitsSold", label: "Units Sold" },
                  { key: "revenue", label: "Revenue (LKR)", render: formatLKR },
                  { key: "pctOfTotal", label: "% of Total", render: (v) => `${v}%` },
                ]}
              />
            </div>
          </div>
        )}
      </Section>

      {/* 5. Order Status Breakdown */}
      <Section title="Order Status Breakdown" icon={ShoppingCart}>
        {loading.status ? (
          <Skeleton h="h-48" />
        ) : !orderStatus?.length ? (
          <p className="text-center text-sm text-slate-400 mt-2">No order data for selected filters.</p>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="h-52 flex-1 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderStatus} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, name) => [v, name === "count" ? "Orders" : name]} />
                  <Bar dataKey="count" fill={AMBER} radius={[0, 4, 4, 0]} minPointSize={3} label={{ position: "right", fontSize: 10, formatter: (v) => v || "" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-52 mt-2">
              {orderStatus.map((r) => (
                <div key={r.status} className="flex justify-between border-b border-slate-50 py-1.5 text-sm">
                  <span className="text-slate-600">{r.label}</span>
                  <span className="font-semibold text-slate-800">{r.count} <span className="text-xs text-slate-400">({r.pct}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* 6. Customer Insights */}
      <Section title="Customer Insights" icon={Users}>
        {loading.customers ? (
          <><div className="grid grid-cols-2 gap-4 mb-4"><Skeleton h="h-16" /><Skeleton h="h-16" /></div><Skeleton h="h-32" /></>
        ) : !customerInsights ? (
          <p className="text-center text-sm text-slate-400 mt-2">No customer data for selected filters.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { label: "New Customers", value: customerInsights.newCustomers, icon: Users },
                { label: "Returning Customers", value: customerInsights.returningCustomers, icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2"><Icon className="h-4 w-4 text-amber-600" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                    <p className="text-xl font-bold text-slate-900">{value?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top 5 Customers by Spend</p>
            <SortableTable
              rows={customerInsights.topSpenders || []}
              columns={[
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "orderCount", label: "Orders" },
                { key: "totalSpent", label: "Total Spent", render: formatLKR },
              ]}
              emptyMsg="No purchase data for selected period."
            />
          </>
        )}
      </Section>

      {/* 7. Low Stock Snapshot */}
      <Section title="Low Stock Snapshot" icon={AlertTriangle}>
        {loading.lowstock ? (
          <Skeleton h="h-32" />
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Snapshot as of {new Date(lowStock?.asOf || Date.now()).toLocaleString("en-LK")}
              {lowStock?.threshold != null && ` · Products at or below ${lowStock.threshold} units`}
            </p>
            <SortableTable
              rows={lowStock?.products || []}
              columns={[
                { key: "name", label: "Product" },
                { key: "category", label: "Category" },
                {
                  key: "stock",
                  label: "Stock",
                  render: (v) => (
                    <span className={`font-semibold ${v === 0 ? "text-red-600" : "text-amber-600"}`}>{v}</span>
                  ),
                },
              ]}
              emptyMsg="No low-stock products at current threshold."
            />
          </>
        )}
      </Section>
    </div>
  );
}
