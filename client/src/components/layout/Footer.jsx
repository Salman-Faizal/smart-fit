import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// ─── Social Icons ─────────────────────────────────────────────────────────────

function InstagramIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterXIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// ─── Payment icons (simple SVG shapes) ───────────────────────────────────────

function VisaIcon() {
  return (
    <span className="inline-flex items-center justify-center rounded bg-white px-2 py-0.5 text-[10px] font-black text-blue-800 shadow-sm leading-none">
      VISA
    </span>
  );
}

function MastercardIcon() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 shadow-sm">
      <span className="inline-block h-4 w-4 rounded-full bg-red-500 opacity-90" />
      <span className="inline-block h-4 w-4 -ml-2 rounded-full bg-yellow-400 opacity-90" />
    </span>
  );
}

function GenericCardIcon() {
  return (
    <span className="inline-flex items-center justify-center rounded bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm leading-none">
      CARD
    </span>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

export default function Footer() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  // Don't render footer inside admin area
  if (isAdmin) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-slate-700/50 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-5">
        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 — Brand */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <p className="text-xl font-bold font-montserrat tracking-tight text-white">
              Smart Fit
            </p>
            <p className="mt-2 text-sm text-slate-400 italic">
              Dress sharp. Live well.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="X / Twitter"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                <TwitterXIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2 — Shop */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Shop
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/search" className="transition hover:text-white">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/search?category=Formal" className="transition hover:text-white">
                  Formal Wear
                </Link>
              </li>
              <li>
                <Link to="/search?category=Casual" className="transition hover:text-white">
                  Casual Wear
                </Link>
              </li>
              <li>
                <Link to="/search?category=Sportswear" className="transition hover:text-white">
                  Sportswear
                </Link>
              </li>
              <li>
                <Link to="/search?sort=date_desc" className="transition hover:text-white">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/home#trending" className="transition hover:text-white">
                  Trending
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 — Help */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Help
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#" className="transition hover:text-white">
                  Track Order
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Returns &amp; Exchanges
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Size Guide
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 — Account */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Account
            </h3>
            <ul className="space-y-2.5 text-sm">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/profile" className="transition hover:text-white">
                      My Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/profile?tab=wishlist" className="transition hover:text-white">
                      Wishlist
                    </Link>
                  </li>
                  <li>
                    <Link to="/profile?tab=orders" className="transition hover:text-white">
                      Order History
                    </Link>
                  </li>
                  <li>
                    <Link to="/checkout" className="transition hover:text-white">
                      Cart
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/signin" className="transition hover:text-white">
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link to="/signin" className="transition hover:text-white">
                      Create Account
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────── */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            &copy; {year} Smart Fit. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs text-slate-500">Secure payments:</span>
            <VisaIcon />
            <MastercardIcon />
            <GenericCardIcon />
          </div>
        </div>
      </div>
    </footer>
  );
}
