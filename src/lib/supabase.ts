/*
 * Intentionally disabled.
 * This file is kept only as historical reference and has no runtime effect.
 * Frontend now uses backend APIs only.
 */
// import Constants from "expo-constants";
// import { createClient } from "@supabase/supabase-js";
//
// function readFromExpoExtra(key) {
//   try {
//     const manifestAny = Constants.manifest || Constants.expoConfig;
//     return (manifestAny && manifestAny.extra && manifestAny.extra[key]) || undefined;
//   } catch (e) {
//     return undefined;
//   }
// }
//
// const SUPABASE_URL =
//   (process?.env && process.env.EXPO_PUBLIC_SUPABASE_URL) ||
//   readFromExpoExtra("EXPO_PUBLIC_SUPABASE_URL") ||
//   "";
//
// const SUPABASE_ANON_KEY =
//   (process?.env && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
//   readFromExpoExtra("EXPO_PUBLIC_SUPABASE_ANON_KEY") ||
//   "";
//
// export function isSupabaseConfigured() {
//   return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
// }
//
// if (!isSupabaseConfigured()) {
//   console.warn(
//     "[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY at runtime."
//   );
// }
//
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//   auth: {
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: false,
//   },
// });

