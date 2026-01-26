// src/screens/OAuthScreen.js
import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../lib/api";

const TUTORIAL_KEY = "tutorial:completed";

const PALETTE = {
  white: "#FFFFFF",
  blueDark: "#053F7C",
  blue: "#0061A8",
  blueSoft: "#E5F3FF",
  grayText: "#6B7280",
  gold: "#FFC727",

  githubBg: "#C7C7C7",
  discordBg: "#0D0D0D",
};

// Decide if /api/me response looks logged-in
const looksAuthenticated = (me) => {
  if (!me) return false;

  if (me.authenticated === true) return true;
  if (me.authenticated === false) return false;

  if (me.name || me.login || me.email || me.username) return true;

  return false;
};

export default function OAuthScreen() {
  const navigation = useNavigation();

  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const [showWeb, setShowWeb] = React.useState(false);
  const [loginUrl, setLoginUrl] = React.useState(null);
  const [webKey, setWebKey] = React.useState(0);

  // Track which provider the user chose ("github" | "discord" | null)
  const [currentProvider, setCurrentProvider] = React.useState(null);

  // For web polling after redirect
  const webPollRef = React.useRef(null);

  // Prevent double-navigation loops
  const didRedirectRef = React.useRef(false);

  // Load /api/me and update state
  const loadMe = React.useCallback(async () => {
    try {
      const res = await fetch(API.ME, { credentials: "include" });
      const data = await res.json();
      console.log("ME response:", data);
      setMe(data);
      return data;
    } catch (e) {
      console.warn("OAuthScreen: failed to load /api/me", e);
      setMe(null);
      return null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (webPollRef.current) {
        clearInterval(webPollRef.current);
        webPollRef.current = null;
      }
    };
  }, []);

  const isAuthed = looksAuthenticated(me);
  const avatarUri =
    me?.avatarUrl || me?.avatar_url || me?.picture || me?.avatar || null;

  const providerLabel =
    currentProvider === "github"
      ? "GitHub"
      : currentProvider === "discord"
      ? "Discord"
      : "your account";

  // ✅ This is the correct navigation target for this project:
  // Stack route "Tabs" -> tab screen "Dashboard"
  const goToDashboardTabs = React.useCallback(() => {
    didRedirectRef.current = true;

    navigation.reset({
      index: 0,
      routes: [
        {
          name: "Tabs",
          params: {
            screen: "Dashboard",
            params: { showTutorial: true },
          },
        },
      ],
    });
  }, [navigation]);

  // ✅ Auto-redirect after login is confirmed (no button required)
  React.useEffect(() => {
    if (didRedirectRef.current) return;

    // Only redirect after we are authenticated AND we are not inside the WebView anymore
    if (isAuthed && !showWeb) {
      goToDashboardTabs();
    }
  }, [isAuthed, showWeb, goToDashboardTabs]);

  const onContinue = React.useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_KEY);
    } catch (e) {
      // ignore
    }

    // Keep the project's intended navigation path
    goToDashboardTabs();
  }, [goToDashboardTabs]);

  // Start login: platform-specific behavior
  const startLogin = React.useCallback(
    async (provider) => {
      const base =
        provider === "github" ? API.LOGIN_GITHUB : API.LOGIN_DISCORD;

      // Remember which provider we are trying to use NOW
      setCurrentProvider(provider);

      // Reset redirect guard + any previous auth state
      didRedirectRef.current = false;
      setMe(null);
      setShowWeb(false);

      // Always log out the backend session before starting a new OAuth login
      try {
        await fetch(API.LOGOUT, {
          method: "POST",
          credentials: "include",
        });
      } catch (e) {
        console.warn("OAuthScreen: LOGOUT before login failed (ignored)", e);
      }

      // WEB: open OAuth in a new tab & start polling /api/me
      if (Platform.OS === "web") {
        if (webPollRef.current) {
          clearInterval(webPollRef.current);
          webPollRef.current = null;
        }

        setLoading(true);
        Linking.openURL(base);

        let attempts = 0;
        const maxAttempts = 15; // ~30s

        webPollRef.current = setInterval(async () => {
          attempts += 1;
          const data = await loadMe();

          if (looksAuthenticated(data)) {
            clearInterval(webPollRef.current);
            webPollRef.current = null;
            setLoading(false);
            setShowWeb(false);
            // ✅ the useEffect above will auto-redirect to Tabs/Dashboard
            return;
          }

          if (attempts >= maxAttempts) {
            clearInterval(webPollRef.current);
            webPollRef.current = null;
            setLoading(false);
          }
        }, 2000);

        return;
      }

      // NATIVE: use WebView inside the app
      setLoginUrl(base);
      setShowWeb(true);
      setWebKey((k) => k + 1);
    },
    [loadMe]
  );

  // Native WebView navigation handler
  const onWebNav = React.useCallback(
    async (navState) => {
      const url = navState?.url || "";

      // When backend redirects to /oauth2/final, treat it as "login complete"
      if (url.startsWith(API.OAUTH_FINAL)) {
        setLoading(true);
        try {
          const data = await loadMe();
          console.log("After native OAuth, ME =", data);
        } finally {
          setLoading(false);
          setShowWeb(false);
          // ✅ once showWeb is false and me is authenticated, useEffect redirects to Tabs/Dashboard
        }
      }
    },
    [loadMe]
  );

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Sign in</Text>
        <Image
          source={require("../../assets/gradquest_logo.png")}
          style={styles.logo}
        />
      </View>

      <View style={styles.headerAccent} />

      <View style={styles.content}>
        {/* If NOT authenticated and not inside WebView, show provider buttons */}
        {!isAuthed && !showWeb && (
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.sub}>
              Choose a provider to continue to your dashboard.
            </Text>
            <Text style={styles.subLabel}>Sign in with:</Text>

            {/* GitHub button */}
            <Pressable
              onPress={() => startLogin("github")}
              style={({ pressed }) => [
                styles.oauthBtn,
                styles.githubBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Image
                source={require("../../assets/github_horizontal.png")}
                style={styles.horizontalLogo}
              />
            </Pressable>

            <Text style={styles.orText}>--- or ---</Text>

            {/* Discord button */}
            <Pressable
              onPress={() => startLogin("discord")}
              style={({ pressed }) => [
                styles.oauthBtn,
                styles.discordBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Image
                source={require("../../assets/discord_horizontal.png")}
                style={styles.horizontalLogo}
              />
            </Pressable>
          </View>
        )}

        {/* Loading spinner during web polling or native finalization */}
        {loading && (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        )}

        {/* After successful login: usually redirects immediately now */}
        {isAuthed && !showWeb && (
          <View style={styles.card}>
            {avatarUri && (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            )}
            <Text style={styles.title}>You’re signed in</Text>

            <Text style={styles.sub}>
              Signed in with {providerLabel}. Redirecting...
            </Text>

            {/* fallback button */}
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          </View>
        )}

        {/* WebView for OAuth — native platforms only */}
        {Platform.OS !== "web" && showWeb && loginUrl && (
          <View style={styles.webContainer}>
            <WebView
              key={webKey}
              source={{ uri: loginUrl }}
              originWhitelist={["*"]}
              javaScriptEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              onNavigationStateChange={onWebNav}
              startInLoadingState
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ==============================
   STYLES
   ============================== */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PALETTE.blueDark,
  },
  logo: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  headerAccent: {
    height: 6,
    backgroundColor: PALETTE.blueDark,
  },
  content: {
    flex: 1,
    padding: 18,
  },
  card: {
    backgroundColor: PALETTE.blueSoft,
    borderRadius: 16,
    padding: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: PALETTE.blueDark,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: PALETTE.grayText,
    lineHeight: 20,
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: PALETTE.blueDark,
    marginBottom: 10,
  },
  oauthBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  githubBtn: {
    backgroundColor: PALETTE.githubBg,
  },
  discordBtn: {
    backgroundColor: PALETTE.discordBg,
  },
  horizontalLogo: {
    width: 200,
    height: 28,
    resizeMode: "contain",
  },
  orText: {
    textAlign: "center",
    marginVertical: 12,
    color: PALETTE.grayText,
    fontWeight: "700",
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: PALETTE.blueDark,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: {
    color: PALETTE.white,
    fontWeight: "900",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
    alignSelf: "center",
  },
  webContainer: {
    flex: 1,
    marginTop: 14,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
});
