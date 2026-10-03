import React from "react";
import { render, act } from "@testing-library/react-native";
import LoadingScreen from "../LoadingScreen";

const mockReset = jest.fn();
let mockMe = null;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ reset: mockReset }),
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ me: mockMe }),
}));

describe("LoadingScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReset.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const routeAfterSplash = () => {
    act(() => jest.advanceTimersByTime(1500));
    return mockReset.mock.calls[0]?.[0]?.routes?.[0]?.name;
  };

  it("sends a signed-in user straight to the app", () => {
    mockMe = { authenticated: true, userId: 1 };
    render(<LoadingScreen />);
    expect(routeAfterSplash()).toBe("Tabs");
  });

  it("sends a signed-out user to the sign-in start page", () => {
    mockMe = { authenticated: false };
    render(<LoadingScreen />);
    expect(routeAfterSplash()).toBe("Home");
  });

  it("waits for the session check before leaving the splash", () => {
    mockMe = null;
    const { rerender } = render(<LoadingScreen />);
    act(() => jest.advanceTimersByTime(5000));
    expect(mockReset).not.toHaveBeenCalled();

    mockMe = { authenticated: true, userId: 1 };
    rerender(<LoadingScreen />);
    expect(mockReset.mock.calls[0][0].routes[0].name).toBe("Tabs");
  });
});
