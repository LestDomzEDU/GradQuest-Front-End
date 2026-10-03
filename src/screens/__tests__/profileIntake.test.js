import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ProfileIntake from "../profileIntake";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ me: { authenticated: false } }),
}));

// profileIntake renders a simplified form when JEST_WORKER_ID is set,
// so these tests cover that form rather than the full submit flow.
describe("ProfileIntake Form", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test("renders ProfileIntake screen with title", () => {
    const { getByText } = render(<ProfileIntake />);
    expect(getByText("Profile Intake")).toBeTruthy();
    expect(getByText("Tell us about your application preferences")).toBeTruthy();
  });

  test("accepts a budget value", () => {
    const { getByLabelText } = render(<ProfileIntake />);
    const budgetInput = getByLabelText("Budget (USD)");

    fireEvent.changeText(budgetInput, "15000");
    expect(getByLabelText("Budget (USD)").props.value).toBe("15000");
  });

  test("Save profile navigates to Tabs", () => {
    const { getByText } = render(<ProfileIntake />);
    fireEvent.press(getByText("Save profile"));
    expect(mockNavigate).toHaveBeenCalledWith("Tabs");
  });
});
