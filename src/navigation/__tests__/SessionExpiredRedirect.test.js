import React from "react";
import { render } from "@testing-library/react-native";
import SessionExpiredRedirect from "../SessionExpiredRedirect";
import { useAuth } from "../../context/AuthContext";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));

const makeRef = (routeName, ready = true) => ({
  isReady: () => ready,
  getCurrentRoute: () => ({ name: routeName }),
  reset: jest.fn(),
});

const renderWith = (me, ref) => {
  useAuth.mockReturnValue({ me });
  return render(<SessionExpiredRedirect navigationRef={ref} />);
};

describe("SessionExpiredRedirect", () => {
  it("sends the user to Home with a notice when the session expires inside the app", () => {
    const ref = makeRef("Dashboard");
    renderWith({ authenticated: false, sessionExpired: true }, ref);
    expect(ref.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: "Home", params: { sessionExpired: true } }],
    });
  });

  it("does nothing for a signed-in user", () => {
    const ref = makeRef("Dashboard");
    renderWith({ authenticated: true, userId: 1 }, ref);
    expect(ref.reset).not.toHaveBeenCalled();
  });

  it("does nothing after a normal logout (no sessionExpired flag)", () => {
    const ref = makeRef("Settings");
    renderWith({ authenticated: false }, ref);
    expect(ref.reset).not.toHaveBeenCalled();
  });

  it.each(["Loading", "Home", "OAuth"])("does not interrupt the %s screen", (routeName) => {
    const ref = makeRef(routeName);
    renderWith({ authenticated: false, sessionExpired: true }, ref);
    expect(ref.reset).not.toHaveBeenCalled();
  });

  it("waits until navigation is ready", () => {
    const ref = makeRef("Dashboard", false);
    renderWith({ authenticated: false, sessionExpired: true }, ref);
    expect(ref.reset).not.toHaveBeenCalled();
  });
});
