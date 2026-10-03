module.exports = {
  preset: "jest-expo",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // First runs transform the RN/Expo tree and can exceed the 5s default.
  testTimeout: 15000,
};
