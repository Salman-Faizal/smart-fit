import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Tag } from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../hooks/useAuth";
import { api, assetUrl } from "../../lib/api";

const NAV_ITEMS = [
  { label: "Home", id: "home" },
  { label: "For You", id: "for-you" },
  { label: "Trending", id: "trending" },
  { label: "Discover", id: "discover" },
];

function CartIcon({ count }) {
  return (
    <Link
      to="/checkout"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
    >
      🛒
      {count > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M20 21a8 8 0 1 0-16 0" strokeLinecap="round" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export default function CustomerHeader({ cartCount = 0 }) {
  const { user } = useAuth();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef(null);
  const blurTimerRef = useRef(null);

  const isHomePage = pathname === "/home" || pathname === "/";

  const avatarUrl = useMemo(() => assetUrl(user?.avatar?.url), [user?.avatar?.url]);

  useEffect(() => {
    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        rafId = null;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Track active section on home page via IntersectionObserver
  useEffect(() => {
    if (!isHomePage) return;

    const sectionIds = NAV_ITEMS.map((item) => item.id);
    const observers = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.1, rootMargin: "-100px 0px -50% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [isHomePage, pathname]);

  useEffect(() => {
    if (!isHomePage || !hash) return;
    const id = hash.replace("#", "");
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [hash, isHomePage]);

  const handleNavClick = (id) => {
    if (isHomePage) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/home#${id}`);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.getSearchSuggestions(search);
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        setSelectedIndex(-1);
      } catch {
        // non-critical
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      setSearch(suggestion.label);
      setShowDropdown(false);
      setSuggestions([]);
      setSelectedIndex(-1);
      if (suggestion.type === "product") {
        navigate(`/search?q=${encodeURIComponent(suggestion.label)}`);
      } else {
        navigate(`/search?category=${encodeURIComponent(suggestion.category)}`);
      }
    },
    [navigate],
  );

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 100);
  };

  const handleFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    if (suggestions.length > 0 && search.length >= 2) setShowDropdown(true);
  };

  const highlightPrefix = (label, prefix) => {
    const idx = label.toLowerCase().indexOf(prefix.toLowerCase());
    if (idx === -1) return label;
    return (
      <>
        {label.slice(0, idx)}
        <span className="font-bold text-amber-600">{label.slice(idx, idx + prefix.length)}</span>
        {label.slice(idx + prefix.length)}
      </>
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    const normalized = search.trim();
    navigate(normalized ? `/search?q=${encodeURIComponent(normalized)}` : "/search");
  };

  const isActiveNav = (id) => isHomePage && activeSection === id;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur transition-shadow ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-5">
        {/* LOGO */}
        <Link to="/home" className="shrink-0">
          <img src={logo} alt="Smart Fit" className="h-9" />
        </Link>

        {/* NAV + SEARCH GROUP */}
        <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {/* NAV */}
          <nav className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative text-sm font-medium transition ${
                  isActiveNav(item.id)
                    ? "text-amber-600"
                    : "text-slate-500 hover:text-amber-600"
                }`}
              >
                {item.label}
                {isActiveNav(item.id) && (
                  <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-amber-600" />
                )}
              </button>
            ))}
            {/* Non-scroll links */}
            <NavLink
              to="/search"
              className={({ isActive }) =>
                `relative text-sm font-medium transition ${isActive ? "text-amber-600" : "text-slate-500 hover:text-amber-600"}`
              }
            >
              {({ isActive }) => (
                <>
                  All Products
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-amber-600" />
                  )}
                </>
              )}
            </NavLink>
          </nav>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className="flex-1 max-w-sm">
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={handleFocus}
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-20 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                autoComplete="off"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Search
              </button>

              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s.type}-${s.label}-${i}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionSelect(s);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        i === selectedIndex ? "bg-amber-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="shrink-0 text-slate-400">
                        {s.type === "category" ? (
                          <Tag className="h-4 w-4" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </span>
                      <span className="flex-1 truncate text-slate-700">
                        {highlightPrefix(s.label, search)}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {s.type === "category" ? "Category" : "Product"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT SIDE */}
        <div className="ml-auto flex items-center gap-3">
          <CartIcon count={cartCount} />

          {user ? (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium shadow-sm transition ${
                  isActive
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              {avatarUrl ? (
                <img src={avatarUrl} className="h-7 w-7 rounded-full object-cover" alt="" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                  <UserIcon />
                </span>
              )}
              <span className="hidden sm:inline">Account</span>
            </NavLink>
          ) : (
            <Link
              to="/signin"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                <UserIcon />
              </span>
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
