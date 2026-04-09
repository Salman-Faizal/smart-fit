import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "../../components/products/ProductForm";
import { api } from "../../lib/api";

export default function AdminProductCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload) => {
    try {
      setLoading(true);
      setError("");
      await api.createProduct(payload);
      navigate("/admin/products", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Add Product</h2>
      {error ? (
        <p className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <ProductForm
        submitLabel="Create Product"
        onSubmit={handleSubmit}
        loading={loading}
      />
    </section>
  );
}
