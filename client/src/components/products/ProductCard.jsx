import { Link } from "react-router-dom";
import { assetUrl } from "../../lib/api";

export default function ProductCard({ product, to, footer, badge }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={to} className="relative block">
        <img
          src={
            assetUrl(product.images?.[0]) ||
            "https://placehold.co/600x400?text=Product"
          }
          alt={product.name}
          className="h-56 w-full object-cover"
        />
        {badge ? (
          <span
            className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold leading-none shadow ${
              badge.startsWith("🔥")
                ? "bg-amber-500 text-white"
                : "bg-slate-800/75 text-white backdrop-blur-sm"
            }`}
          >
            {badge}
          </span>
        ) : null}
      </Link>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-500">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-amber-600">
            ${product.price}
          </span>
          {footer}
        </div>
      </div>
    </article>
  );
}
