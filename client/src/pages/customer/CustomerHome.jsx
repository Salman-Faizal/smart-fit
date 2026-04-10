import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "../../components/products/ProductCard";
import RecommendationSection from "../../components/products/RecommendationSection";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/StatusState";
import { useProducts } from "../../hooks/useProducts";
import { api } from "../../lib/api";
import heroImage from "../../assets/hero.png";
import aboutImage from "../../assets/about.jpg";

const SATISFACTION_RATE = 95;
const FALLBACK_REGISTERED_USERS = 250;
const BASE_VISIBLE = 9;

function formatCompactCount(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "0+";
  if (number >= 1_000_000) return `${Math.floor(number / 1_000_000)}M+`;
  if (number >= 1_000) return `${Math.floor(number / 1_000)}K+`;
  return `${number}+`;
}

function MetricCard({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{label}</p>
    </div>
  );
}

export default function CustomerHome() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [trending, setTrending] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState(
    FALLBACK_REGISTERED_USERS,
  );
  const [totalProducts, setTotalProducts] = useState(0);
  const [visibleCount, setVisibleCount] = useState(BASE_VISIBLE);

  const loaderRef = useRef(null);

  const { products, loading, error } = useProducts({ search, category });

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))],
    [products],
  );

  const topPicks = useMemo(() => {
    const source = trending.length ? trending : products;
    return source.slice(0, 8);
  }, [trending, products]);

  const heroUsers = formatCompactCount(registeredUsers);
  const heroProducts = formatCompactCount(totalProducts || products.length);
  const heroSatisfaction = `${SATISFACTION_RATE}%`;

  // metrics load
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const overview =
          (await api.getStoreOverview?.()) ||
          (await api.getHomeMetrics?.()) ||
          (await api.getPublicStats?.()) ||
          (await api.getSiteStats?.());

        const users = Number(
          overview?.users ?? overview?.registeredUsers ?? overview?.userCount,
        );
        const products = Number(
          overview?.products ??
            overview?.productCount ??
            overview?.totalProducts,
        );

        if (users) setRegisteredUsers(users);
        if (products) setTotalProducts(products);
      } catch (err) {
        console.error("Failed to load metrics:", err);
      }
    };

    loadMetrics();
  }, []);

  // trending
  useEffect(() => {
    const loadTrending = async () => {
      try {
        const data = await api.getTrendingRecommendations(
          category ? { category } : {},
        );
        setTrending(data.recommendations || []);
      } catch {
        setTrending([]);
      }
    };

    loadTrending();
  }, [category]);

  // infinite scroll
  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;
    if (visibleCount >= products.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 9, products.length));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [products.length, visibleCount]);

  // handlers (RESET happens here instead of useEffect)
  const handleSearchChange = (value) => {
    setSearch(value);
    setVisibleCount(BASE_VISIBLE);
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    setVisibleCount(BASE_VISIBLE);
  };

  return (
    <section className="space-y-14">
      {/* HERO */}
      <div
        id="home"
        className="scroll-mt-28 relative h-[390px] sm:h-[440px] lg:h-[490px] overflow-hidden rounded-2xl"
      >
        {/* BACKGROUND IMAGE */}
        <img
          src={heroImage}
          className="absolute inset-0 h-full w-full object-cover object-right brightness-[0.55]"
        />

        {/* CONTENT */}
        <div className="relative z-10 flex h-full items-center px-8 sm:px-12 max-w-xl">
          <div className="max-w-2xl text-white">
            <h1 className=" mt-4 text-4xl sm:text-5xl font-semibold font-montserrat">
              <span className="space-y-1">Handpicked With</span> <br></br>
              <span className="text-amber-600">You</span> in Mind
            </h1>

            <p className="tracking-wide mt-4 text-slate-200 text-lg font-open-sans">
              Explore products tailored to your taste, backed by real user
              trust, join thousands discovering smarter ways to shop
            </p>

            {/* METRICS */}
            <div className="mt-8 flex flex-wrap gap-9 text-sm">
              <div>
                <p className="text-3xl font-bold font-montserrat">
                  {heroUsers}
                </p>
                <p className="text-slate-300 font-open-sans">
                  Registered Users
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold font-montserrat">
                  {heroProducts}
                </p>
                <p className="text-slate-300 font-open-sans">Products</p>
              </div>
              <div>
                <p className="text-3xl font-bold font-montserrat">
                  {heroSatisfaction}
                </p>
                <p className="text-slate-300 font-open-sans">
                  Satisfaction Rate
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRENDING */}
      <div id="trending">
        <RecommendationSection
          title="Trending Now"
          badge="Popular"
          products={trending}
        />
      </div>

      {/* FOR YOU */}
      <div id="for-you">
        <RecommendationSection
          title="Top Picks For You"
          badge="Curated"
          products={topPicks}
        />
      </div>

      {/* DISCOVER */}
      <div id="discover">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr] mb-6">
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search..."
            className="rounded-full border px-4 py-3"
          />
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="rounded-full border px-4 py-3"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading && <LoadingState label="Loading..." />}
        {error && <ErrorState message={error} />}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, visibleCount).map((p) => (
            <ProductCard key={p._id} product={p} to={`/products/${p._id}`} />
          ))}
        </div>

        <div ref={loaderRef} className="h-10" />
      </div>

      {/* ABOUT */}
      <div id="about" className="scroll-mt-28 space-y-4">
        <h2 className="text-md font-semibold uppercase tracking-wide text-amber-600">
          About Us
        </h2>

        <div className="grid lg:grid-cols-2 gap-6 items-start brightness-[0.8]">
          <img src={aboutImage} className="rounded-xl" />

          <div>
            <p className=" text-slate-500 font-open-sans text-justify mb-4">
              At Smart Fit, we believe shopping for men’s fashion should feel
              effortless and inspiring. Our store brings together curated
              collections that balance timeless staples with modern trends,
              ensuring every customer finds pieces that truly reflect their
              style. From casual denim to tailored jackets, each product is
              carefully selected to deliver both quality and versatility.
            </p>
            <p className=" text-slate-500 font-open-sans text-justify mb-4">
              What sets us apart is our focus on personalization. We don’t just
              showcase clothing — we provide tailored suggestions designed to
              match your preferences and lifestyle. Whether you’re refreshing
              your wardrobe or searching for a statement piece, our
              recommendation system highlights options that fit your taste,
              making discovery seamless and enjoyable.
            </p>
            <p className=" text-slate-500 font-open-sans text-justify mb-4">
              Beyond the racks and shelves, Smart Fit is about trust and
              experience. With a growing community of satisfied customers, we
              combine credibility with innovation, offering a shopping journey
              that feels both familiar and forward‑thinking. Step into Smart Fit
              and explore fashion that’s curated for you, backed by real user
              confidence
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
