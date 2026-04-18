import { useMemo } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { trackActivity } from "../../lib/trackActivity";
import { computeNewArrivalIds } from "../../lib/newArrivalUtils";

/**
 * RecommendationSection
 *
 * Props:
 *   title            string    — section heading
 *   subtitle         string?   — muted sub-heading
 *   badge            string?   — pill badge beside the title (hidden now — badge moved to right)
 *   tone             "default" | "personal"  — controls badge colour
 *   products         Product[] — must have _id; may carry .badge and .reason
 *   emptyLabel       string?   — shown when products array is empty instead of hiding
 *   viewAllTo        string?   — route for "View All →" link
 *   getProductCaption (product) => string | null — optional fn for caption below card
 */
function SkeletonCard() {
  return (
    <div className="w-[210px] flex-shrink-0">
      <div className="overflow-hidden rounded-xl bg-white animate-pulse shadow-sm">
        <div className="bg-slate-200" style={{ paddingBottom: "115%" }} />
        <div className="space-y-2.5 p-3">
          <div className="h-3.5 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-200" />
          <div className="h-4 w-1/3 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function RecommendationSection({
  title,
  badge,
  subtitle,
  products = [],
  emptyLabel,
  tone = "default",
  loading = false,
  getProductCaption,
  sectionId = "recommendation",
  viewAllTo,
}) {
  const newArrivalIds = useMemo(() => computeNewArrivalIds(products), [products]);

  if (!loading && !products.length && !emptyLabel) return null;

  const badgeClassName =
    tone === "personal"
      ? "rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700"
      : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {badge ? <span className={badgeClassName}>{badge}</span> : null}
          {viewAllTo ? (
            <Link
              to={viewAllTo}
              className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline whitespace-nowrap"
            >
              View All →
            </Link>
          ) : null}
        </div>
      </div>

      {emptyLabel && !loading && !products.length ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : null}

      <div className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2">
        {loading
          ? Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} />)
          : products.map((product) => {
          const caption = getProductCaption ? getProductCaption(product) : null;
          return (
            <div key={product._id} className="w-[210px] flex-shrink-0 snap-start">
              <ProductCard
                product={product}
                to={`/products/${product._id}`}
                isNewArrival={newArrivalIds.has(String(product._id))}
                onImageClick={() =>
                  trackActivity("recommendation_click", product._id, {
                    section: sectionId,
                  })
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
