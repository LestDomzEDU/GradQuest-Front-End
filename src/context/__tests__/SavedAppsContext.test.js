import React from "react";
import { Text } from "react-native";
import { render, act, waitFor } from "@testing-library/react-native";
import { SavedAppsProvider, useSavedApps, remindersToSavedApps } from "../SavedAppsContext";

let mockMe = { authenticated: true, userId: 1 };
jest.mock("../AuthContext", () => ({
  useAuth: () => ({ me: mockMe }),
}));

const ok = (body) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status) =>
  Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) });

const REMINDERS = [
  { id: 1, schoolId: 5, schoolName: "UC San Diego", programName: "MS CS", websiteUrl: "https://ucsd.edu" },
  { id: 2, schoolId: null, title: "Custom" },
  { id: 3, schoolId: 5, schoolName: "UC San Diego" },
];

let ctx;
function Probe() {
  ctx = useSavedApps();
  return <Text>{ctx.savedApps.map((a) => a.name).join(",") || "none"}</Text>;
}

const renderProvider = () =>
  render(
    <SavedAppsProvider>
      <Probe />
    </SavedAppsProvider>
  );

describe("SavedAppsContext", () => {
  beforeEach(() => {
    mockMe = { authenticated: true, userId: 1 };
    global.fetch.mockReset();
  });

  it("maps reminders to one saved school per schoolId and skips non-school reminders", () => {
    expect(remindersToSavedApps(REMINDERS)).toEqual([
      { id: 5, name: "UC San Diego", company: "MS CS", link: "https://ucsd.edu" },
    ]);
    expect(remindersToSavedApps(null)).toEqual([]);
  });

  it("loads saved schools from /api/reminders for the signed-in user", async () => {
    global.fetch.mockImplementation(() => ok(REMINDERS));
    const { findByText } = renderProvider();

    expect(await findByText("UC San Diego")).toBeTruthy();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/reminders$/);
    expect(options).toMatchObject({ credentials: "include" });
  });

  it("does not call the backend when signed out", async () => {
    mockMe = { authenticated: false };
    const { findByText } = renderProvider();
    expect(await findByText("none")).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("saveSchool posts the reminder and keeps the school", async () => {
    global.fetch.mockImplementation((url, options = {}) =>
      options.method === "POST" ? ok({ id: 7, schoolId: 9 }) : ok([])
    );
    const { findByText } = renderProvider();
    await findByText("none");

    let result;
    await act(async () => {
      result = await ctx.saveSchool({ id: 9, name: "Rice" });
    });

    expect(result).toBe(true);
    expect(await findByText("Rice")).toBeTruthy();
    const post = global.fetch.mock.calls.find(([, o]) => o?.method === "POST");
    expect(post[0]).toMatch(/\/api\/reminders\?schoolId=9$/);
  });

  it("saveSchool rolls back when the backend rejects it", async () => {
    global.fetch.mockImplementation((url, options = {}) =>
      options.method === "POST" ? fail(400) : ok([])
    );
    const { findByText } = renderProvider();
    await findByText("none");

    let result;
    await act(async () => {
      result = await ctx.saveSchool({ id: 9, name: "Rice" });
    });

    expect(result).toBe(false);
    expect(await findByText("none")).toBeTruthy();
  });

  it("removeSchool deletes the reminder; a 404 still counts as removed", async () => {
    global.fetch.mockImplementation((url, options = {}) =>
      options.method === "DELETE" ? fail(404) : ok(REMINDERS)
    );
    const { findByText } = renderProvider();
    await findByText("UC San Diego");

    let result;
    await act(async () => {
      result = await ctx.removeSchool(5);
    });

    expect(result).toBe(true);
    expect(await findByText("none")).toBeTruthy();
    const del = global.fetch.mock.calls.find(([, o]) => o?.method === "DELETE");
    expect(del[0]).toMatch(/\/api\/reminders\/school\/5$/);
  });

  it("removeSchool restores the school when the request fails", async () => {
    global.fetch.mockImplementation((url, options = {}) =>
      options.method === "DELETE" ? Promise.reject(new Error("offline")) : ok(REMINDERS)
    );
    const { findByText } = renderProvider();
    await findByText("UC San Diego");

    let result;
    await act(async () => {
      result = await ctx.removeSchool(5);
    });

    expect(result).toBe(false);
    expect(await findByText("UC San Diego")).toBeTruthy();
  });

  it("reloadSaved picks up reminders deleted elsewhere", async () => {
    global.fetch.mockImplementation(() => ok(REMINDERS));
    const { findByText } = renderProvider();
    await findByText("UC San Diego");

    global.fetch.mockImplementation(() => ok([]));
    await act(() => ctx.reloadSaved());

    await waitFor(() => expect(ctx.savedApps).toHaveLength(0));
  });
});
