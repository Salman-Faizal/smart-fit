import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { api } from "../../lib/api";
import { trackActivity } from "../../lib/trackActivity";
import { computeNewArrivalIds } from "../../lib/newArrivalUtils";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl bg-white animate-pulse shadow-sm">
      <div className="bg-slate-200" style={{ paddingBottom: "115%" }} />
      <div className="space-y-2.5 p-3">
        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="h-4 w-1/3 rounded bg-slate-200" />
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
      <p className="font-semibold text-slate-700">You&apos;ve seen it all!</p>
      <p className="mt-1 text-sm text-slate-400">
        You&apos;ve explored every product in the feed.
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
 *   title       string   — section heading (defaults to "Discover More")
 *   subtitle    string   — muted sub-heading
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

  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  const newArrivalIds = useMemo(() => computeNewArrivalIds(items), [items]);

  const fetchPage = useCallback(
    async (activeCursor) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const params = { limit: 25 };
        if (activeCursor) {
          params.cursor = activeCursor;
        } else if (excludeIds) {
          params.exclude = excludeIds;
        }

        const data = await api.getDiscoverFeed(params);
        const newItems = data.products || [];

        setItems((prev) => {
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

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoading(true);
    setError(null);
    fetchingRef.current = false;

    fetchPage(null).finally(() => setInitialLoading(false));
  }, [excludeIds, fetchPage]);

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
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, hasMore, loadingMore, initialLoading, fetchPage]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>

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

      {initialLoading ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 25 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {items.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  to={`/products/${product._id}`}
                  isNewArrival={newArrivalIds.has(String(product._id))}
                  onImageClick={() =>
                    trackActivity("recommendation_click", product._id, {
                      section: "discover",
                    })
                  }
                />
              ))}
            </div>
          ) : null}

          {loadingMore ? <Spinner /> : null}

          {!hasMore && items.length > 0 && !loadingMore ? (
            <ExhaustedState />
          ) : null}

          {hasMore ? (
            <div ref={sentinelRef} className="h-1" aria-hidden />
          ) : null}
        </>
      )}
    </section>
  );
}
