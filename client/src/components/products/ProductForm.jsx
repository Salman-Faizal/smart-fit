import { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../../lib/api";
import { ChevronDown } from "lucide-react";

const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

const FIT_OPTIONS = ["", "Slim", "Regular", "Relaxed", "Oversized"];
const STYLE_OPTIONS = ["", "Classic", "Streetwear", "Smart Casual", "Minimalist"];
const OCCASION_OPTIONS = ["", "Casual", "Formal", "Night Out", "Active"];
const COLOR_FAMILY_OPTIONS = ["", "Neutrals", "Earth Tones", "Bold & Bright", "Navy & Blues"];

const initialValues = {
  name: "",
  category: "",
  price: "",
  stock: "",
  description: "",
  sizes: [],
  status: "active",
  fit: "",
  style: "",
  occasion: "",
  colorFamily: "",
};

export default function ProductForm({
  onSubmit,
  loading,
  submitLabel,
  defaultValues = initialValues,
  existingPrimaryImage = "",
  existingSecondaryImages = [],
  categories = [],
}) {
  const [formData, setFormData] = useState({
    ...initialValues,
    ...defaultValues,
    sizes: Array.isArray(defaultValues.sizes) ? defaultValues.sizes : [],
    status: defaultValues.status || "active",
    fit: defaultValues.fit || "",
    style: defaultValues.style || "",
    occasion: defaultValues.occasion || "",
    colorFamily: defaultValues.colorFamily || "",
  });
  const [primaryImageFile, setPrimaryImageFile] = useState(null);
  const [primaryImagePreview, setPrimaryImagePreview] = useState(null);
  const [currentPrimaryImage, setCurrentPrimaryImage] = useState(existingPrimaryImage || "");
  const [secondaryImageFiles, setSecondaryImageFiles] = useState([]);
  const [secondaryImagePreviews, setSecondaryImagePreviews] = useState([]);
  const [keepSecondaryImages, setKeepSecondaryImages] = useState(existingSecondaryImages || []);
  const [catQuery, setCatQuery] = useState(defaultValues.category || "");
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef(null);

  const filteredCats = useMemo(() => {
    if (!catQuery.trim()) return categories;
    const q = catQuery.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, catQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) {
        setCatOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePrimaryImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrimaryImageFile(file);
    setPrimaryImagePreview(URL.createObjectURL(file));
    setCurrentPrimaryImage("");
  };

  const handleSecondaryImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSecondaryImageFiles((prev) => [...prev, ...files]);
    setSecondaryImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewSecondary = (idx) => {
    setSecondaryImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setSecondaryImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSize = (size) => {
    setFormData((prev) => {
      const current = prev.sizes || [];
      const next = current.includes(size)
        ? current.filter((s) => s !== size)
        : [...current, size];
      return { ...prev, sizes: next };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = new FormData();
    const { sizes, ...rest } = formData;
    Object.entries(rest).forEach(([key, value]) =>
      payload.append(key, value ?? ""),
    );
    payload.append("sizes", JSON.stringify(sizes || []));

    if (primaryImageFile) {
      payload.append("primaryImage", primaryImageFile);
    } else if (!currentPrimaryImage) {
      payload.append("clearPrimaryImage", "true");
    }
    secondaryImageFiles.forEach((file) => payload.append("secondaryImages", file));
    payload.append("keepSecondaryImages", JSON.stringify(keepSecondaryImages));

    onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        {/* Category searchable dropdown */}
        <div ref={catRef} className="relative">
          <label className="block text-sm font-medium text-slate-700">
            Category
            <div className="relative mt-2">
              <input
                value={catQuery}
                onChange={(e) => {
                  setCatQuery(e.target.value);
                  setFormData((prev) => ({ ...prev, category: e.target.value }));
                  setCatOpen(true);
                }}
                onFocus={() => setCatOpen(true)}
                required
                placeholder="Select or type category"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-8 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
          {catOpen && filteredCats.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filteredCats.map((c) => (
                <li
                  key={c._id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setCatQuery(c.name);
                    setFormData((prev) => ({ ...prev, category: c.name }));
                    setCatOpen(false);
                  }}
                  className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                >
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Input
          label="Price"
          name="price"
          type="number"
          min="0"
          value={formData.price}
          onChange={handleChange}
          required
        />
        <Input
          label="Stock"
          name="stock"
          type="number"
          min="0"
          value={formData.stock}
          onChange={handleChange}
          required
        />
      </div>

      {/* Sizes */}
      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">
          Available Sizes
        </span>
        <div className="flex flex-wrap gap-2">
          {ALL_SIZES.map((size) => {
            const selected = (formData.sizes || []).includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  selected
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-amber-400"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status toggle */}
      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">
          Status
        </span>
        <div className="flex gap-3">
          {["active", "inactive"].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, status: val }))}
              className={`rounded-lg border px-5 py-1.5 text-sm font-semibold capitalize transition-colors ${
                formData.status === val
                  ? val === "active"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-500 bg-slate-500 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {val === "active" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Description
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="mt-2 h-32 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          placeholder="Write product details"
        />
      </label>

      {/* Style Attributes */}
      <div>
        <span className="block text-sm font-medium text-slate-700 mb-1">
          Style Attributes <span className="text-xs font-normal text-slate-400">— Optional, improves quiz matching</span>
        </span>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Fit", name: "fit", options: FIT_OPTIONS },
            { label: "Style", name: "style", options: STYLE_OPTIONS },
            { label: "Occasion", name: "occasion", options: OCCASION_OPTIONS },
            { label: "Color Family", name: "colorFamily", options: COLOR_FAMILY_OPTIONS },
          ].map(({ label, name, options }) => (
            <label key={name} className="block text-xs font-medium text-slate-500">
              {label}
              <select
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              >
                {options.map((o) => (
                  <option key={o} value={o}>{o || "— None —"}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* Primary Image */}
      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">Primary Image <span className="text-red-500">*</span></span>
        {primaryImagePreview ? (
          <div className="relative inline-block">
            <img src={primaryImagePreview} alt="primary preview" className="h-28 w-28 rounded-xl object-cover bg-slate-100" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500?text=No+Image"; }} />
            <button type="button" onClick={() => { setPrimaryImageFile(null); setPrimaryImagePreview(null); }} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">×</button>
          </div>
        ) : currentPrimaryImage ? (
          <div className="relative inline-block">
            <img src={assetUrl(currentPrimaryImage)} alt="primary" className="h-28 w-28 rounded-xl object-cover bg-slate-100" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500?text=No+Image"; }} />
            <button type="button" onClick={() => setCurrentPrimaryImage("")} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">×</button>
          </div>
        ) : (
          <input type="file" accept="image/*" onChange={handlePrimaryImageChange} className="block w-full rounded-lg border border-slate-300 p-2 text-sm" />
        )}
      </div>

      {/* Secondary Images */}
      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">Secondary Images <span className="text-xs font-normal text-slate-400">(optional)</span></span>
        <div className="flex flex-wrap gap-3 mb-2">
          {keepSecondaryImages.map((url, idx) => (
            <div key={`existing-${idx}`} className="relative">
              <img src={assetUrl(url)} alt={`secondary-${idx + 1}`} className="h-20 w-20 rounded-lg object-cover bg-slate-100" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500?text=No+Image"; }} />
              <button type="button" onClick={() => setKeepSecondaryImages((prev) => prev.filter((_, i) => i !== idx))} className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">×</button>
            </div>
          ))}
          {secondaryImagePreviews.map((src, idx) => (
            <div key={`new-${idx}`} className="relative">
              <img src={src} alt={`new-secondary-${idx + 1}`} className="h-20 w-20 rounded-lg object-cover bg-slate-100" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500?text=No+Image"; }} />
              <button type="button" onClick={() => removeNewSecondary(idx)} className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">×</button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={handleSecondaryImageChange} className="block w-full rounded-lg border border-slate-300 p-2 text-sm" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-amber-600 px-6 py-2.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        {...props}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
      />
    </label>
  );
}
