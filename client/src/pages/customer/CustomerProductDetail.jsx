import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../../components/common/StatusState";
import RecommendationSection from "../../components/products/RecommendationSection";
import { api, assetUrl } from "../../lib/api";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

export default function CustomerProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("M");
  const [recommendations, setRecommendations] = useState([]);
  const [alsoViewedRecommendations, setAlsoViewedRecommendations] = useState(
    [],
  );

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api.getProductById(id);
        setProduct(data);
        setQuantity(1);
        const recommendationData = await api.getProductRecommendations(id);
        setRecommendations(recommendationData.recommendations || []);
        const alsoViewedData = await api.getAlsoViewedRecommendations(id);
        setAlsoViewedRecommendations(alsoViewedData.recommendations || []);
      } catch (err) {
        setError(err.message || "Unable to fetch product");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const maxQuantity = useMemo(
    () => Math.max(1, Number(product?.stock || 1)),
    [product?.stock],
  );

  const increaseQty = () => {
    setQuantity((current) => Math.min(current + 1, maxQuantity));
  };

  const decreaseQty = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const handleAddToCart = async () => {
    try {
      setActionMessage("");
      await api.addToCart({ productId: id, quantity });
      setActionMessage(
        `Added ${quantity} item(s), size ${selectedSize}, to cart`,
      );
    } catch (err) {
      setActionMessage(err.message || "Failed to add to cart");
    }
  };

  if (loading) return <LoadingState label="Loading product..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="space-y-8">
      <section className="grid gap-8 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-2 md:p-8">
        <img
          src={
            assetUrl(product.images?.[0]) ||
            "https://placehold.co/900x700?text=Product"
          }
          alt={product.name}
          className="h-80 w-full rounded-2xl object-cover md:h-full"
        />

        <div className="space-y-5">
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

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Size
            </p>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-14 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                    selectedSize === size
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quantity
            </p>
            <div className="inline-flex items-center overflow-hidden rounded-md border border-slate-300">
              <button
                type="button"
                onClick={decreaseQty}
                className="flex h-11 w-12 items-center justify-center border-r border-slate-300 text-xl font-semibold text-slate-700 hover:bg-slate-100"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="flex h-11 min-w-16 items-center justify-center px-5 text-base font-semibold text-slate-800">
                {quantity}
              </span>
              <button
                type="button"
                onClick={increaseQty}
                className="flex h-11 w-12 items-center justify-center border-l border-slate-300 text-xl font-semibold text-slate-700 hover:bg-slate-100"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            type="button"
            className="rounded-md bg-amber-600 px-5 py-2 font-semibold text-white shadow hover:bg-amber-700"
          >
            Add to Cart
          </button>

          {actionMessage ? (
            <p className="text-sm text-slate-600">{actionMessage}</p>
          ) : null}
        </div>
      </section>

      <RecommendationSection
        title="Recommended for You"
        badge="Customers also love"
        products={recommendations}
      />
      <RecommendationSection
        title="Customers also viewed"
        badge="Popular with similar users"
        products={alsoViewedRecommendations}
      />
    </section>
  );
}
