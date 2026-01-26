// src/lib/api.js
import { Platform } from "react-native";

/**
 * Base URL for the backend.
 *
 * Local development:
 * - Web on same machine: http://localhost:8081
 * - Phone / Expo Go: http://<YOUR_LAN_IP>:8081
 *
 * Set via PowerShell:
 *   $env:EXPO_PUBLIC_API_BASE_URL="http://localhost:8081"
 * or
 *   $env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.50:8081"
 */
const ENV_BASE =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.EXPO_PUBLIC_API_BASE_URL) ||
  "";

// Fallback if env var is not set
const DEFAULT_BASE = "http://localhost:8081";

// Final backend base URL
const BASE_URL = ENV_BASE && ENV_BASE.trim()
  ? ENV_BASE.trim()
  : DEFAULT_BASE;

// Centralized API endpoints
const API = {
  // ---- OAuth login endpoints (Spring Security defaults) ----
  LOGIN_GITHUB: `${BASE_URL}/oauth2/authorization/github`,
  LOGIN_DISCORD: `${BASE_URL}/oauth2/authorization/discord`,

  // Backend OAuth success handler
  OAUTH_FINAL: `${BASE_URL}/oauth2/final`,

  // ---- Session / user endpoints ----
  ME: `${BASE_URL}/api/me`,
  LOGOUT: `${BASE_URL}/api/logout`,

  // ---- Base ----
  BASE: BASE_URL,
};

export default API;
