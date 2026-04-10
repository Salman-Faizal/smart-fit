import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";

export default function RecommendationSection({
  title,
  badge,
  products = [],
  emptyLabel,
}) {
  if (!products.length) return null;

  return (
    <section className="space-y-4 space-x-0">
      <div className="flex items-center justify-between gap-3">
        {/* TITLE */}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          {title}
        </h2>

        {/* BADGE */}
        {badge ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {badge}
          </span>
        ) : null}
      </div>

      {/* EMPTY LABEL */}
      {emptyLabel ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : null}

      {/* PRODUCTS */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2">
        {products.map((product) => (
          <div key={product._id} className="w-[220px] flex-shrink-0 snap-start">
            <ProductCard
              product={product}
              to={`/products/${product._id}`}
              footer={
                <Link
                  to={`/products/${product._id}`}
                  className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  View
                </Link>
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
