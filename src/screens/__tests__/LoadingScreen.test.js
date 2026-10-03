import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import LoadingScreen from "../LoadingScreen";

const mockReset = jest.fn();
let mockMe = null;
const mockResolveHomeRoute = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ reset: mockReset }),
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ me: mockMe }),
}));

jest.mock("../../lib/homeRoute", () => ({
  resolveHomeRoute: () => mockResolveHomeRoute(),
}));

const resetTarget = () => mockReset.mock.calls[0]?.[0]?.routes?.[0]?.name;

describe("LoadingScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReset.mockClear();
    mockResolveHomeRoute.mockReset().mockResolvedValue({ name: "Tabs" });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const finishSplash = () => act(() => jest.advanceTimersByTime(1500));

  it("sends a returning signed-in user to the app", async () => {
    mockMe = { authenticated: true, userId: 1 };
    render(<LoadingScreen />);
    finishSplash();
    await waitFor(() => expect(resetTarget()).toBe("Tabs"));
  });

  it("sends a signed-in user without preferences to intake", async () => {
    mockMe = { authenticated: true, userId: 1 };
    mockResolveHomeRoute.mockResolvedValue({ name: "ProfileIntake" });
    render(<LoadingScreen />);
    finishSplash();
    await waitFor(() => expect(resetTarget()).toBe("ProfileIntake"));
  });

  it("sends a signed-out user to the sign-in start page without calling the API", async () => {
    mockMe = { authenticated: false };
    render(<LoadingScreen />);
    finishSplash();
    await waitFor(() => expect(resetTarget()).toBe("Home"));
    expect(mockResolveHomeRoute).not.toHaveBeenCalled();
  });

  it("waits for the session check before leaving the splash", async () => {
    mockMe = null;
    const { rerender } = render(<LoadingScreen />);
    act(() => jest.advanceTimersByTime(5000));
    expect(mockReset).not.toHaveBeenCalled();

    mockMe = { authenticated: true, userId: 1 };
    rerender(<LoadingScreen />);
    await waitFor(() => expect(resetTarget()).toBe("Tabs"));
  });
});
