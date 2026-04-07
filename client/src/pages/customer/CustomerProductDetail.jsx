import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../../components/common/StatusState";
import { api, assetUrl } from "../../lib/api";

export default function CustomerProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const data = await api.getProductById(id);
        setProduct(data);
      } catch (err) {
        setError(err.message || "Unable to fetch product");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (loading) return <LoadingState label="Loading product..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="grid gap-8 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-2 md:p-8">
      <img
        src={
          assetUrl(product.images?.[0]) ||
          "https://placehold.co/900x700?text=Product"
        }
        alt={product.name}
        className="h-80 w-full rounded-2xl object-cover md:h-full"
      />

      <div className="space-y-4">
        <Link
          to="/home"
          className="text-sm font-semibold text-amber-600 hover:underline"
        >
          ← Back to products
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
        <p className="text-sm uppercase tracking-wider text-slate-500">
          {product.category}
        </p>
        <p className="text-3xl font-bold text-amber-600">${product.price}</p>
        <p className="text-slate-600">{product.description}</p>
        <p className="text-sm text-slate-500">
          Stock available: {product.stock}
        </p>

        <button
          type="button"
          className="rounded-md bg-amber-600 px-5 py-2 font-semibold text-white shadow hover:bg-amber-700"
        >
          Add to Cart
        </button>
      </div>
    </section>
  );
}
