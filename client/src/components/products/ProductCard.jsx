/**
 * ProductCard — premium minimalist card inspired by COS / Mr Porter / SSENSE.
 *
 * Changes vs old version:
 *  - Removed "View" button (whole card navigates to product page)
 *  - Image takes ~65% of card height with subtle hover zoom (scale 1.03)
 *  - Floating action row on image hover: Wishlist ♥ + Add to Cart icons
 *  - Wishlist: filled/unfilled state from global WishlistContext (optimistic UI)
 *  - Add to Cart: disabled + greyed when out of stock
 *  - Fake star rating seeded deterministically from product ID
 *  - Stock badge top-left: "Almost Sold Out" (red) or "Out of Stock" (dark grey)
 *  - Trend/New badge top-right: "Top Selling" (gold) or "New Arrival" (blue)
 *    - If both apply, show only "Top Selling"
 *  - Price displayed as LKR
 *  - Very subtle shadow, slight rounded corners, no border
 *  - Out of stock: card is slightly greyed; cart icon disabled
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { assetUrl } from "../../lib/api";
import { formatLKR } from "../../lib/formatLKR";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { trackActivity } from "../../lib/trackActivity";

const PLACEHOLDER = "https://placehold.co/400x500?text=No+Image";

// ─── Seeded helpers ───────────────────────────────────────────────────────────

/** Simple deterministic hash for a string (non-negative). */
function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Returns a stable fake rating { rating: "4.7", reviews: 128 }
 * seeded from the product ID so it never changes across renders.
 */
function seededRating(productId) {
  const id = String(productId || "x");
  const h1 = simpleHash(id);
  const h2 = simpleHash(id + "rev");
  const rating = (4.1 + (h1 % 9) * 0.1).toFixed(1);
  const reviews = 40 + (h2 % 261);
  return { rating, reviews };
}

// ─── SVG icon helpers ─────────────────────────────────────────────────────────

function HeartIcon({ filled = false, className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill={filled ? "currentColor" : "none"} stroke="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CartPlusIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

function StarIcon({ filled = true, className = "h-3.5 w-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" strokeWidth="1.5"
      fill={filled ? "currentColor" : "none"} stroke="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ─── Stars row ────────────────────────────────────────────────────────────────

function StarRating({ rating }) {
  const full = Math.floor(Number(rating));
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} filled={i < full} className="h-3 w-3" />
      ))}
    </span>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

export default function ProductCard({
  product,
  to,
  onImageClick,
  isTopSelling: isTopSellingProp,
  // optional boolean override: if provided, replaces the internal 7-day calculation
  isNewArrival: isNewArrivalProp,
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();

  const [cartState, setCartState] = useState("idle"); // idle | adding | added

  if (!product) return null;

  const productId = String(product._id);
  const destination = to || `/products/${productId}`;

  // ── Derived values ─────────────────────────────────────────────────────────
  const stock = Number(product.stock ?? 1);
  const isOutOfStock = stock === 0;
  const isAlmostSoldOut = stock > 0 && stock <= 5;
  const wishlisted = isAuthenticated ? isWishlisted(productId) : false;

  // Top-selling: either passed explicitly, or badge from recommendation API
  const badgeStr = String(product.badge || "").toLowerCase();
  const isTopSelling =
    isTopSellingProp ||
    badgeStr.includes("top") ||
    badgeStr.includes("trending") ||
    badgeStr.includes("selling");

  // New Arrival: parent can override; fallback is 7-day threshold
  const isNewArrival =
    isNewArrivalProp !== undefined
      ? isNewArrivalProp && !isTopSelling
      : !isTopSelling &&
        product.createdAt &&
        Date.now() - new Date(product.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  const { rating, reviews } = seededRating(productId);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    await toggleWishlist(productId);
    trackActivity(wishlisted ? "wishlist_remove" : "wishlist_add", productId);
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || cartState !== "idle") return;
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    setCartState("adding");
    try {
      await api.addToCart({ productId, quantity: 1 });
      trackActivity("cart_add", productId);
      setCartState("added");
      setTimeout(() => setCartState("idle"), 2000);
    } catch {
      setCartState("idle");
    }
  };

  const handleCardClick = (e) => {
    if (onImageClick) onImageClick();
  };

  return (
    <article
      className={`group relative overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md ${
        isOutOfStock ? "opacity-70" : ""
      }`}
      style={{ cursor: "pointer" }}
      onClick={handleCardClick}
    >
      {/* ── Clickable wrapper ─────────────────────────────────────────────── */}
      <Link
        to={destination}
        className="block"
        tabIndex={-1}
        aria-hidden="true"
        onClick={(e) => e.stopPropagation()}
      />

      {/* ── Image area ───────────────────────────────────────────────────── */}
      <Link to={destination} className="relative block overflow-hidden bg-slate-100" style={{ paddingBottom: "115%" }}>
        <img
          src={assetUrl(product.primaryImage || product.images?.[0]) || PLACEHOLDER}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER; }}
        />

        {/* Top-right badges — priority: Almost Sold Out > Top Selling > New Arrival > Out of Stock, max 2 */}
        {(() => {
          const badges = [];
          if (isAlmostSoldOut) badges.push({ key: "almost", label: "⚡ Almost Sold Out" });
          else if (isOutOfStock) badges.push({ key: "out", label: "🚫 Out of Stock" });
          if (isTopSelling) badges.push({ key: "top", label: "🔥 Top Selling" });
          else if (isNewArrival) badges.push({ key: "new", label: "✨ New Arrival" });
          const shown = badges.slice(0, 2);
          if (!shown.length) return null;
          return (
            <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
              {shown.map((b) => (
                <span key={b.key} className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white leading-none shadow-sm backdrop-blur-sm">
                  {b.label}
                </span>
              ))}
            </div>
          );
        })()}

        {/* Floating action row — appears on hover */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 px-3 pb-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {/* Wishlist button */}
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors active:scale-95 ${
              wishlisted
                ? "bg-rose-500 text-white"
                : "bg-white/95 text-slate-700 hover:bg-rose-50 hover:text-rose-500"
            }`}
          >
            <HeartIcon filled={wishlisted} className="h-4 w-4" />
          </button>

          {/* Add to cart button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || cartState === "adding"}
            aria-label="Add to cart"
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors active:scale-95 ${
              isOutOfStock
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : cartState === "added"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/95 text-slate-700 hover:bg-amber-50 hover:text-amber-600"
            }`}
          >
            {cartState === "added" ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <CartPlusIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </Link>

      {/* ── Product info ─────────────────────────────────────────────────── */}
      <Link to={destination} className="block px-3 pb-4 pt-3 space-y-1.5">
        {/* Product name */}
        <h3 className="line-clamp-1 text-sm font-medium text-slate-900 leading-snug">
          {product.name}
        </h3>

        {/* Rating row */}
        <div className="flex items-center gap-1.5">
          <StarRating rating={rating} />
          <span className="text-[11px] text-slate-400">
            {rating} ({reviews} reviews)
          </span>
        </div>

        {/* Price */}
        <p className="text-sm font-semibold text-slate-900">
          {formatLKR(product.price)}
        </p>
      </Link>
    </article>
  );
}
