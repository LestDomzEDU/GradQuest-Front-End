import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import OAuthScreen from "../OAuthScreen";
import { AuthProvider, useAuth } from "../../context/AuthContext";

const mockReset = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ reset: mockReset, navigate: jest.fn() }),
}));

jest.mock("react-native-webview", () => ({ WebView: () => null }));

jest.mock("../../lib/api", () => ({
  __esModule: true,
  apiFetch: (path, options = {}) => global.fetch(`http://api.test${path}`, { credentials: "include", ...options }),
  default: {
    ME: "http://api.test/api/me",
    LOGOUT: "http://api.test/api/logout",
    DEV_LOGIN: "http://api.test/dev/login",
    DEV_LOGIN_ENABLED: true,
    LOGIN_GITHUB: "http://api.test/oauth2/authorization/github",
    LOGIN_DISCORD: "http://api.test/oauth2/authorization/discord",
    OAUTH_FINAL: "http://api.test/oauth2/final",
  },
}));

let sharedMe;
function SharedMeProbe() {
  sharedMe = useAuth().me;
  return null;
}

describe("OAuthScreen", () => {
  beforeEach(() => {
    mockReset.mockClear();
    global.fetch.mockReset();
  });

  const mockBackend = ({ preferencesStatus }) => {
    let signedIn = false;
    global.fetch.mockImplementation((url) => {
      if (url.includes("/dev/login")) {
        signedIn = true;
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      if (url.includes("/api/preferences")) {
        return Promise.resolve({ ok: preferencesStatus === 200, status: preferencesStatus, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(signedIn ? { authenticated: true, userId: 1, name: "Dev tester" } : { authenticated: false }),
      });
    });
  };

  const devLogin = async () => {
    const { findByText } = render(
      <AuthProvider>
        <SharedMeProbe />
        <OAuthScreen />
      </AuthProvider>
    );
    fireEvent.press(await findByText("Dev login (local only)"));
    await waitFor(() => expect(mockReset).toHaveBeenCalled());
    return mockReset.mock.calls[0][0].routes[0].name;
  };

  it("dev login updates the shared auth state and opens the dashboard for a returning user", async () => {
    mockBackend({ preferencesStatus: 200 });
    expect(await devLogin()).toBe("Tabs");
    expect(sharedMe).toMatchObject({ authenticated: true, userId: 1 });
  });

  it("sends a new user without saved preferences to intake", async () => {
    mockBackend({ preferencesStatus: 404 });
    expect(await devLogin()).toBe("ProfileIntake");
  });
});
