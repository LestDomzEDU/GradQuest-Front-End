import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiFetch } from "../lib/api";

// Saved schools are derived from the user's reminders: saving a school creates its
// deadline reminder, and removing it deletes that reminder.

const SavedAppsContext = createContext({
  savedApps: [],
  saveSchool: async (app) => true,
  removeSchool: async (id) => true,
  reloadSaved: async () => {},
});

export function remindersToSavedApps(reminders) {
  const seen = new Set();
  const apps = [];
  for (const r of Array.isArray(reminders) ? reminders : []) {
    if (r?.schoolId == null || seen.has(r.schoolId)) continue;
    seen.add(r.schoolId);
    apps.push({
      id: r.schoolId,
      name: r.schoolName ?? "Untitled",
      company: r.programName ?? "Program info",
      link: r.websiteUrl ?? null,
    });
  }
  return apps;
}

export function SavedAppsProvider({ children }) {
  const [savedApps, setSavedApps] = useState([]);
  const { me } = useAuth();
  const userId = me?.authenticated ? me.userId ?? me.id : null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const savedRef = useRef(savedApps);
  const updateSaved = useCallback((next) => {
    savedRef.current = typeof next === "function" ? next(savedRef.current) : next;
    setSavedApps(savedRef.current);
  }, []);

  const reloadSaved = useCallback(async () => {
    const requestedFor = userIdRef.current;
    if (requestedFor == null) {
      updateSaved([]);
      return;
    }
    try {
      const res = await apiFetch("/api/reminders");
      if (!res.ok) return;
      const data = await res.json();
      // Ignore answers that arrive after a logout or account switch.
      if (userIdRef.current === requestedFor) {
        updateSaved(remindersToSavedApps(data));
      }
    } catch (e) {
      // Keep the current list; the next reload will retry.
    }
  }, [updateSaved]);

  // Saved schools belong to one user; drop them on logout or account switch.
  useEffect(() => {
    updateSaved([]);
    reloadSaved();
  }, [userId, reloadSaved, updateSaved]);

  // Returns false (after rolling back) when the backend didn't save it.
  const saveSchool = useCallback(async (app) => {
    const added = !savedRef.current.find((a) => a.id === app.id);
    if (added) updateSaved((prev) => [app, ...prev]);
    try {
      const res = await apiFetch(`/api/reminders?schoolId=${app.id}`, { method: "POST" });
      if (res.ok) return true;
    } catch (e) {}
    if (added) updateSaved((prev) => prev.filter((a) => a.id !== app.id));
    return false;
  }, [updateSaved]);

  // Returns false (after restoring the school) when the backend didn't remove it.
  const removeSchool = useCallback(async (id) => {
    const index = savedRef.current.findIndex((a) => a.id === id);
    const removed = index === -1 ? null : savedRef.current[index];
    if (removed) updateSaved((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await apiFetch(`/api/reminders/school/${id}`, { method: "DELETE" });
      // 404 means there was nothing saved for this school, which is the goal anyway.
      if (res.ok || res.status === 404) return true;
    } catch (e) {}
    if (removed) {
      updateSaved((prev) => {
        if (prev.find((a) => a.id === id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
    }
    return false;
  }, [updateSaved]);

  return (
    <SavedAppsContext.Provider value={{ savedApps, saveSchool, removeSchool, reloadSaved }}>
      {children}
    </SavedAppsContext.Provider>
  );
}

export function useSavedApps() {
  return useContext(SavedAppsContext);
}

export default SavedAppsContext;
