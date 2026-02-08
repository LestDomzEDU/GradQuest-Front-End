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

  // Load /api/me and update state (WEB only is reliable for cookies)
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
      const base = provider === "github" ? API.LOGIN_GITHUB : API.LOGIN_DISCORD;

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
  const onWebNav = React.useCallback((navState) => {
    const url = navState?.url || "";

    // When backend redirects to /oauth2/final, the WebView is now on your server.
    // At that moment, injectedJavaScript will call /api/me *inside the WebView*
    // (where cookies definitely exist) and send the result back via postMessage.
    if (url.startsWith(API.OAUTH_FINAL)) {
      setLoading(true);
      // Do NOT close the WebView here; wait for the onMessage handler to receive /api/me.
    }
  }, []);

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

            <View style={{ height: 18 }} />

            <Pressable
              onPress={() => startLogin("github")}
              style={[styles.providerBtn, { backgroundColor: PALETTE.githubBg }]}
            >
              <Text style={[styles.providerText, { color: "#111" }]}>
                GitHub
              </Text>
            </Pressable>

            <View style={{ height: 12 }} />

            <Pressable
              onPress={() => startLogin("discord")}
              style={[styles.providerBtn, { backgroundColor: PALETTE.discordBg }]}
            >
              <Text style={[styles.providerText, { color: "#fff" }]}>
                Discord
              </Text>
            </Pressable>

            <View style={{ height: 16 }} />

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Signing in…</Text>
              </View>
            )}
          </View>
        )}

        {/* If inside WebView, show WebView */}
        {showWeb && !!loginUrl && (
          <View style={styles.webWrap}>
            <WebView
              key={webKey}
              source={{ uri: loginUrl }}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              incognito={false}
              cacheEnabled
              onNavigationStateChange={onWebNav}
              onMessage={(event) => {
                try {
                  const msg = JSON.parse(event?.nativeEvent?.data || "{}");
                  if (msg?.type === "ME") {
                    const payload = msg.payload || null;
                    setMe(payload);

                    // If we got a real authenticated response, close the WebView and continue
                    if (looksAuthenticated(payload)) {
                      setLoading(false);
                      setShowWeb(false);
                    } else {
                      setLoading(false);
                    }
                  }
                } catch (e) {
                  // ignore
                }
              }}
              injectedJavaScript={`
                (function () {
                  try {
                    var href = String(window.location.href || "");
                    var target = "${API.OAUTH_FINAL}";
                    if (target && href.indexOf(target) === 0) {
                      fetch("/api/me", { credentials: "include" })
                        .then(function (r) { return r.json(); })
                        .then(function (data) {
                          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ME", payload: data }));
                          }
                        })
                        .catch(function () {});
                    }
                  } catch (e) {}
                })();
                true;
              `}
              startInLoadingState
            />

            {loading && (
              <View style={styles.webOverlay}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Finishing sign-in…</Text>
              </View>
            )}
          </View>
        )}

        {/* If authenticated, show confirmation + continue */}
        {isAuthed && !showWeb && (
          <View style={styles.card}>
            <Text style={styles.title}>Signed in</Text>
            <Text style={styles.sub}>
              You’re signed in with {providerLabel}.
            </Text>

            <View style={{ height: 14 }} />

            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : null}

            <View style={{ height: 10 }} />

            <Text style={styles.meText}>{me?.name || me?.login || ""}</Text>

            <View style={{ height: 18 }} />

            <Pressable onPress={onContinue} style={styles.continueBtn}>
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 54,
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0B1220",
  },
  logo: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  headerAccent: {
    height: 3,
    backgroundColor: PALETTE.blue,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B1220",
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: PALETTE.grayText,
    lineHeight: 20,
  },
  providerBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  providerText: {
    fontSize: 16,
    fontWeight: "800",
  },
  loadingRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: PALETTE.grayText,
    marginLeft: 10,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignSelf: "center",
  },
  meText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#0B1220",
  },
  continueBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: PALETTE.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  webWrap: {
    height: 520,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  webOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    flexDirection: "row",
    alignItems: "center",
  },
});
