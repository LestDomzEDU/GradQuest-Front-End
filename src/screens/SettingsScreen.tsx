import React from "react";
import { View, Text, StyleSheet, Image, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PALETTE = {
  blueDark: "#053F7C",
  blue: "#0061A8",
  gold: "#FFC727",
  white: "#FFFFFF",
  textDark: "#001B33",
  subtext: "#4B5563",
  danger: "#B00020",
  cardBorder: "#DCE8F2",
};

type AnyObj = Record<string, unknown>;
const TUTORIAL_KEY = "tutorial:completed";

function first<T>(...args: T[]) {
  for (const a of args) if (a !== undefined && a !== null && a !== "") return a as T;
  return "" as unknown as T;
}

function pickAvatar(me?: AnyObj) {
  if (!me) return "";
  const flat = first<string>(
    me["avatarUrl"] as any,
    me["avatar_url"] as any,
    me["picture"] as any,
    me["avatar"] as any
  );
  if (flat) return flat;
  if (me["github"] && typeof me["github"] === "object") {
    const gh = me["github"] as AnyObj;
    return first<string>(gh["avatarUrl"] as any, gh["avatar_url"] as any);
  }
  return "";
}

function pickUsername(me?: AnyObj) {
  if (!me) return "";

  const flat = first<string>(
    me["name"] as any,
    me["login"] as any,
    me["username"] as any,
    me["githubUsername"] as any
  );
  if (flat) return flat;

  if (me["github"] && typeof me["github"] === "object") {
    const gh = me["github"] as AnyObj;
    if (typeof gh["login"] === "string") {
      return gh["login"] as string;
    }
  }

  return first<string>(me["email"] as any, "Unknown User");
}

export default function SettingsScreen() {
  const navigation = useNavigation();

  const { me: authMe, refresh, logout } = useAuth();
  const me = authMe as AnyObj | null;
  const [busy, setBusy] = React.useState(false);
  const [tutorialGate, setTutorialGate] = React.useState(false);

  const load = React.useCallback(async () => {
    await refresh();
  }, [refresh]);

  useFocusEffect(
    React.useCallback(() => {
      load();
      return;
    }, [load])
  );

  const route = useRoute() as any;
  const fromTutorial = !!(route?.params && (route.params as any).tutorialMode);

  React.useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem(TUTORIAL_KEY);
      const done = v === "1";
      setTutorialGate(fromTutorial && !done);
    })();
  }, [fromTutorial]);

  const onLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
      (navigation as any).reset({
        index: 0,
        routes: [{ name: "Home" as never }],
      } as any);
    }
  };

  const onAdjustPreferences = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, "1");
    } catch {}
    setTutorialGate(false);
    (navigation as any).navigate("ProfileIntake" as never);
  };

  const avatarSrc =
    pickAvatar(me || {}) ||
    "https://ui-avatars.com/api/?name=U&background=EEE&color=7C7C7C";

  const username = me ? pickUsername(me) || "Unknown User" : "Loading…";

  return (
    <SafeAreaView style={s.screen}>
      {/* Header */}
    <View style={s.header}>
      <View style={{ width: 40 }} />
      <Text style={s.headerTitle}>Settings</Text>
      <Image
        source={require("../../assets/gradquest_logo.png")}
        style={s.logo}
      />
    </View>

    <View style={s.headerAccent} />

    <View style={s.card}>
        {/* TOP ROW: Avatar + Username */}
        <View style={s.profileRow}>
          <Image source={{ uri: avatarSrc }} style={s.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={s.username}>{username}</Text>
            <Text style={s.subtext}>Signed in</Text>
          </View>
        </View>

        {/* BUTTONS VERTICAL */}
        <View style={s.buttonColumn}>
          <Pressable style={s.primaryButton} onPress={onAdjustPreferences}>
            <Text style={s.primaryButtonText}>Adjust Preferences</Text>
          </Pressable>

          <Pressable style={s.logoutButton} onPress={onLogout} disabled={busy}>
            <Text style={s.logoutText}>{busy ? "Logging out..." : "Log out"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Hard Gate */}
      <Modal visible={tutorialGate} transparent animationType="fade">
        <View style={s.gateOverlay}>
          <View style={s.gateCard}>
            <Text style={s.gateTitle}>Finish setup</Text>
            <Text style={s.gateBody}>
              Press{" "}
              <Text style={{ fontWeight: "800" }}>Adjust Preferences</Text> to complete setup.
            </Text>
            <Pressable style={s.primaryButton} onPress={onAdjustPreferences}>
              <Text style={s.primaryButtonText}>Adjust Preferences</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.white,
  },

  header: {
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: PALETTE.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerAccent: {
    height: 4,
    backgroundColor: PALETTE.gold,
    width: "100%",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: PALETTE.blueDark,
  },
  logo: {
    width: 52,   // ← was 38
    height: 52,  // ← was 38
    resizeMode: "contain",
  },


  card: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 20,
    margin: 16,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eee",
    marginRight: 12,
  },

  username: { fontSize: 20, fontWeight: "800", color: PALETTE.textDark },
  subtext: { marginTop: 2, color: PALETTE.subtext },

  /* Button column instead of horizontal buttons */
  buttonColumn: {
    marginTop: 10,
    flexDirection: "column",
    gap: 12,
  },

  primaryButton: {
    backgroundColor: PALETTE.blue,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  logoutButton: {
    backgroundColor: "#FFF5F5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    color: PALETTE.danger,
    fontWeight: "700",
    fontSize: 16,
  },

  gateOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  gateCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PALETTE.textDark,
    marginBottom: 8,
  },
  gateBody: { color: PALETTE.subtext, marginBottom: 16 },
});
