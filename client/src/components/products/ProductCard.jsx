import { Link } from "react-router-dom";
import { assetUrl } from "../../lib/api";

// Deterministic colour palette for category chips.
// The same category name always gets the same colour — consistent across renders.
const CHIP_PALETTES = [
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];

// Hard-coded overrides so "New" and "Trending" always look distinctive
const CHIP_OVERRIDES = {
  New: "bg-emerald-100 text-emerald-700",
  Trending: "bg-amber-100 text-amber-700",
};

function chipClass(label) {
  if (!label) return CHIP_PALETTES[0];
  if (CHIP_OVERRIDES[label]) return CHIP_OVERRIDES[label];
  const hash = [...label].reduce(
    (h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0,
    0,
  );
  return CHIP_PALETTES[Math.abs(hash) % CHIP_PALETTES.length];
}

export default function ProductCard({ product, to, footer, badge, categoryLabel, onImageClick }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={to} className="relative block" onClick={onImageClick}>
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
        {categoryLabel ? (
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider leading-none ${chipClass(categoryLabel)}`}
          >
            {categoryLabel}
          </span>
        ) : null}
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
