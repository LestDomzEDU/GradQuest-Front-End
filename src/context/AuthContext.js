// src/context/AuthContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import API from "../lib/api";

const AuthContext = createContext({
  me: null,
  setMe: () => {},
  refresh: async () => {},
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

  // Refresh on mount (optional)
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ me, setMe, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
