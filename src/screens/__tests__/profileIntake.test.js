import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ProfileIntake from "../profileIntake";

const mockNavigate = jest.fn();
let mockMe = { authenticated: false };

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ me: mockMe }),
}));

const SAVED = {
  budget: 20000,
  schoolYear: "2027",
  expectedGrad: "2028-05-15",
  schoolType: "PUBLIC",
  state: "CA",
  programType: "Computer Science",
  major: "Computer Science",
  enrollmentType: "FULL_TIME",
  modality: "IN_PERSON",
  gpa: 3.5,
  requirementType: "NEITHER",
};

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body), text: () => Promise.resolve("") });

describe("ProfileIntake", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    global.fetch.mockReset();
    mockMe = { authenticated: false };
  });

  test("renders the full intake form", () => {
    const { getByText, getByLabelText } = render(<ProfileIntake />);
    expect(getByText("Profile Intake")).toBeTruthy();
    expect(getByText("Location State")).toBeTruthy();
    expect(getByLabelText("Expected Graduation Date")).toBeTruthy();
    expect(getByText("Save profile")).toBeTruthy();
  });

  test("accepts a budget value", () => {
    const { getByLabelText } = render(<ProfileIntake />);
    fireEvent.changeText(getByLabelText("Budget (USD)"), "15000");
    expect(getByLabelText("Budget (USD)").props.value).toBe("15000");
  });

  test("prefills saved preferences for a signed-in user", async () => {
    mockMe = { authenticated: true, userId: 1 };
    global.fetch.mockImplementation(() => json(200, SAVED));
    const { findByDisplayValue, getByText } = render(<ProfileIntake />);

    expect(await findByDisplayValue("2028-05-15")).toBeTruthy();
    expect(getByText("CA")).toBeTruthy();
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/preferences$/);
  });

  test("saving posts preferences without a userId and opens the dashboard with the top 5", async () => {
    mockMe = { authenticated: true, userId: 1 };
    const topSchools = [{ id: 1, name: "UC San Diego" }];
    global.fetch.mockImplementation((url, options = {}) => {
      if (url.endsWith("/api/schools/top5")) return json(200, topSchools);
      if (options.method === "POST") return json(200, JSON.parse(options.body));
      return json(200, SAVED);
    });
    const { findByDisplayValue, getByText } = render(<ProfileIntake />);
    await findByDisplayValue("2028-05-15");

    fireEvent.press(getByText("Save profile"));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("Tabs", { screen: "Dashboard", params: { topSchools } })
    );
    const [saveUrl, saveOptions] = global.fetch.mock.calls.find(([, o]) => o?.method === "POST");
    expect(saveUrl).toMatch(/\/api\/preferences$/);
    expect(saveOptions).toMatchObject({ credentials: "include" });
    expect(JSON.parse(saveOptions.body)).toMatchObject({ state: "CA", expectedGrad: "2028-05-15", schoolType: "PUBLIC" });
    expect(saveOptions.body).not.toMatch(/userId/);
  });
});
