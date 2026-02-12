// src/lib/api.js

/**
 * Backend base URL.
 *
 * In production, default to Heroku.
 * In local dev, set EXPO_PUBLIC_API_BASE_URL to http://localhost:8081 or your LAN IP.
 *
 * Example:
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:8081
 */
const ENV_BASE =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.EXPO_PUBLIC_API_BASE_URL) ||
  "";

// ✅ Production fallback (Heroku)
const DEFAULT_BASE = "https://gradquest-back-end-43e1c7cf2e57.herokuapp.com";

const BASE_URL = ENV_BASE && ENV_BASE.trim() ? ENV_BASE.trim() : DEFAULT_BASE;

const API = {
  LOGIN_GITHUB: `${BASE_URL}/oauth2/authorization/github`,
  LOGIN_DISCORD: `${BASE_URL}/oauth2/authorization/discord`,
  OAUTH_FINAL: `${BASE_URL}/oauth2/final`,
  ME: `${BASE_URL}/api/me`,
  LOGOUT: `${BASE_URL}/api/logout`,
  BASE: BASE_URL,
};

export default API;
