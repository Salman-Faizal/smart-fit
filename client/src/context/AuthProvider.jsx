import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { storage } from "../lib/storage";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.getToken());
  const [user, setUser] = useState(() => storage.getUser());

  const login = async (email, password) => {
    const data = await api.login({ email, password });

    storage.setToken(data.token);
    storage.setUser(data.user);

    setToken(data.token);
    setUser(data.user);

    return data.user;
  };

  const logout = () => {
    storage.clearAuth();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
