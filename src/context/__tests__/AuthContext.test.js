import React from "react";
import { Text } from "react-native";
import { render, act, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../AuthContext";
import { SavedAppsProvider, useSavedApps } from "../SavedAppsContext";
import { apiFetch } from "../../lib/api";

const jsonResponse = (body) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

const sessionWithSaved = (userId) => (url) =>
  url.endsWith("/api/reminders")
    ? jsonResponse([{ id: 9, schoolId: 5, schoolName: "UC San Diego" }])
    : jsonResponse({ authenticated: true, userId });

let ctx;
function Probe() {
  ctx = { ...useAuth(), ...useSavedApps() };
  return <Text>{ctx.me?.authenticated ? `user:${ctx.me.userId}` : "signed-out"}</Text>;
}

const renderProviders = () =>
  render(
    <AuthProvider>
      <SavedAppsProvider>
        <Probe />
      </SavedAppsProvider>
    </AuthProvider>
  );

describe("AuthContext", () => {
  beforeEach(() => {
    global.fetch.mockReset();
  });

  it("loads the session on mount", async () => {
    global.fetch.mockImplementation(() => jsonResponse({ authenticated: true, userId: 1 }));
    const { findByText } = renderProviders();
    expect(await findByText("user:1")).toBeTruthy();
  });

  it("logout calls the backend, clears the user and their saved schools", async () => {
    global.fetch.mockImplementation(sessionWithSaved(1));
    const { findByText } = renderProviders();
    await findByText("user:1");
    await waitFor(() => expect(ctx.savedApps).toHaveLength(1));

    await act(() => ctx.logout());

    expect(await findByText("signed-out")).toBeTruthy();
    expect(ctx.savedApps).toHaveLength(0);
    const [url, options] = global.fetch.mock.calls.at(-1);
    expect(url).toMatch(/\/api\/logout$/);
    expect(options).toMatchObject({ method: "POST", credentials: "include" });
  });

  it("logout still clears local state when the backend is unreachable", async () => {
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ authenticated: true, userId: 1 }))
      .mockImplementationOnce(() => Promise.reject(new Error("offline")));
    const { findByText } = renderProviders();
    await findByText("user:1");

    await act(() => ctx.logout());
    expect(await findByText("signed-out")).toBeTruthy();
  });

  it("a 401 from the API signs the user out, marks the session expired and clears saved schools", async () => {
    global.fetch.mockImplementation(sessionWithSaved(1));
    const { findByText } = renderProviders();
    await findByText("user:1");
    await waitFor(() => expect(ctx.savedApps).toHaveLength(1));

    global.fetch.mockImplementation(() => Promise.resolve({ ok: false, status: 401 }));
    await act(() => apiFetch("/api/schools/top5"));

    expect(await findByText("signed-out")).toBeTruthy();
    expect(ctx.me).toEqual({ authenticated: false, sessionExpired: true });
    expect(ctx.savedApps).toHaveLength(0);
  });

  it("a 401 while already signed out does not mark the session expired", async () => {
    global.fetch.mockImplementation(() => jsonResponse({ authenticated: false }));
    const { findByText } = renderProviders();
    await findByText("signed-out");
    await waitFor(() => expect(ctx.me).toEqual({ authenticated: false }));

    global.fetch.mockImplementation(() => Promise.resolve({ ok: false, status: 401 }));
    await act(() => apiFetch("/api/preferences"));

    expect(ctx.me).toEqual({ authenticated: false });
  });

  it("switching accounts drops the previous user's saved schools", async () => {
    global.fetch.mockImplementation(sessionWithSaved(1));
    const { findByText } = renderProviders();
    await findByText("user:1");
    await waitFor(() => expect(ctx.savedApps).toHaveLength(1));

    global.fetch.mockImplementation((url) =>
      url.endsWith("/api/reminders") ? jsonResponse([]) : jsonResponse({ authenticated: true, userId: 2 })
    );
    act(() => ctx.setMe({ authenticated: true, userId: 2 }));

    expect(await findByText("user:2")).toBeTruthy();
    await waitFor(() => expect(ctx.savedApps).toHaveLength(0));
  });
});
