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
    expect(getByText("Location State (required)")).toBeTruthy();
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

  const postCalls = () => global.fetch.mock.calls.filter(([, o]) => o?.method === "POST");

  test("a blank graduation date blocks the save with a message", async () => {
    const { getByText, findByText } = render(<ProfileIntake />);
    fireEvent.press(getByText("Save profile"));

    expect(await findByText("Enter your expected graduation date as YYYY-MM-DD.")).toBeTruthy();
    expect(postCalls()).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("an invalid graduation date blocks the save", async () => {
    const { getByText, getByLabelText, findByText } = render(<ProfileIntake />);
    fireEvent.changeText(getByLabelText("Expected Graduation Date"), "May 2028");
    fireEvent.press(getByText("Save profile"));

    expect(await findByText("Enter your expected graduation date as YYYY-MM-DD.")).toBeTruthy();
    expect(postCalls()).toHaveLength(0);
  });

  test("a missing state blocks the save with a message", async () => {
    const { getByText, getByLabelText, findByText } = render(<ProfileIntake />);
    fireEvent.changeText(getByLabelText("Expected Graduation Date"), "2028-05-15");
    fireEvent.press(getByText("Save profile"));

    expect(await findByText("Choose a location state.")).toBeTruthy();
    expect(postCalls()).toHaveLength(0);
  });

  test("a failed save shows an error and stays on the form", async () => {
    mockMe = { authenticated: true, userId: 1 };
    global.fetch.mockImplementation((url, options = {}) =>
      options.method === "POST" ? json(400, { error: "Failed to save preferences" }) : json(200, SAVED)
    );
    const { findByDisplayValue, getByText, findByText } = render(<ProfileIntake />);
    await findByDisplayValue("2028-05-15");

    fireEvent.press(getByText("Save profile"));

    expect(await findByText("We couldn't save your preferences. Please try again.")).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("a network failure on save shows an error and stays on the form", async () => {
    mockMe = { authenticated: true, userId: 1 };
    global.fetch.mockImplementation((url, options = {}) =>
      options.method === "POST" ? Promise.reject(new Error("offline")) : json(200, SAVED)
    );
    const { findByDisplayValue, getByText, findByText } = render(<ProfileIntake />);
    await findByDisplayValue("2028-05-15");

    fireEvent.press(getByText("Save profile"));

    expect(await findByText("We couldn't reach the server. Check your connection and try again.")).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("if only the top-5 lookup fails, the saved user still reaches the dashboard", async () => {
    mockMe = { authenticated: true, userId: 1 };
    global.fetch.mockImplementation((url, options = {}) => {
      if (url.endsWith("/api/schools/top5")) return json(500, {});
      if (options.method === "POST") return json(200, SAVED);
      return json(200, SAVED);
    });
    const { findByDisplayValue, getByText } = render(<ProfileIntake />);
    await findByDisplayValue("2028-05-15");

    fireEvent.press(getByText("Save profile"));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("Tabs", { screen: "Dashboard", params: undefined }));
  });
});
