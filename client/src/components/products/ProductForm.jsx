import { useMemo, useState } from "react";
import { assetUrl } from "../../lib/api";

const initialValues = {
  name: "",
  category: "",
  price: "",
  stock: "",
  description: "",
};

export default function ProductForm({
  onSubmit,
  loading,
  submitLabel,
  defaultValues = initialValues,
  existingImages = [],
}) {
  const [formData, setFormData] = useState({
    ...initialValues,
    ...defaultValues,
  });
  const [imageFiles, setImageFiles] = useState([]);

  const previewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) =>
      payload.append(key, value ?? ""),
    );
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
        <Input
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        />
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
              className="h-24 w-full rounded-md object-cover"
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
              className="h-24 w-full rounded-md object-cover"
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
