import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { trackActivity } from "../../lib/trackActivity";

/**
 * RecommendationSection
 *
 * Props:
 *   title            string    — section heading (uppercase, amber)
 *   subtitle         string?   — muted sub-heading
 *   badge            string?   — pill badge beside the title
 *   tone             "default" | "personal"  — controls badge/heading colour
 *   products         Product[] — must have _id; may carry .badge and .reason
 *   emptyLabel       string?   — shown when products array is empty instead of hiding
 *   getProductCaption (product) => string | null   — optional fn; when provided,
 *                    its return value is rendered as a muted caption below each
 *                    card (used for the "reason" explainability layer).
 */
export default function RecommendationSection({
  title,
  badge,
  subtitle,
  products = [],
  emptyLabel,
  tone = "default",
  getProductCaption,
  sectionId = "recommendation",
}) {
  if (!products.length) return null;

  const badgeClassName =
    tone === "personal"
      ? "rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700"
      : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";

  return (
    <section className="space-y-4 space-x-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        {badge ? <span className={badgeClassName}>{badge}</span> : null}
      </div>

      {emptyLabel ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : null}

      <div className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2">
        {products.map((product) => {
          const caption = getProductCaption ? getProductCaption(product) : null;
          return (
            <div key={product._id} className="w-[220px] flex-shrink-0 snap-start">
              <ProductCard
                product={product}
                to={`/products/${product._id}`}
                badge={product.badge ?? null}
                onImageClick={() =>
                  trackActivity("recommendation_click", product._id, {
                    section: sectionId,
                  })
                }
                footer={
                  <Link
                    to={`/products/${product._id}`}
                    onClick={() =>
                      trackActivity("recommendation_click", product._id, {
                        section: sectionId,
                      })
                    }
                    className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    View
                  </Link>
                }
              />
              {caption ? (
                <p className="mt-1.5 px-1 text-xs italic text-slate-400 line-clamp-1">
                  {caption}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
