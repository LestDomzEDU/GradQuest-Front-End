import { apiFetch } from "./api";

const DASHBOARD = {
  name: "Tabs",
  params: { screen: "Dashboard", params: { showTutorial: true } },
};
const INTAKE = { name: "ProfileIntake" };

/**
 * Where a signed-in user should land: intake until they have saved preferences
 * (GET /api/preferences returns 404), the dashboard afterwards.
 */
export async function resolveHomeRoute() {
  try {
    const res = await apiFetch("/api/preferences");
    return res.status === 404 ? INTAKE : DASHBOARD;
  } catch (e) {
    return DASHBOARD;
  }
}
