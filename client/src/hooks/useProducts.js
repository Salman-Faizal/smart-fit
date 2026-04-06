import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export function useProducts({ search = "", category = "" } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const query = { limit: 1000, page: 1 };
    if (search) query.search = search;
    if (category) query.category = category;
    return query;
  }, [search, category]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api.getProducts(params);
        setProducts(data.products || []);
      } catch (err) {
        setError(err.message || "Failed to fetch products");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [params]);

  return { products, loading, error, setProducts };
}
