import { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../../lib/api";
import { ChevronDown } from "lucide-react";

const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

const initialValues = {
  name: "",
  category: "",
  price: "",
  stock: "",
  description: "",
  sizes: [],
  status: "active",
};

export default function ProductForm({
  onSubmit,
  loading,
  submitLabel,
  defaultValues = initialValues,
  existingImages = [],
  categories = [],
}) {
  const [formData, setFormData] = useState({
    ...initialValues,
    ...defaultValues,
    sizes: Array.isArray(defaultValues.sizes) ? defaultValues.sizes : [],
    status: defaultValues.status || "active",
  });
  const [imageFiles, setImageFiles] = useState([]);
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

  const previewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );

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
    // Send sizes as JSON array string so backend can parse it
    payload.append("sizes", JSON.stringify(sizes || []));
    imageFiles.forEach((file) => payload.append("images", file));

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

      <label className="block text-sm font-medium text-slate-700">
        Images
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(event) =>
            setImageFiles(Array.from(event.target.files || []))
          }
          className="mt-2 block w-full rounded-lg border border-slate-300 p-2 text-sm"
        />
      </label>

      {previewUrls.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {previewUrls.map((previewUrl, index) => (
            <img
              key={`${previewUrl}-${index}`}
              src={previewUrl}
              alt={`new-upload-${index + 1}`}
              className="h-24 w-full rounded-md object-cover bg-slate-100"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500?text=No+Image"; }}
            />
          ))}
        </div>
      ) : existingImages.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {existingImages.map((image, index) => (
            <img
              key={`${image}-${index}`}
              src={assetUrl(image)}
              alt={`existing-${index + 1}`}
              className="h-24 w-full rounded-md object-cover bg-slate-100"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500?text=No+Image"; }}
            />
          ))}
        </div>
      ) : null}

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
