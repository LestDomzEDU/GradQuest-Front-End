import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import SettingsScreen from "../SettingsScreen";

const mockNavigate = jest.fn();
const mockRefresh = jest.fn(() => Promise.resolve());
let mockMe = null;

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useNavigation: () => ({ navigate: mockNavigate, reset: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: (effect) => React.useEffect(effect, [effect]),
  };
});

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ me: mockMe, refresh: mockRefresh }),
}));

describe("SettingsScreen", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockRefresh.mockClear();
  });

  it("shows a loading label instead of 'Unknown User' before /api/me loads", () => {
    mockMe = null;
    const { getByText, queryByText } = render(<SettingsScreen />);
    expect(getByText("Loading…")).toBeTruthy();
    expect(queryByText("Unknown User")).toBeNull();
  });

  it("shows the signed-in user's name and refreshes on focus", async () => {
    mockMe = { authenticated: true, name: "Test User", login: "testuser" };
    const { getByText } = render(<SettingsScreen />);
    expect(getByText("Test User")).toBeTruthy();
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("navigates to ProfileIntake from Adjust Preferences", async () => {
    mockMe = { authenticated: true, name: "Test User" };
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText("Adjust Preferences"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("ProfileIntake"));
  });
});
