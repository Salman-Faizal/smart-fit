import { Link } from "react-router-dom";
import { assetUrl } from "../../lib/api";

export default function ProductCard({ product, to, footer }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={to} className="block">
        <img
          src={
            assetUrl(product.images?.[0]) ||
            "https://placehold.co/600x400?text=Product"
          }
          alt={product.name}
          className="h-56 w-full object-cover"
        />
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
