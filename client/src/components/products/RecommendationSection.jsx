import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";

export default function RecommendationSection({
  title,
  badge,
  products = [],
  emptyLabel,
}) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {badge ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {badge}
          </span>
        ) : null}
      </div>

      {emptyLabel ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
