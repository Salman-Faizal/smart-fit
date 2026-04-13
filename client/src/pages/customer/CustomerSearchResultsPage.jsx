import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../../components/products/ProductCard";
import { ErrorState, LoadingState } from "../../components/common/StatusState";
import { api } from "../../lib/api";

const PAGE_LIMIT = 18;

const FILTER_SECTIONS = {
  category: "Category",
  price: "Price",
  date: "Date",
  popularity: "Popularity",
};

const SORT_BY_FILTER = {
  priceLowToHigh: "price_asc",
  priceHighToLow: "price_desc",
  newestToOldest: "created_desc",
  oldestToNewest: "created_asc",
  mostPopular: "popular_desc",
};

const FILTER_BY_SORT = Object.entries(SORT_BY_FILTER).reduce(
  (acc, [filterKey, sortValue]) => {
    acc[sortValue] = filterKey;
    return acc;
  },
  {},
);

const DATE_RANGES = {
  lastWeek: "last_week",
  lastMonth: "last_month",
};

const DATE_BY_RANGE = Object.entries(DATE_RANGES).reduce(
  (acc, [filterKey, value]) => {
    acc[value] = filterKey;
    return acc;
  },
  {},
);

export default function CustomerSearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const initialCategories = searchParams
    .get("category")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const initialSort = searchParams.get("sort") || "";
  const initialDateRange = searchParams.get("dateRange") || "";
  const initialLayout = searchParams.get("layout") || "grid";

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState(
    initialCategories || [],
  );
  const [selectedSortFilter, setSelectedSortFilter] = useState(
    FILTER_BY_SORT[initialSort] || "",
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState(
    DATE_BY_RANGE[initialDateRange] || "",
  );
  const [layout, setLayout] = useState(
    initialLayout === "list" ? "list" : "grid",
  );
  const [collapsedSections, setCollapsedSections] = useState({
    category: false,
    price: false,
    date: false,
    popularity: false,
  });
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const hasMore = products.length < total;
  const loaderRef = useRef(null);

  useEffect(() => {
    const nextQuery = searchParams.get("q") || "";
    const nextCategories = searchParams
      .get("category")
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const nextSort = searchParams.get("sort") || "";
    const nextDateRange = searchParams.get("dateRange") || "";
    const nextLayout = searchParams.get("layout") || "grid";

    setQuery(nextQuery);
    setSelectedCategories(nextCategories || []);
    setSelectedSortFilter(FILTER_BY_SORT[nextSort] || "");
    setSelectedDateFilter(DATE_BY_RANGE[nextDateRange] || "");
    setLayout(nextLayout === "list" ? "list" : "grid");
    setPage(1);
  }, [searchParams]);

  const selectedSort = selectedSortFilter
    ? SORT_BY_FILTER[selectedSortFilter]
    : "";
  const selectedDateRange = selectedDateFilter
    ? DATE_RANGES[selectedDateFilter]
    : "";

  const requestParams = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      ...(query ? { search: query } : {}),
      ...(selectedCategories.length
        ? { category: selectedCategories.join(",") }
        : {}),
      ...(selectedSort ? { sort: selectedSort } : {}),
      ...(selectedDateRange ? { dateRange: selectedDateRange } : {}),
    }),
    [page, query, selectedCategories, selectedSort, selectedDateRange],
  );

  useEffect(() => {
    const loadProducts = async () => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        setError("");

        const data = await api.getProducts(requestParams);
        const nextProducts = data.products || [];

        setProducts((prev) =>
          page === 1 ? nextProducts : [...prev, ...nextProducts],
        );
        setTotal(Number(data.total || 0));
      } catch (err) {
        setError(err.message || "Failed to fetch products");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadProducts();
  }, [requestParams, page]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await api.getProducts({ page: 1, limit: 1000 });
        const uniqueCategories = [
          ...new Set(
            (data.products || []).map((p) => p.category).filter(Boolean),
          ),
        ];
        setCategories(uniqueCategories);
      } catch {
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "180px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  const updateParams = ({
    nextCategories = selectedCategories,
    nextSortFilter = selectedSortFilter,
    nextDateFilter = selectedDateFilter,
    nextLayout = layout,
  }) => {
    const nextParams = new URLSearchParams();
    const nextSort = nextSortFilter ? SORT_BY_FILTER[nextSortFilter] : "";
    const nextDateRange = nextDateFilter ? DATE_RANGES[nextDateFilter] : "";

    if (query) nextParams.set("q", query);
    if (nextCategories.length)
      nextParams.set("category", nextCategories.join(","));
    if (nextSort) nextParams.set("sort", nextSort);
    if (nextDateRange) nextParams.set("dateRange", nextDateRange);
    if (nextLayout === "list") nextParams.set("layout", "list");

    setSearchParams(nextParams, { replace: true });
  };

  const toggleCategory = (value) => {
    const exists = selectedCategories.includes(value);
    const nextCategories = exists
      ? selectedCategories.filter((item) => item !== value)
      : [...selectedCategories, value];

    updateParams({ nextCategories });
  };

  const toggleSortFilter = (filterKey) => {
    updateParams({
      nextSortFilter: selectedSortFilter === filterKey ? "" : filterKey,
    });
  };

  const toggleDateFilter = (filterKey) => {
    updateParams({
      nextDateFilter: selectedDateFilter === filterKey ? "" : filterKey,
    });
  };

  const clearAllFilters = () => {
    updateParams({
      nextCategories: [],
      nextSortFilter: "",
      nextDateFilter: "",
    });
  };

  const toggleFilterSection = (section) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const resultsGridClass =
    layout === "list"
      ? "grid gap-5 grid-cols-1"
      : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3";
  const hasNoResults = !loading && !error && !products.length;

  return (
    <section className="space-y-6" id="search-results">
      <div>
        <p className="p-0 m-0 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="text-amber-600">Home</span> &gt; Search
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              {!loading && total === 0 ? (
                <>
                  No results for{" "}
                  <span className="italic text-gray-400">
                    {query || "All products"}
                  </span>
                </>
              ) : (
                <>
                  {total} items for{" "}
                  <span className="italic text-gray-400">
                    {query || "All products"}
                  </span>
                </>
              )}
            </p>
          </div>

          <div
            className="inline-flex rounded-md border border-slate-200 bg-white p-1 gap-1 text-slate-600 shadow-sm"
            aria-label="Toggle result layout"
            role="group"
          >
            <button
              type="button"
              onClick={() => updateParams({ nextLayout: "list" })}
              aria-label="List layout"
              className={`rounded-md p-2 transition ${
                layout === "list"
                  ? "bg-amber-100/70 text-amber-600"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M7 7h10M7 12h10M7 17h10M4 7h.01M4 12h.01M4 17h.01"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => updateParams({ nextLayout: "grid" })}
              aria-label="Grid layout"
              className={`rounded-md p-2 transition ${
                layout === "grid"
                  ? "bg-amber-100/70 text-amber-600"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit lg:sticky lg:top-28">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-base font-semibold text-slate-900">Filter</h3>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm font-medium text-slate-500 hover:text-amber-600"
            >
              Clear
            </button>
          </div>

          {Object.entries(FILTER_SECTIONS).map(([key, label]) => {
            const isCollapsed = collapsedSections[key];

            return (
              <section key={key} className="border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => toggleFilterSection(key)}
                  className="flex w-full items-center justify-between py-1 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {label}
                  </span>
                  <span className="text-lg text-slate-500">
                    {isCollapsed ? "-" : "+"}
                  </span>
                </button>

                {!isCollapsed ? (
                  <div className="mt-2 space-y-2 text-sm text-slate-600">
                    {key === "category" &&
                      (categories.length ? (
                        categories.map((item) => (
                          <label
                            key={item}
                            className="cursor-pointer flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(item)}
                              onChange={() => toggleCategory(item)}
                              className="accent-amber-600 h-4 w-4 rounded border-slate-300"
                            />
                            <span>{item}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No categories</p>
                      ))}

                    {key === "price" && (
                      <>
                        <label className="cursor-pointer flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedSortFilter === "priceLowToHigh"}
                            onChange={() => toggleSortFilter("priceLowToHigh")}
                            className="accent-amber-600 h-4 w-4 rounded border-slate-300"
                          />
                          <span>Low to High</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedSortFilter === "priceHighToLow"}
                            onChange={() => toggleSortFilter("priceHighToLow")}
                            className="accent-amber-600 h-4 w-4 rounded border-slate-300"
                          />
                          <span>High to Low</span>
                        </label>
                      </>
                    )}

                    {key === "date" && (
                      <>
                        <label className="cursor-pointer flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedDateFilter === "lastWeek"}
                            onChange={() => toggleDateFilter("lastWeek")}
                            className="accent-amber-600 h-4 w-4 rounded border-slate-300"
                          />
                          <span>Last week</span>
                        </label>
                        <label className="cursor-pointer flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedDateFilter === "lastMonth"}
                            onChange={() => toggleDateFilter("lastMonth")}
                            className="accent-amber-600 h-4 w-4 rounded border-slate-300"
                          />
                          <span>Last month</span>
                        </label>
                        <label className="cursor-pointer flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedSortFilter === "newestToOldest"}
                            onChange={() => toggleSortFilter("newestToOldest")}
                            className="accent-amber-600 h-4 w-4 rounded border-slate-300"
                          />
                          <span>New to old</span>
                        </label>
                        <label className="cursor-pointer flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedSortFilter === "oldestToNewest"}
                            onChange={() => toggleSortFilter("oldestToNewest")}
                            className="accent-amber-600 h-4 w-4 rounded border-slate-300"
                          />
                          <span>Old to new</span>
                        </label>
                      </>
                    )}

                    {key === "popularity" && (
                      <label className="cursor-pointer flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedSortFilter === "mostPopular"}
                          onChange={() => toggleSortFilter("mostPopular")}
                          className="accent-amber-600 h-4 w-4 rounded border-slate-300"
                        />
                        <span>Most popular</span>
                      </label>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </aside>

        <div className="space-y-5">
          {loading && <LoadingState label="Loading products..." />}
          {error && <ErrorState message={error} />}

          {hasNoResults ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-transparent px-6 text-center">
              <div className="max-w-md space-y-2">
                <div className="flex justify-center">
                  <svg
                    className="h-10  text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-slate-800">
                  No matches yet
                </p>
                <p className="text-sm text-slate-500">
                  Don’t worry — great finds are just a search away. Try
                  adjusting your filters or keywords!
                </p>
              </div>
            </div>
          ) : null}

          {!hasNoResults ? (
            <div className={resultsGridClass}>
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  to={`/products/${product._id}`}
                />
              ))}
            </div>
          ) : null}

          {loadingMore ? <LoadingState label="Loading more..." /> : null}
          <div ref={loaderRef} className="h-10" />
        </div>
      </div>
    </section>
  );
}
