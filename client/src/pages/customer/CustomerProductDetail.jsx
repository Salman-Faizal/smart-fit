/**
 * CustomerProductDetail — redesigned product view page.
 *
 * Changes vs old version:
 *  - Left: image gallery (main + thumbnails)
 *  - Right: category label, name, seeded rating, LKR price, description placeholder,
 *           size selector with "Size Chart" modal, quantity +/-, Add to Cart CTA,
 *           Wishlist secondary button, delivery info snippet
 *  - Below fold: tabs (Description | Details & Care | Reviews)
 *    - Reviews: 4–6 seeded fake reviews per product
 *  - Customers Also Viewed: horizontal scroll after tabs, before footer
 *  - LKR formatting throughout
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../../components/common/StatusState";
import RecommendationSection from "../../components/products/RecommendationSection";
import { api, assetUrl } from "../../lib/api";
import { formatLKR } from "../../lib/formatLKR";
import { trackActivity } from "../../lib/trackActivity";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../hooks/useAuth";

// ─── Seeded helpers ───────────────────────────────────────────────────────────

function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededRating(id) {
  const h1 = simpleHash(String(id) + "rating");
  const h2 = simpleHash(String(id) + "reviews");
  return {
    rating: (4.1 + (h1 % 9) * 0.1).toFixed(1),
    reviews: 40 + (h2 % 261),
  };
}

// ─── Fake Reviews ─────────────────────────────────────────────────────────────

const FORMAL_REVIEWS = [
  "Absolutely love the fit. The fabric feels premium and the stitching is immaculate. Perfect for the office.",
  "Wore this to a client meeting — got compliments from everyone. True to size.",
  "Smart, tailored, and comfortable all day. The slim fit is exactly what I needed.",
  "Great quality for the price. I have two of these now in different colours.",
  "The fabric breathes well even on a warm day. Classic look without being boring.",
  "Very satisfied. The collar sits perfectly and the material doesn't wrinkle easily.",
];

const CASUAL_REVIEWS = [
  "Super comfortable, works perfectly for everyday wear. The fabric is soft and lightweight.",
  "Great casual piece. Goes with everything in my wardrobe.",
  "Really happy with this purchase. The sizing is spot-on.",
  "Washed it twice already and it still looks brand new. Good quality cotton.",
  "Love the relaxed fit. Perfect for weekend outings.",
  "Exactly as described. Fast delivery, great product.",
];

const SPORTSWEAR_REVIEWS = [
  "Excellent for workouts — breathable, flexible, and stays in place during intense sessions.",
  "The moisture-wicking fabric is a game changer. No more soggy gym shirts.",
  "Great performance wear. Moves with you rather than restricting you.",
  "Comfortable for both gym sessions and casual use. Very versatile.",
  "The material is lightweight yet durable. Holds up well after multiple washes.",
  "Good value. Does everything you'd want from activewear.",
];

const REVIEWER_NAMES = [
  "Kasun P.", "Nimal F.", "Ranil S.", "Sanjay M.", "Dinesh W.",
  "Tharaka R.", "Pradeep J.", "Malith K.", "Isuru B.", "Chathu N.",
];

function getReviews(productId, category) {
  const pool = /formal/i.test(category)
    ? FORMAL_REVIEWS
    : /sport/i.test(category) || /active/i.test(category)
      ? SPORTSWEAR_REVIEWS
      : CASUAL_REVIEWS;

  const count = 4 + (simpleHash(productId + "cnt") % 3); // 4–6 reviews
  const reviews = [];
  for (let i = 0; i < count; i++) {
    const h = simpleHash(productId + i);
    const stars = 4 + (h % 2); // 4 or 5 stars
    const name = REVIEWER_NAMES[h % REVIEWER_NAMES.length];
    const text = pool[h % pool.length];
    reviews.push({ stars, name, text, id: `${productId}-${i}` });
  }
  return reviews;
}

// ─── Description placeholder ──────────────────────────────────────────────────

const PLACEHOLDERS = {
  Formal: "Crafted for the modern gentleman, this tailored piece offers a refined silhouette perfect for boardrooms and formal occasions alike.",
  Casual: "Effortlessly versatile, this everyday essential blends understated style with all-day comfort — a wardrobe staple you'll reach for again and again.",
  Sportswear: "Engineered for performance without sacrificing style. Moisture-wicking fabric and a flexible fit keep you moving freely whether at the gym or on the go.",
  Accessories: "A finishing touch that elevates any outfit. Crafted with precision and designed to complement the modern man's wardrobe.",
};

function getPlaceholderDescription(name, category) {
  const base = PLACEHOLDERS[category] || PLACEHOLDERS.Casual;
  return base;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill={filled ? "currentColor" : "none"} stroke="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function StarIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" strokeWidth="1.5"
      fill={filled ? "currentColor" : "none"} stroke="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
    </svg>
  );
}

function XIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Stars display ────────────────────────────────────────────────────────────

function StarRow({ rating, className = "" }) {
  const full = Math.floor(Number(rating));
  return (
    <span className={`flex items-center gap-0.5 text-amber-400 ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} filled={i < full} />
      ))}
    </span>
  );
}

// ─── Size chart modal ─────────────────────────────────────────────────────────

function SizeChartModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          aria-label="Close size chart"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <h3 className="mb-4 text-lg font-semibold text-slate-900">Size Chart</h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-4 py-2 text-left font-semibold text-slate-700">Size</th>
                <th className="border border-slate-200 px-4 py-2 text-left font-semibold text-slate-700">Chest (cm)</th>
                <th className="border border-slate-200 px-4 py-2 text-left font-semibold text-slate-700">Waist (cm)</th>
                <th className="border border-slate-200 px-4 py-2 text-left font-semibold text-slate-700">Hip (cm)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["XS", "84–88", "68–72", "88–92"],
                ["S", "88–92", "72–76", "92–96"],
                ["M", "92–96", "76–80", "96–100"],
                ["L", "96–100", "80–84", "100–104"],
                ["XL", "100–104", "84–88", "104–108"],
                ["XXL", "104–108", "88–92", "108–112"],
              ].map(([size, chest, waist, hip]) => (
                <tr key={size} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-4 py-2 font-medium text-slate-800">{size}</td>
                  <td className="border border-slate-200 px-4 py-2 text-slate-600">{chest}</td>
                  <td className="border border-slate-200 px-4 py-2 text-slate-600">{waist}</td>
                  <td className="border border-slate-200 px-4 py-2 text-slate-600">{hip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Measurements are body measurements. If between sizes, size up for a comfortable fit.
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const TABS = ["Description", "Details & Care", "Reviews"];

export default function CustomerProductDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [cartState, setCartState] = useState("idle"); // idle | adding | added | error
  const [cartMsg, setCartMsg] = useState("");
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [activeTab, setActiveTab] = useState("Description");
  const [alsoViewed, setAlsoViewed] = useState([]);
  const [coViewerCount, setCoViewerCount] = useState(0);

  const reviewsRef = useRef(null);

  const wishlisted = isAuthenticated && product ? isWishlisted(String(product._id)) : false;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setActiveImage(0);
        setQuantity(1);
        setSelectedSize("M");
        setCartState("idle");
        setCartMsg("");

        const data = await api.getProductById(id);
        setProduct(data);

        trackActivity("view", id);

        const alsoData = await api.getAlsoViewed(id).catch(() => ({ products: [], coViewerCount: 0 }));
        setAlsoViewed(alsoData.products || []);
        setCoViewerCount(alsoData.coViewerCount || 0);
      } catch (err) {
        setError(err.message || "Unable to fetch product");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const maxQty = useMemo(() => Math.max(1, Number(product?.stock || 1)), [product?.stock]);

  const handleAddToCart = async () => {
    if (!product || cartState === "adding") return;
    setCartState("adding");
    setCartMsg("");
    try {
      await api.addToCart({ productId: id, quantity });
      trackActivity("cart_add", id);
      setCartState("added");
      setCartMsg(`Added ${quantity} × ${product.name} (${selectedSize}) to cart`);
      setTimeout(() => setCartState("idle"), 2500);
    } catch (err) {
      setCartState("error");
      setCartMsg(err.message || "Failed to add to cart");
      setTimeout(() => setCartState("idle"), 3000);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) return;
    await toggleWishlist(id);
    trackActivity(wishlisted ? "wishlist_remove" : "wishlist_add", id);
  };

  if (loading) return <LoadingState label="Loading product..." />;
  if (error) return <ErrorState message={error} />;
  if (!product) return null;

  const images = product.images?.length
    ? product.images.map((img) => assetUrl(img))
    : ["https://placehold.co/900x700?text=Product"];

  const description =
    product.description && product.description.length > 20
      ? product.description
      : getPlaceholderDescription(product.name, product.category);

  const { rating, reviews: reviewCount } = seededRating(id);
  const fakeReviews = getReviews(id, product.category);
  const isOutOfStock = Number(product.stock) === 0;

  return (
    <section className="space-y-12">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-600 transition">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        Back to products
      </Link>

      {/* ── Main product section ──────────────────────────────────────────── */}
      <div className="grid gap-10 md:grid-cols-2">
        {/* Left — Image gallery */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={images[activeImage]}
              alt={product.name}
              className="w-full object-cover transition-all duration-500"
              style={{ aspectRatio: "4/5" }}
            />
          </div>

          {/* Thumbnails */}
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {images.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    activeImage === idx
                      ? "border-slate-900"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Right — Product info */}
        <div className="space-y-5">
          {/* Category label */}
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {product.category}
          </p>

          {/* Product name */}
          <h1 className="text-3xl font-bold leading-tight text-slate-900">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <StarRow rating={rating} />
            <span className="text-sm font-medium text-slate-700">{rating}</span>
            <span className="text-sm text-slate-400">
              ({reviewCount} reviews)
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTab("Reviews");
                setTimeout(() => reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
              }}
              className="text-sm text-amber-600 underline hover:text-amber-700"
            >
              Read reviews
            </button>
          </div>

          {/* Price */}
          <p className="text-3xl font-bold text-slate-900">
            {formatLKR(product.price)}
          </p>

          {/* Short description */}
          <p className="text-slate-600 leading-relaxed">
            {description.length > 160 ? description.slice(0, 160) + "…" : description}
          </p>

          {/* Size selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Size
              </p>
              <button
                type="button"
                onClick={() => setShowSizeChart(true)}
                className="text-xs text-amber-600 underline hover:text-amber-700"
              >
                Size Chart
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[48px] rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    selectedSize === size
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quantity</p>
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-11 w-11 items-center justify-center border-r border-slate-200 text-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="flex h-11 min-w-[52px] items-center justify-center px-4 text-base font-semibold text-slate-800">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                className="flex h-11 w-11 items-center justify-center border-l border-slate-200 text-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                disabled={quantity >= maxQty}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {isOutOfStock ? (
              <p className="text-sm text-red-500 font-medium">Currently out of stock</p>
            ) : product.stock <= 5 ? (
              <p className="text-sm text-amber-600 font-medium">Only {product.stock} left in stock</p>
            ) : null}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || cartState === "adding"}
              className={`w-full rounded-xl py-3.5 text-sm font-semibold transition ${
                isOutOfStock
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : cartState === "added"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
              }`}
            >
              {cartState === "adding"
                ? "Adding…"
                : cartState === "added"
                  ? "✓ Added to Cart"
                  : isOutOfStock
                    ? "Out of Stock"
                    : "Add to Cart"}
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleWishlist}
                className={`w-full rounded-xl border py-3.5 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                  wishlisted
                    ? "border-rose-400 bg-rose-50 text-rose-600 hover:bg-rose-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <HeartIcon filled={wishlisted} />
                {wishlisted ? "Wishlisted" : "Add to Wishlist"}
              </button>
            ) : null}
          </div>

          {cartMsg ? (
            <p className={`text-sm ${cartState === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {cartMsg}
            </p>
          ) : null}

          {/* Delivery info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <TruckIcon />
              <span>Free delivery on orders over <strong>LKR 5,000</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <ReturnIcon />
              <span>Easy <strong>14-day returns</strong> — hassle free</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs section ──────────────────────────────────────────────────── */}
      <div ref={reviewsRef} className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === "Description" && (
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-600 leading-relaxed">{description}</p>
            </div>
          )}

          {activeTab === "Details & Care" && (
            <ul className="space-y-2 text-sm text-slate-600">
              {[
                "100% Premium Cotton (or as labelled)",
                "Machine wash cold (30°C), gentle cycle",
                "Do not bleach",
                "Tumble dry low",
                "Warm iron if needed",
                "Slim fit — true to size",
                "Imported fabric, locally tailored",
                "Model is 6'1\" wearing size M",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          )}

          {activeTab === "Reviews" && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex items-center gap-4">
                <p className="text-5xl font-bold text-slate-900">{rating}</p>
                <div>
                  <StarRow rating={rating} />
                  <p className="mt-1 text-sm text-slate-500">Based on {reviewCount} reviews</p>
                </div>
              </div>

              {/* Review list */}
              <div className="space-y-5 divide-y divide-slate-100">
                {fakeReviews.map((review) => (
                  <div key={review.id} className="pt-5 first:pt-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{review.name}</p>
                        <div className="flex items-center gap-0.5 text-amber-400 mt-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <StarIcon key={i} filled={i < review.stars} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">Verified Purchase</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Customers Also Viewed ──────────────────────────────────────────── */}
      {alsoViewed.length > 0 ? (
        <div>
          {coViewerCount > 0 ? (
            <p className="mb-3 text-xs text-slate-400 italic">
              {coViewerCount.toLocaleString()} shoppers viewed these after{" "}
              <span className="font-medium text-slate-500">{product.name}</span>
            </p>
          ) : null}
          <RecommendationSection
            title="Customers Also Viewed"
            products={alsoViewed}
            sectionId="also-viewed"
          />
        </div>
      ) : null}

      {/* Size chart modal */}
      {showSizeChart ? <SizeChartModal onClose={() => setShowSizeChart(false)} /> : null}
    </section>
  );
}
