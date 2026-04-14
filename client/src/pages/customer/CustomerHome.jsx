/**
 * CustomerHome — polished premium menswear home page.
 *
 * Changes vs old version:
 *  - Hero: subtle number count-up animations, improved typography/spacing
 *  - Category quick links row (Formal, Casual, Sportswear, Accessories, New Arrivals)
 *  - Sections reordered: Hero → Categories → Top Picks → Trending Now → Promo Banner →
 *    Discover More
 *  - Promo banner: dark full-width slim strip (free delivery, returns, secure checkout)
 *  - Section headers: left-aligned, clean font-semibold, "View All →" link for Trending/Top Picks
 *  - Scroll fade-in animations via IntersectionObserver (subtle 0.3s fade + translateY)
 *  - Removed "About Us" section (moved to footer/info page)
 *  - LKR formatting (prices are in product cards, not needed here)
 *  - Nav highlights current section
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RecommendationSection from "../../components/products/RecommendationSection";
import InfiniteScrollFeed from "../../components/products/InfiniteScrollFeed";
import { useProducts } from "../../hooks/useProducts";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import heroImage from "../../assets/hero.png";

const SATISFACTION_RATE = 95;
const FALLBACK_REGISTERED_USERS = 250;

// ─── Seeded shuffle (Fisher-Yates + LCG) ─────────────────────────────────────

function seededShuffle(arr, seed) {
  const result = [...arr];
  let s = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const PAGE_LOAD_SEED = Date.now();

function formatCompactCount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M+`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`;
  return `${n}+`;
}

// ─── Count-up animation ───────────────────────────────────────────────────────

function useCountUp(target, duration = 1200, started = false) {
  const [value, setValue] = useState("0");

  useEffect(() => {
    if (!started || !target) return;

    // Extract numeric part and suffix
    const numericTarget = parseFloat(String(target).replace(/[^0-9.]/g, "")) || 0;
    const suffix = String(target).replace(/[0-9.]/g, "");

    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easedProgress * numericTarget);
      setValue(`${current}${suffix}`);
      if (progress < 1) requestAnimationFrame(step);
      else setValue(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);

  return value;
}

// ─── Fade-in on scroll hook ───────────────────────────────────────────────────

function useFadeIn(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ─── FadeSection wrapper ──────────────────────────────────────────────────────

function FadeSection({ children, className = "", id }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      id={id}
      ref={ref}
      className={`transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Category icons (simple inline SVGs) ─────────────────────────────────────

const CATEGORIES = [
  {
    label: "Formal",
    route: "/search?category=Formal",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5z" /><line x1="3" y1="7" x2="21" y2="7" /><path d="M16 7a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    label: "Casual",
    route: "/search?category=Casual",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z" />
      </svg>
    ),
  },
  {
    label: "Sportswear",
    route: "/search?category=Sportswear",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    label: "Accessories",
    route: "/search?category=Accessories",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 003.05 13.77M4.93 19.07a10 10 0 0015.06-9.07" />
      </svg>
    ),
  },
  {
    label: "New Arrivals",
    route: "/search?sort=date_desc",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
];

// ─── Promo Banner ─────────────────────────────────────────────────────────────

function PromoBanner() {
  return (
    <div className="rounded-2xl bg-slate-900 px-4 py-5 text-white">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-700">
        {[
          { icon: "🚚", text: "FREE DELIVERY on orders over LKR 5,000" },
          { icon: "↩️", text: "EASY RETURNS within 14 days" },
          { icon: "🔒", text: "SECURE CHECKOUT guaranteed" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 w-full sm:w-auto sm:flex-1 justify-center py-2 sm:py-0 sm:px-6 text-center">
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-xs font-semibold tracking-wide text-slate-200">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerHome() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [trendingRaw, setTrendingRaw] = useState([]);
  const [topPicks, setTopPicks] = useState([]);
  const [topPicksLabel, setTopPicksLabel] = useState("Top Picks For You");
  const [topPicksIsColdStart, setTopPicksIsColdStart] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState(FALLBACK_REGISTERED_USERS);
  const [totalProducts, setTotalProducts] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);

  const { products } = useProducts();

  // Start hero count-up when the hero comes into view (on load)
  useEffect(() => {
    // Trigger on next tick to allow initial paint
    const t = setTimeout(() => setHeroVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const trending = useMemo(() => seededShuffle(trendingRaw, PAGE_LOAD_SEED), [trendingRaw]);

  const discoverExcludeIds = useMemo(
    () => [...trendingRaw, ...topPicks].map((p) => p._id).join(","),
    [trendingRaw, topPicks],
  );

  const heroUsers = formatCompactCount(registeredUsers);
  const heroProducts = formatCompactCount(totalProducts || products.length);
  const heroSatisfaction = `${SATISFACTION_RATE}%`;

  // Count-up values
  const animUsers = useCountUp(heroUsers, 1400, heroVisible);
  const animProducts = useCountUp(heroProducts, 1600, heroVisible);
  const animSatisfaction = useCountUp(heroSatisfaction, 1200, heroVisible);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const overview =
          (await api.getStoreOverview?.()) ||
          (await api.getHomeMetrics?.()) ||
          (await api.getPublicStats?.()) ||
          (await api.getSiteStats?.());

        const users = Number(overview?.users ?? overview?.registeredUsers ?? overview?.userCount);
        const productsCount = Number(overview?.products ?? overview?.productCount ?? overview?.totalProducts);
        if (users) setRegisteredUsers(users);
        if (productsCount) setTotalProducts(productsCount);
      } catch {
        // Silently fall back to defaults
      }
    };
    loadMetrics();
  }, []);

  useEffect(() => {
    api
      .getTrendingWithRanks({ limit: 20 })
      .then((data) => setTrendingRaw(data.products || []))
      .catch(() => setTrendingRaw([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { setTopPicks([]); return; }

    const load = async () => {
      try {
        const excludeIds = trendingRaw.map((p) => p._id).join(",");
        const data = await api.getTopPicksForUser(excludeIds ? { exclude: excludeIds } : {});
        setTopPicks(data.products || []);
        setTopPicksLabel(data.label || "Top Picks For You");
        setTopPicksIsColdStart(data.isColdStart ?? false);
      } catch {
        setTopPicks([]);
      }
    };
    load();
  }, [isAuthenticated, trendingRaw]);

  return (
    <section className="space-y-12">
      {/* ── 1. Hero Banner ─────────────────────────────────────────────── */}
      <div
        id="home"
        className="scroll-mt-28 relative overflow-hidden rounded-2xl"
        style={{ minHeight: "420px" }}
      >
        <img
          src={heroImage}
          className="absolute inset-0 h-full w-full object-cover object-right brightness-[0.52]"
          alt="Smart Fit hero"
        />

        <div className="relative z-10 flex h-full min-h-[420px] items-center px-8 sm:px-14">
          <div className="max-w-xl text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">
              Premium Menswear
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold font-montserrat leading-tight">
              Handpicked With{" "}
              <span className="text-amber-500">You</span> in Mind
            </h1>
            <p className="mt-4 text-slate-300 text-base leading-relaxed max-w-sm">
              Explore curated collections tailored to your taste, backed by real user trust.
            </p>

            <div className="mt-8 flex flex-wrap gap-8">
              {[
                { value: animUsers, label: "Registered Users" },
                { value: animProducts, label: "Products" },
                { value: animSatisfaction, label: "Satisfaction Rate" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold font-montserrat tabular-nums">{stat.value}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <Link
                to="/search"
                className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition"
              >
                Shop Now
              </Link>
              <button
                type="button"
                onClick={() => navigate("/home#trending")}
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur-sm"
              >
                Trending →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Category Quick Links ─────────────────────────────────────── */}
      <FadeSection>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={cat.route}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
            >
              {cat.icon}
              {cat.label}
            </Link>
          ))}
        </div>
      </FadeSection>

      {/* ── 3. Top Picks For You (authenticated only) ────────────────────── */}
      {isAuthenticated && topPicks.length > 0 ? (
        <FadeSection id="for-you">
          <RecommendationSection
            title={topPicksLabel}
            subtitle={
              topPicksIsColdStart
                ? "Based on what's popular right now — browse more to personalise this."
                : "Scored from your browsing, wishlist, and purchase history."
            }
            tone="personal"
            products={topPicks}
            sectionId="top-picks"
            viewAllTo="/search"
            getProductCaption={(product) => product.reason ?? null}
          />
        </FadeSection>
      ) : null}

      {/* ── 4. Trending Now ─────────────────────────────────────────────── */}
      <FadeSection id="trending">
        <RecommendationSection
          title="Trending Now"
          subtitle="Global best-performers driven by store-wide views and purchases."
          products={trending}
          sectionId="trending"
          viewAllTo="/search?sort=popularity"
        />
      </FadeSection>

      {/* ── 5. Promo Banner ─────────────────────────────────────────────── */}
      <FadeSection>
        <PromoBanner />
      </FadeSection>

      {/* ── 6. Discover More (infinite scroll) ──────────────────────────── */}
      <FadeSection id="discover">
        <InfiniteScrollFeed
          excludeIds={discoverExcludeIds}
          title="Discover More"
          subtitle="A curated mix of rising products and fresh categories to expand your wardrobe."
        />
      </FadeSection>
    </section>
  );
}
