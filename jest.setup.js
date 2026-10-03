// jest.setup.js
import "@testing-library/jest-native/extend-expect";

// Polyfill setImmediate and clearImmediate for React Native StatusBar
global.setImmediate =
  global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));
global.clearImmediate = global.clearImmediate || global.clearTimeout;

// Mock @react-navigation/native
jest.mock("@react-navigation/native", () => {
  return {
    ...jest.requireActual("@react-navigation/native"),
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    })),
  };
});

// Mock StatusBar to prevent clearImmediate issues
jest.mock("react-native/Libraries/Components/StatusBar/StatusBar", () => {
  // react-native's index uses this module directly as the component.
  const StatusBar = jest.fn(() => null);
  StatusBar.default = StatusBar;
  StatusBar.setBarStyle = jest.fn();
  StatusBar.setBackgroundColor = jest.fn();
  StatusBar.setHidden = jest.fn();
  StatusBar.setTranslucent = jest.fn();
  return StatusBar;
});

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Polyfills for React Native
global.setImmediate = global.setTimeout;
global.clearImmediate = global.clearTimeout;

// Mock Linking with all required methods
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  removeEventListener: jest.fn(),
}));

// Mock SafeAreaView
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }) => children,
}));

// Mock navigation - but simpler since we pass it in tests
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  const React = require("react");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: (effect) => React.useEffect(effect, [effect]),
  };
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Screens call the backend on mount; tests run signed out unless they override fetch.
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: false,
    status: 401,
    json: () => Promise.resolve({ authenticated: false }),
    text: () => Promise.resolve(""),
  })
);
