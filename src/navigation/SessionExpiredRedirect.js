import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const SIGNED_OUT_ROUTES = ["Loading", "Home", "OAuth"];

// Sends the user back to Home when their session ends while they're inside the app.
export default function SessionExpiredRedirect({ navigationRef }) {
  const { me } = useAuth();

  useEffect(() => {
    if (!me?.sessionExpired || !navigationRef.isReady()) return;
    const current = navigationRef.getCurrentRoute()?.name;
    if (SIGNED_OUT_ROUTES.includes(current)) return;
    navigationRef.reset({
      index: 0,
      routes: [{ name: "Home", params: { sessionExpired: true } }],
    });
  }, [me, navigationRef]);

  return null;
}
