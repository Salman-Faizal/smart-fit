import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { api } from "../../lib/api";
import { trackActivity } from "../../lib/trackActivity";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white animate-pulse">
      <div className="h-56 bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-16 rounded-full bg-slate-200" />
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-2/3 rounded bg-slate-200" />
        <div className="h-6 w-1/3 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-amber-500 animate-spin" />
    </div>
  );
}

function ExhaustedState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
      <div className="mb-3 text-5xl select-none" aria-hidden>🎉</div>
      <p className="font-semibold text-slate-700">You've seen it all!</p>
      <p className="mt-1 text-sm text-slate-400">
        You've explored every product in the feed.
      </p>
      <Link
        to="/search"
        className="mt-4 inline-block rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
      >
        Search for more
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfiniteScrollFeed
// ---------------------------------------------------------------------------

/**
 * Self-contained infinite-scroll product feed powered by cursor-based pagination.
 *
 * Props:
 *   excludeIds  string   — comma-separated IDs already shown above this section
 *                          (Trending Now, Top Picks). Used only on the first fetch.
 *                          Subsequent pages use the cursor which encodes all seen IDs.
 *   title       string   — section heading (defaults to "Discover More")
 *   subtitle    string   — muted sub-heading
 *
 * The component resets and re-fetches whenever `excludeIds` changes, so the
 * parent should stabilise it before rendering (avoid passing a new object reference
 * on every render).
 */
export default function InfiniteScrollFeed({
  excludeIds = "",
  title = "Discover More",
  subtitle = "Fresh finds across every style",
}) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Sentinel div at the bottom — IntersectionObserver watches this
  const sentinelRef = useRef(null);
  // Prevent duplicate in-flight requests
  const fetchingRef = useRef(false);

  // ── Fetch a page ──────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (activeCursor) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const params = { limit: 12 };
        if (activeCursor) {
          params.cursor = activeCursor;
        } else if (excludeIds) {
          params.exclude = excludeIds;
        }

        const data = await api.getDiscoverFeed(params);
        const newItems = data.products || [];

        setItems((prev) => {
          // Cross-page deduplication — guard against cursor rounding edge cases
          const seenIds = new Set(prev.map((p) => p._id));
          return [...prev, ...newItems.filter((p) => !seenIds.has(p._id))];
        });
        setCursor(data.nextCursor ?? null);
        setHasMore(data.hasMore ?? false);
        setError(null);
      } catch (err) {
        setError(err?.message || "Failed to load products");
      } finally {
        fetchingRef.current = false;
      }
    },
    [excludeIds],
  );

  // ── Initial load (and reset when excludeIds changes) ─────────────────────
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoading(true);
    setError(null);
    fetchingRef.current = false;

    fetchPage(null).finally(() => setInitialLoading(false));
  }, [excludeIds, fetchPage]);

  // ── IntersectionObserver — triggers next page when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          hasMore &&
          !loadingMore &&
          !initialLoading &&
          !fetchingRef.current
        ) {
          setLoadingMore(true);
          fetchPage(cursor).finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "300px" }, // start loading 300px before sentinel comes into view
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, hasMore, loadingMore, initialLoading, fetchPage]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section id="discover" className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {/* Error banner */}
      {error && !items.length ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error} —{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setError(null);
              setInitialLoading(true);
              fetchPage(null).finally(() => setInitialLoading(false));
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Skeleton grid — shown only on the very first load */}
      {initialLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Product grid */}
          {items.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  to={`/products/${product._id}`}
                  categoryLabel={product.poolLabel ?? product.category}
                  onImageClick={() =>
                    trackActivity("recommendation_click", product._id, {
                      section: "discover",
                    })
                  }
                  footer={
                    <Link
                      to={`/products/${product._id}`}
                      onClick={() =>
                        trackActivity("recommendation_click", product._id, {
                          section: "discover",
                        })
                      }
                      className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      View
                    </Link>
                  }
                />
              ))}
            </div>
          ) : null}

          {/* Loading more — spinner while next page fetches */}
          {loadingMore ? <Spinner /> : null}

          {/* Exhausted state */}
          {!hasMore && items.length > 0 && !loadingMore ? (
            <ExhaustedState />
          ) : null}

          {/* Sentinel — IntersectionObserver target */}
          {hasMore ? (
            <div ref={sentinelRef} className="h-1" aria-hidden />
          ) : null}
        </>
      )}
    </section>
  );
}
