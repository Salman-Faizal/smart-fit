import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../hooks/useAuth";
import { api, assetUrl } from "../../lib/api";

function CartIcon({ count }) {
  return (
    <Link
      to="/checkout"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
      aria-label="Go to cart"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path d="M3 5h2l2.2 9.1a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H7" />
        <circle cx="10" cy="19" r="1.2" />
        <circle cx="17" cy="19" r="1.2" />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const { pathname } = useLocation();

  const loadCartCount = async () => {
    try {
      const data = await api.getCart();
      const totalItems = (data.cart?.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      );
      setCartCount(totalItems);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    const onCartChanged = () => {
      loadCartCount();
    };

    window.addEventListener("cart:changed", onCartChanged);

    return () => {
      window.removeEventListener("cart:changed", onCartChanged);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("cart:changed"));
  }, [pathname]);

  const avatarUrl = useMemo(
    () => assetUrl(user?.avatar?.url) || "https://placehold.co/100x100?text=U",
    [user?.avatar?.url],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/home" className="flex items-center gap-3">
            <img src={logo} alt="Smart Fit" className="h-9" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <NavLink
              to="/home"
              className="text-sm font-medium text-slate-700 hover:text-amber-600"
            >
              Home
            </NavLink>
            <NavLink
              to="/profile"
              className="text-sm font-medium text-slate-700 hover:text-amber-600"
            >
              Profile
            </NavLink>
            <NavLink
              to="/checkout"
              className="text-sm font-medium text-slate-700 hover:text-amber-600"
            >
              Checkout
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <CartIcon count={cartCount} />
            <img
              src={avatarUrl}
              alt="User avatar"
              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
            />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500">Customer</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
