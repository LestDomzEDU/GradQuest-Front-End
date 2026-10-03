import { resolveHomeRoute } from "../homeRoute";

const respond = (status) => () => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve({}) });

describe("resolveHomeRoute", () => {
  beforeEach(() => global.fetch.mockReset());

  it("sends a user without saved preferences to intake", async () => {
    global.fetch.mockImplementation(respond(404));
    expect(await resolveHomeRoute()).toEqual({ name: "ProfileIntake" });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/preferences$/);
    expect(options).toMatchObject({ credentials: "include" });
  });

  it("sends a user with saved preferences to the dashboard", async () => {
    global.fetch.mockImplementation(respond(200));
    expect(await resolveHomeRoute()).toMatchObject({ name: "Tabs", params: { screen: "Dashboard" } });
  });

  it("falls back to the dashboard when the check fails", async () => {
    global.fetch.mockImplementation(() => Promise.reject(new Error("offline")));
    expect((await resolveHomeRoute()).name).toBe("Tabs");
  });
});
