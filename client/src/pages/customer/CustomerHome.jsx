import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../components/products/ProductCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/StatusState";
import { useProducts } from "../../hooks/useProducts";

export default function CustomerHome() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const { products, loading, error } = useProducts({ search, category });

  const categories = useMemo(
    () => [
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ],
    [products],
  );

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">
          Smart Fit Store
        </p>
        <h1 className="mt-3 text-4xl font-bold">
          Find your next favorite product
        </h1>
        <p className="mt-2 max-w-2xl text-slate-200">
          Discover trendy items, compare prices, and add items to your cart in
          one click.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr]">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        >
          <option value="">All Categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading ? <LoadingState label="Loading products..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try a different search or category filter."
        />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            to={`/products/${product._id}`}
            footer={
              <Link
                to={`/products/${product._id}`}
                className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                View
              </Link>
            }
          />
        ))}
      </div>
    </section>
  );
}
