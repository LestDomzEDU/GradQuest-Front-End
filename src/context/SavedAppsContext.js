import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const SavedAppsContext = createContext({
  savedApps: [],
  addSavedApp: (app) => {},
  removeSavedApp: (id) => {},
});

export function SavedAppsProvider({ children }) {
  const [savedApps, setSavedApps] = useState([]);
  const { me } = useAuth();
  const userId = me?.authenticated ? me.userId ?? me.id : null;

  // Saved schools belong to one user; drop them on logout or account switch.
  useEffect(() => {
    setSavedApps([]);
  }, [userId]);

  function addSavedApp(app) {
    setSavedApps((prev) => {
      if (prev.find((a) => a.id === app.id)) return prev;
      return [app, ...prev];
    });
  }

  function removeSavedApp(id) {
    setSavedApps((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <SavedAppsContext.Provider
      value={{ savedApps, addSavedApp, removeSavedApp }}
    >
      {children}
    </SavedAppsContext.Provider>
  );
}

export function useSavedApps() {
  return useContext(SavedAppsContext);
}

export default SavedAppsContext;
