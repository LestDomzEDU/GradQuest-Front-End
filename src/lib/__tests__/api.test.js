import { apiFetch, setUnauthorizedHandler } from "../api";

const respond = (status) => Promise.resolve({ ok: status < 400, status });

describe("apiFetch", () => {
  let unregister;

  beforeEach(() => {
    global.fetch.mockReset();
  });

  afterEach(() => {
    unregister?.();
    unregister = undefined;
  });

  it("sends the session cookie and returns the response", async () => {
    global.fetch.mockImplementation(() => respond(200));
    const res = await apiFetch("/api/preferences", { method: "GET" });
    expect(res.status).toBe(200);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/preferences$/);
    expect(options).toMatchObject({ method: "GET", credentials: "include" });
  });

  it("calls the unauthorized handler on a 401 and still returns the response", async () => {
    const handler = jest.fn();
    unregister = setUnauthorizedHandler(handler);
    global.fetch.mockImplementation(() => respond(401));

    const res = await apiFetch("/api/reminders");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
  });

  it("does not call the handler for other errors", async () => {
    const handler = jest.fn();
    unregister = setUnauthorizedHandler(handler);
    global.fetch.mockImplementation(() => respond(500));

    await apiFetch("/api/reminders");
    expect(handler).not.toHaveBeenCalled();
  });

  it("stops calling the handler once unregistered", async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler)();
    global.fetch.mockImplementation(() => respond(401));

    await apiFetch("/api/reminders");
    expect(handler).not.toHaveBeenCalled();
  });
});
