// src/lib/api.js

/**
 * Backend base URL.
 *
 * Defaults to the local Spring Boot dev server. Set EXPO_PUBLIC_API_BASE_URL to override,
 * e.g. your LAN IP when testing on a phone, or the deployed backend URL.
 *
 * Example:
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:8082
 */
const ENV_BASE =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.EXPO_PUBLIC_API_BASE_URL) ||
  "";

const DEFAULT_BASE = "http://localhost:8082";

const BASE_URL = ENV_BASE && ENV_BASE.trim() ? ENV_BASE.trim() : DEFAULT_BASE;

// Shows the "Dev login" button; the backend endpoint only exists under the dev profile.
const DEV_LOGIN_ENABLED =
  typeof process !== "undefined" &&
  process.env &&
  process.env.EXPO_PUBLIC_DEV_LOGIN === "true";

const API = {
  LOGIN_GITHUB: `${BASE_URL}/oauth2/authorization/github`,
  LOGIN_DISCORD: `${BASE_URL}/oauth2/authorization/discord`,
  OAUTH_FINAL: `${BASE_URL}/oauth2/final`,
  ME: `${BASE_URL}/api/me`,
  LOGOUT: `${BASE_URL}/api/logout`,
  DEV_LOGIN: `${BASE_URL}/dev/login`,
  DEV_LOGIN_ENABLED,
  BASE: BASE_URL,
};

export default API;
