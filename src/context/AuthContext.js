// src/context/AuthContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import API from "../lib/api";

// `me` is null until the first /api/me response arrives, then an object with `authenticated`.
const AuthContext = createContext({
  me: null,
  setMe: () => {},
  refresh: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [me, setMe] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(API.ME, { credentials: "include" });
      const data = await res.json().catch(() => ({ authenticated: false }));
      setMe(data);
      return data;
    } catch (e) {
      setMe({ authenticated: false });
      return { authenticated: false };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(API.LOGOUT, { method: "POST", credentials: "include" });
    } catch (e) {
      // Clear local state even if the backend is unreachable.
    }
    setMe({ authenticated: false });
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ me, setMe, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
