import React from "react";
import { render } from "@testing-library/react-native";
import HomeScreen from "../HomeScreen";

let mockParams = {};
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));

describe("HomeScreen", () => {
  it("shows the sign-in button without a notice by default", () => {
    mockParams = {};
    const { getByText, queryByText } = render(<HomeScreen />);
    expect(getByText("Sign In and Continue")).toBeTruthy();
    expect(queryByText(/session has ended/)).toBeNull();
  });

  it("tells the user their session ended when redirected after a 401", () => {
    mockParams = { sessionExpired: true };
    const { getByText } = render(<HomeScreen />);
    expect(getByText("Your session has ended. Please sign in again.")).toBeTruthy();
  });
});
