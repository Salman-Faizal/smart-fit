import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductForm from "../../components/products/ProductForm";
import { ErrorState, LoadingState } from "../../components/common/StatusState";
import { api } from "../../lib/api";

export default function AdminProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.getAdminCategories().then((data) => setCategories(data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Use admin endpoint — returns deleted/inactive products too, no view tracking
        const data = await api.getAdminProducts({ limit: 1000, page: 1 });
        const selected = (data.products || []).find((item) => item._id === id);
        if (!selected) throw new Error("Product not found");
        setProduct(selected);
      } catch (err) {
        setError(err.message || "Unable to load product");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      setError("");
      await api.updateProduct(id, payload);
      navigate("/admin/products", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading product details..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="space-y-4">
      <div>
        <Link
          to="/admin/products"
          className="text-sm font-semibold text-amber-600 hover:underline"
        >
          ← Back to products
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Edit Product</h2>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-100 p-3 text-sm text-red-600">{error}</p>
      ) : null}

      <ProductForm
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        loading={submitting}
        existingImages={product.images || []}
        categories={categories}
        defaultValues={{
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          description: product.description || "",
          sizes: product.sizes || [],
          status: product.status || "active",
        }}
      />
    </section>
  );
}
