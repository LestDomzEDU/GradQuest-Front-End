import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import DashboardScreen from "../DashboardScreen";
import { SavedAppsProvider } from "../../context/SavedAppsContext";

const mockNavigate = jest.fn();
let mockRouteParams = {};
let mockMe = { authenticated: true };

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ me: mockMe }),
}));

const okJson = (body) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

const renderDashboard = () =>
  render(
    <SavedAppsProvider>
      <DashboardScreen />
    </SavedAppsProvider>
  );

const fetchedUrls = () => global.fetch.mock.calls.map(([url]) => url);

describe("DashboardScreen", () => {
  beforeEach(() => {
    mockRouteParams = {};
    mockMe = { authenticated: true };
    global.fetch.mockClear();
  });

  test("renders the header and empty state", () => {
    mockMe = { authenticated: false };
    const { getByText } = renderDashboard();
    expect(getByText("Dashboard")).toBeTruthy();
    expect(getByText("Your dashboard")).toBeTruthy();
  });

  test("shows schools passed from ProfileIntake without refetching", () => {
    mockRouteParams = {
      topSchools: [
        { id: 1, name: "Stanford University", programName: "Computer Science MS", websiteUrl: "https://stanford.edu" },
        { id: 2, name: "Local College" },
      ],
    };
    const { getByText } = renderDashboard();

    expect(getByText("Stanford University")).toBeTruthy();
    expect(getByText("Computer Science MS")).toBeTruthy();
    expect(getByText("Program info")).toBeTruthy();
    expect(getByText("No website")).toBeTruthy();
    expect(fetchedUrls()).toEqual([]);
  });

  test("fetches top schools for the signed-in session without a userId", async () => {
    global.fetch.mockImplementationOnce(() => okJson([{ id: 7, name: "San Jose State University" }]));
    const { findByText } = renderDashboard();

    expect(await findByText("San Jose State University")).toBeTruthy();
    expect(fetchedUrls()[0]).toMatch(/\/api\/schools\/top5$/);
    expect(global.fetch.mock.calls[0][1]).toMatchObject({ credentials: "include" });
  });

  test("saving and removing a school creates and deletes its reminder", async () => {
    mockRouteParams = { topSchools: [{ id: 3, name: "Georgia Tech" }] };
    global.fetch.mockImplementation(() => okJson({}));
    const { getByText, findByText } = renderDashboard();

    fireEvent.press(getByText("Save"));
    fireEvent.press(await findByText("Remove"));
    await findByText("Save");

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const [create, remove] = global.fetch.mock.calls;
    expect(create[0]).toMatch(/\/api\/reminders\?schoolId=3$/);
    expect(create[1]).toMatchObject({ method: "POST", credentials: "include" });
    expect(remove[0]).toMatch(/\/api\/reminders\/school\/3$/);
    expect(remove[1]).toMatchObject({ method: "DELETE" });
    expect(fetchedUrls().join(" ")).not.toMatch(/userId/);
  });
});
