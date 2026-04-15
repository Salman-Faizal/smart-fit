import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { formatLKR } from "../../lib/formatLKR";
import {
  Plus,
  Search,
  Upload,
  Layers,
  Package,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

const SIZES_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest First" },
  { value: "createdAt_asc", label: "Oldest First" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "price_asc", label: "Price Low-High" },
  { value: "price_desc", label: "Price High-Low" },
  { value: "stock_asc", label: "Stock Low-High" },
  { value: "stock_desc", label: "Stock High-Low" },
];

const SAMPLE_CSV = `Name,Category,Description,Price,Stock,Sizes,Status,ImageURL
Slim Fit Shirt,Shirts,Premium cotton slim fit shirt,2500,50,"S,M,L,XL",active,
Chino Pants,Pants,Classic chino trousers,3200,30,"M,L,XL,XXL",active,`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "smart-fit-products-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = [];
    let inQuote = false;
    let cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur.trim());
    return headers.reduce((obj, h, idx) => {
      obj[h] = values[idx] ?? "";
      return obj;
    }, {});
  });
}

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("createdAt_desc");
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState("");

  // Categories modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editCat, setEditCat] = useState(null);
  const [catError, setCatError] = useState("");

  // Bulk CSV modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvError, setCsvError] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const fileRef = useRef(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);

  const [sortBy, sortDir] = sortKey.split("_");

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getAdminProducts({ page, limit: 20, search, category, stockStatus, status: statusFilter, sortBy, sortDir });
      setProducts(data.products || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
      setSelected(new Set());
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, search, category, stockStatus, statusFilter, sortBy, sortDir]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setCatLoading(true);
    setCatError("");
    try {
      const data = await api.getAdminCategories();
      setCategories(data.categories || []);
    } catch (err) {
      setCatError(err.message);
    } finally {
      setCatLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id) => {
    try {
      await api.adminSoftDeleteProduct(id);
      setDeleteId(null);
      showToast("Product deleted");
      loadProducts();
    } catch (err) {
      showToast(err.message || "Delete failed");
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p._id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    setBulkLoading(true);
    try {
      if (bulkAction === "delete") {
        await Promise.all([...selected].map((id) => api.adminSoftDeleteProduct(id)));
        showToast(`${selected.size} product(s) deleted`);
      } else if (bulkAction === "setActive" || bulkAction === "setInactive") {
        const status = bulkAction === "setActive" ? "active" : "inactive";
        await Promise.all([...selected].map((id) => api.updateProductStatus(id, status)));
        showToast(`${selected.size} product(s) updated`);
      }
      loadProducts();
      setBulkAction("");
    } catch (err) {
      showToast(err.message || "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  };

  // Category modal handlers
  const handleOpenCatModal = () => {
    setShowCatModal(true);
    loadCategories();
  };

  const handleAddCat = async () => {
    setCatError("");
    try {
      await api.createAdminCategory(newCatName);
      setNewCatName("");
      loadCategories();
    } catch (err) {
      setCatError(err.message);
    }
  };

  const handleUpdateCat = async () => {
    setCatError("");
    try {
      await api.updateAdminCategory(editCat._id, editCat.name);
      setEditCat(null);
      loadCategories();
    } catch (err) {
      setCatError(err.message);
    }
  };

  const handleDeleteCat = async (id) => {
    setCatError("");
    try {
      await api.deleteAdminCategory(id);
      loadCategories();
    } catch (err) {
      setCatError(err.message);
    }
  };

  // CSV handlers
  const handleFileChange = (file) => {
    if (!file) return;
    setCsvError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCsv(e.target.result);
        if (!rows.length) throw new Error("No data rows found in file");
        setCsvPreview(rows);
      } catch (err) {
        setCsvError(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvPreview?.length) return;
    setCsvImporting(true);
    try {
      const result = await api.bulkCreateProducts(csvPreview.map((r) => ({
        name: r.name,
        category: r.category,
        description: r.description,
        price: r.price,
        stock: r.stock,
        sizes: r.sizes,
        status: r.status || "active",
        imageUrl: r.imageurl || r.imageUrl || r["imageurl"] || "",
      })));
      showToast(`Imported ${result.created} product(s)${result.errors?.length ? `, ${result.errors.length} error(s)` : ""}`);
      setShowBulkModal(false);
      setCsvPreview(null);
      loadProducts();
    } catch (err) {
      setCsvError(err.message);
    } finally {
      setCsvImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{total} products total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCatModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Layers className="h-4 w-4" />
            Categories
          </button>
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </button>
          <Link
            to="/admin/products/new"
            className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </form>

        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>

        <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">All Stock</option>
          <option value="inStock">In Stock</option>
          <option value="outOfStock">Out of Stock</option>
        </select>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select value={sortKey} onChange={(e) => { setSortKey(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <span className="text-sm font-medium text-amber-800">{selected.size} selected</span>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
            className="rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none">
            <option value="">Bulk Action</option>
            <option value="setActive">Set Active</option>
            <option value="setInactive">Set Inactive</option>
            <option value="delete">Delete Selected</option>
          </select>
          <button
            type="button"
            disabled={!bulkAction || bulkLoading}
            onClick={handleBulkAction}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-700"
          >
            Apply
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-sm text-amber-700 hover:underline">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading products...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">No products found</p>
            <p className="mt-1 text-xs">Try adjusting your filters or add a new product</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr className="text-left text-xs font-medium text-slate-400">
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selected.size === products.length && products.length > 0} onChange={toggleAll}
                      className="h-4 w-4 rounded accent-amber-600" />
                  </th>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((p) => (
                  <tr key={p._id} className={`hover:bg-slate-50 ${selected.has(p._id) ? "bg-amber-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)}
                        className="h-4 w-4 rounded accent-amber-600" />
                    </td>
                    <td className="px-4 py-3">
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="h-10 w-10 rounded-lg object-cover bg-slate-100"
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500?text=No+Image"; }}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px]">
                      <p className="truncate">{p.name}</p>
                      {p.sizes?.length > 0 && (
                        <p className="text-xs text-slate-400">{p.sizes.join(", ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.category}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatLKR(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.stock === 0 ? "bg-red-100 text-red-700" : p.stock < 10 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {p.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/admin/products/edit/${p._id}`}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteId(p._id)}
                          className="rounded-lg border border-red-100 p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
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

      {/* Delete Confirmation */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)} title="Delete Product">
          <p className="text-sm text-slate-600">Are you sure you want to delete this product? This action can be undone by the development team.</p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteId(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => handleDelete(deleteId)}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}

      {/* Categories Modal */}
      {showCatModal && (
        <Modal onClose={() => { setShowCatModal(false); setCatError(""); setEditCat(null); }} title="Manage Categories">
          {catLoading ? <p className="py-4 text-center text-sm text-slate-400">Loading...</p> : (
            <div className="space-y-4">
              {catError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{catError}</p>}
              <div className="flex gap-2">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCat()}
                />
                <button type="button" onClick={handleAddCat}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Add</button>
              </div>
              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                {categories.map((c) => (
                  <li key={c._id} className="flex items-center gap-2 py-2">
                    {editCat?._id === c._id ? (
                      <>
                        <input
                          value={editCat.name}
                          onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                          className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none"
                          autoFocus
                        />
                        <button type="button" onClick={handleUpdateCat}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Save</button>
                        <button type="button" onClick={() => setEditCat(null)}
                          className="rounded-lg border px-3 py-1 text-xs">Cancel</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-slate-800">{c.name}</span>
                        <button type="button" onClick={() => setEditCat(c)}
                          className="rounded-lg border border-slate-200 p-1 text-slate-500 hover:bg-slate-50">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteCat(c._id)}
                          className="rounded-lg border border-red-100 p-1 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
                {categories.length === 0 && <li className="py-4 text-center text-sm text-slate-400">No categories yet</li>}
              </ul>
            </div>
          )}
        </Modal>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <Modal onClose={() => { setShowBulkModal(false); setCsvPreview(null); setCsvError(""); }} title="Bulk Upload Products">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Upload a CSV file to import multiple products at once.</p>
              <button type="button" onClick={downloadSampleCsv}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:underline">
                <Download className="h-3.5 w-3.5" />
                Sample CSV
              </button>
            </div>

            {!csvPreview ? (
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-10 transition hover:border-amber-400 hover:bg-amber-50/30"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0]); }}
              >
                <Upload className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Drop CSV file here or click to browse</p>
                <p className="mt-1 text-xs text-slate-400">.csv files only</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => handleFileChange(e.target.files[0])} />
              </label>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">{csvPreview.length} rows ready to import</p>
                  <button type="button" onClick={() => { setCsvPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="text-xs text-slate-400 hover:text-slate-700">Clear</button>
                </div>
                <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>{Object.keys(csvPreview[0]).map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvPreview.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="max-w-[120px] truncate px-3 py-1.5 text-slate-700">{v}</td>
                          ))}
                        </tr>
                      ))}
                      {csvPreview.length > 5 && (
                        <tr><td colSpan={Object.keys(csvPreview[0]).length} className="px-3 py-2 text-center text-slate-400">
                          +{csvPreview.length - 5} more rows
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {csvError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{csvError}</p>}

            {csvPreview && (
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowBulkModal(false); setCsvPreview(null); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleCsvImport} disabled={csvImporting}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-700">
                  {csvImporting ? "Importing..." : "Import Products"}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
          <button type="button" onClick={() => setToast("")}><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

