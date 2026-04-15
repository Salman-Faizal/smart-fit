import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import logoIcon from "../../assets/logo-icon.png";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart2,
  TrendingDown,
  HelpCircle,
  Settings,
  UserCircle,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const PRIMARY_NAV = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Orders", to: "/admin/orders", icon: ShoppingCart },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Reports", to: "/admin/reports", icon: BarChart2 },
  { label: "Forecast", to: "/admin/forecast", icon: TrendingDown },
];

const SECONDARY_NAV = [
  { label: "Profile", to: "/admin/profile", icon: UserCircle },
  { label: "Help", to: "/admin/help", icon: HelpCircle },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const PAGE_TITLES = {
  "/admin/dashboard": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/products": "Products",
  "/admin/customers": "Customers",
  "/admin/reports": "Reports",
  "/admin/forecast": "Inventory Forecast",
  "/admin/profile": "Profile",
  "/admin/help": "Help",
  "/admin/settings": "Settings",
};

function getInitials(name) {
  if (!name) return "A";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function NavItem({ item, collapsed, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
          isActive
            ? "bg-amber-600 text-white shadow-sm"
            : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : ""}`} />
          {!collapsed && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = (() => {
    const exact = PAGE_TITLES[location.pathname];
    if (exact) return exact;
    for (const key of Object.keys(PAGE_TITLES)) {
      if (location.pathname.startsWith(key + "/")) return PAGE_TITLES[key];
    }
    return "Admin";
  })();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/signin", { replace: true });
  };

  const SidebarContent = ({ onNavClick } = {}) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <img src={logoIcon} alt="Smart Fit" className="h-8 w-8 rounded-lg object-contain" />
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">Smart Fit</p>
          <p className="text-[10px] text-slate-400 leading-tight">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.to} item={item} collapsed={false} onClick={onNavClick} />
        ))}

        <div className="my-3 border-t border-slate-200" />

        {SECONDARY_NAV.map((item) => (
          <NavItem key={item.to} item={item} collapsed={false} onClick={onNavClick} />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-200 px-3 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] border-r border-slate-200 bg-[#F8F9FA] lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[220px] border-r border-slate-200 bg-[#F8F9FA] transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="lg:ml-[220px]">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-900 lg:text-lg">{pageTitle}</h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/profile")}
            className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition hover:bg-slate-100"
          >
            {user?.avatar?.url ? (
              <img
                src={user.avatar.url}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name || "Admin"}</p>
              <p className="text-[11px] text-slate-400 leading-tight">Administrator</p>
            </div>
          </button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
