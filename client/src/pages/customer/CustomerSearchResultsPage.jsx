import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../../components/products/ProductCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/StatusState";
import { api } from "../../lib/api";

const PAGE_LIMIT = 18;

export default function CustomerSearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialSort = searchParams.get("sort") || "";

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const hasMore = products.length < total;
  const loaderRef = useRef(null);

  const requestParams = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      ...(query ? { search: query } : {}),
      ...(category ? { category } : {}),
      ...(sort ? { sort } : {}),
    }),
    [page, query, category, sort],
  );

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (query) nextParams.set("q", query);
    if (category) nextParams.set("category", category);
    if (sort) nextParams.set("sort", sort);
    setSearchParams(nextParams, { replace: true });
  }, [query, category, sort, setSearchParams]);

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

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const onCategoryChange = (value) => {
    setPage(1);
    setCategory(value);
  };

  const onSortChange = (value) => {
    setPage(1);
    setSort(value);
  };

  return (
    <section className="space-y-6" id="search-results">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Search Results</h2>
        <p className="text-sm text-slate-500">
          Find products by keyword, category, and sort preference.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <form onSubmit={applySearch}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-full border px-4 py-3"
          />
        </form>

        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-full border px-4 py-3"
        >
          <option value="">All</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-full border px-4 py-3"
        >
          <option value="">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="views_desc">Most Viewed</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading products..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && !products.length ? (
        <EmptyState message="No products found. Try another search." />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            to={`/products/${product._id}`}
          />
        ))}
      </div>

      {loadingMore ? <LoadingState label="Loading more..." /> : null}
      <div ref={loaderRef} className="h-10" />
    </section>
  );
}
