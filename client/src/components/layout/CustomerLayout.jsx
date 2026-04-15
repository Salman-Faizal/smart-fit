import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import CustomerHeader from "../../components/layout/CustomerHeader";
import Footer from "../../components/layout/Footer";
import QuizFloatingCTA from "../recs/QuizFloatingCTA";
import { api } from "../../lib/api";

export default function CustomerLayout() {
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
    return () => window.removeEventListener("cart:changed", onCartChanged);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("cart:changed"));
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <CustomerHeader cartCount={cartCount} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 pb-8 pt-[110px] sm:px-5">
        <Outlet />
      </main>
      <Footer />
      <QuizFloatingCTA />
    </div>
  );
}
