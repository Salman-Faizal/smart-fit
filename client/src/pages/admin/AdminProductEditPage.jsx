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

  useEffect(() => {
    const loadWithoutIncrementingViews = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts({ limit: 1000, page: 1 });
        const selected = (data.products || []).find((item) => item._id === id);

        if (!selected) {
          throw new Error("Product not found in admin listing");
        }

        setProduct(selected);
      } catch (err) {
        setError(err.message || "Unable to load product");
      } finally {
        setLoading(false);
      }
    };

    loadWithoutIncrementingViews();
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

  if (loading) return <LoadingState label="Loading admin product details..." />;
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

      <ProductForm
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        loading={submitting}
        defaultValues={{
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          description: product.description || "",
        }}
      />
    </section>
  );
}
