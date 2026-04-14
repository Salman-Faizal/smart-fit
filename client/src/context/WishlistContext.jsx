/**
 * WishlistContext — global wishlist state
 *
 * Provides:
 *   wishlistIds  Set<string>   — productIds currently in the user's wishlist
 *   isWishlisted(id) bool
 *   toggle(productId) async   — optimistic toggle, syncs with API
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const WishlistContext = createContext({
  wishlistIds: new Set(),
  isWishlisted: () => false,
  toggle: async () => {},
});

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [wishlistIds, setWishlistIds] = useState(new Set());

  // Load wishlist IDs when user authenticates
  useEffect(() => {
    if (!isAuthenticated) {
      setWishlistIds(new Set());
      return;
    }
    api.getWishlist()
      .then((data) => {
        const ids = (data.wishlist || []).map((w) =>
          String(w.product?._id ?? w.product ?? w)
        );
        setWishlistIds(new Set(ids));
      })
      .catch(() => setWishlistIds(new Set()));
  }, [isAuthenticated]);

  const toggle = useCallback(async (productId) => {
    const id = String(productId);
    const wasWishlisted = wishlistIds.has(id);

    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (wasWishlisted) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      const result = await api.toggleWishlist(productId);
      // Sync to server truth
      const newWishlist = result.wishlist || [];
      const ids = newWishlist.map((w) => String(w.product?._id ?? w.product ?? w));
      setWishlistIds(new Set(ids));
    } catch {
      // Revert optimistic update on failure
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  }, [wishlistIds]);

  const isWishlisted = useCallback(
    (productId) => wishlistIds.has(String(productId)),
    [wishlistIds]
  );

  return (
    <WishlistContext.Provider value={{ wishlistIds, isWishlisted, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
