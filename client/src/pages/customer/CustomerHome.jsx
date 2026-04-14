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
import QuizFloatingCTA from "../../components/recs/QuizFloatingCTA";

const SATISFACTION_RATE = 95;
const FALLBACK_REGISTERED_USERS = 250;
const BASE_VISIBLE = 9;

/**
 * Seeded Fisher-Yates shuffle using a simple LCG.
 * Seed is derived from the page-load timestamp (changes every load) so the
 * same top-20 products appear but in a fresh display order each time —
 * matching how ASOS / H&M surface trending items without strict rank order.
 */
function seededShuffle(arr, seed) {
  const result = [...arr];
  // LCG constants from Numerical Recipes; keep as unsigned 32-bit via >>> 0
  let s = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

// Fixed for the lifetime of this page load so the shuffle is stable across
// re-renders while still changing on every fresh navigation / F5.
const PAGE_LOAD_SEED = Date.now();

function formatCompactCount(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "0+";
  if (number >= 1_000_000) return `${Math.floor(number / 1_000_000)}M+`;
  if (number >= 1_000) return `${Math.floor(number / 1_000)}K+`;
  return `${number}+`;
}

export default function CustomerHome() {
  const [trendingRaw, setTrendingRaw] = useState([]);
  const [forYou, setForYou] = useState([]);
  const [discoverFeed, setDiscoverFeed] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState(
    FALLBACK_REGISTERED_USERS,
  );
  const [totalProducts, setTotalProducts] = useState(0);
  const [visibleCount, setVisibleCount] = useState(BASE_VISIBLE);
  const loaderRef = useRef(null);

  const { products, loading, error } = useProducts();

  // Shuffle the top-20 trending list on every page load using a seeded
  // random so the same products appear but never in strict rank order.
  const trending = useMemo(
    () => seededShuffle(trendingRaw, PAGE_LOAD_SEED),
    [trendingRaw],
  );

  const displayDiscoverFeed = useMemo(() => {
    return discoverFeed.length ? discoverFeed : products;
  }, [discoverFeed, products]);

  const heroUsers = formatCompactCount(registeredUsers);
  const heroProducts = formatCompactCount(totalProducts || products.length);
  const heroSatisfaction = `${SATISFACTION_RATE}%`;

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
        const productsCount = Number(
          overview?.products ??
            overview?.productCount ??
            overview?.totalProducts,
        );

        if (users) setRegisteredUsers(users);
        if (productsCount) setTotalProducts(productsCount);
      } catch (err) {
        console.error("Failed to load metrics:", err);
      }
    };

    loadMetrics();
  }, []);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        // Use the ranked trending endpoint (top 20, badge metadata included)
        const trendingData = await api.getTrendingWithRanks({ limit: 20 });
        const trendingItems = trendingData.products || [];
        const trendingIds = trendingItems.map((item) => item._id).join(",");

        const forYouData = await api.getForYouRecommendations({
          limit: 12,
          exclude: trendingIds,
        });
        const forYouItems = forYouData.recommendations || [];

        const usedIds = [...trendingItems, ...forYouItems]
          .map((item) => item._id)
          .join(",");

        const discoverData = await api.getDiscoverRecommendations({
          limit: 48,
          exclude: usedIds,
        });

        setTrendingRaw(trendingItems);
        setForYou(forYouItems);
        setDiscoverFeed(discoverData.recommendations || []);
      } catch {
        setTrendingRaw([]);
        setForYou([]);
        setDiscoverFeed([]);
      }
    };

    loadRecommendations();
  }, []);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;
    if (visibleCount >= displayDiscoverFeed.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + 9, displayDiscoverFeed.length),
          );
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [displayDiscoverFeed.length, visibleCount]);

  return (
    <section className="space-y-14">
      <div
        id="home"
        className="scroll-mt-28 relative h-[390px] sm:h-[440px] lg:h-[490px] overflow-hidden rounded-2xl"
      >
        <img
          src={heroImage}
          className="absolute inset-0 h-full w-full object-cover object-right brightness-[0.55]"
        />

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

      <div id="trending">
        <RecommendationSection
          title="Trending Now"
          subtitle="Global best-performers driven by store-wide views and purchases."
          badge="Popular"
          products={trending}
        />
      </div>

      <div id="for-you">
        <RecommendationSection
          title="For You"
          subtitle="Personalized picks based on your recent browsing and shopping signals."
          badge="Personalized"
          tone="personal"
          products={forYou}
        />
      </div>

      <div id="discover" className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Discover More
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            A mixed feed balancing relevant picks, rising products, and fresh
            categories to expand discovery.
          </p>
        </div>

        {loading && <LoadingState label="Loading..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && !displayDiscoverFeed.length ? (
          <EmptyState message="No products available yet." />
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayDiscoverFeed.slice(0, visibleCount).map((p) => (
            <ProductCard key={p._id} product={p} to={`/products/${p._id}`} />
          ))}
        </div>

        <div ref={loaderRef} className="h-10" />
      </div>

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
      <QuizFloatingCTA />
    </section>
  );
}
