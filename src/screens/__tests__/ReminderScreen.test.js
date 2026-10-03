import React from "react";
import { render } from "@testing-library/react-native";
import ReminderScreen from "../ReminderScreen";

let mockMe = { authenticated: true };

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ me: mockMe }),
}));

describe("ReminderScreen", () => {
  beforeEach(() => {
    mockMe = { authenticated: true };
    global.fetch.mockClear();
  });

  it("loads the session user's reminders without a userId", async () => {
    global.fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 1, title: "Application deadline: UC San Diego", reminderDate: "2027-01-15", isCompleted: false },
          ]),
      })
    );
    const { getByText, findByText } = render(<ReminderScreen />);

    expect(getByText("Reminders")).toBeTruthy();
    expect(await findByText("Application deadline: UC San Diego")).toBeTruthy();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/reminders$/);
    expect(options).toMatchObject({ credentials: "include" });
  });

  it("shows the empty state and skips the API when signed out", async () => {
    mockMe = { authenticated: false };
    const { findByText } = render(<ReminderScreen />);

    expect(await findByText("No reminders yet.")).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
