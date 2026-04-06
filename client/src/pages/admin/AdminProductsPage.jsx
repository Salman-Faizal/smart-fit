import { Link } from "react-router-dom";
import ProductCard from "../../components/products/ProductCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/StatusState";
import { useProducts } from "../../hooks/useProducts";
import { api } from "../../lib/api";

export default function AdminProductsPage() {
  const { products, loading, error, setProducts } = useProducts({});

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this product?");
    if (!confirmed) return;

    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((product) => product._id !== id));
    } catch {
      alert("Failed to delete product");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">
            Edit and maintain store products.
          </p>
        </div>

        <Link
          to="/admin/products/new"
          className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white shadow hover:bg-amber-700"
        >
          + Add Product
        </Link>
      </div>

      {loading ? <LoadingState label="Loading products..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create your first product from the button above."
        />
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            to={`/admin/products/edit/${product._id}`}
            footer={
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/products/edit/${product._id}`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(product._id)}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            }
          />
        ))}
      </div>
    </section>
  );
}
