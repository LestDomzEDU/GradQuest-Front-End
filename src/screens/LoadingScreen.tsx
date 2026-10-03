import React, { useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

const SPLASH_MS = 1500;

// 🎨 Simple color palette
const PALETTE = {
  bg: "#FFFFFF",
};

export default function LoadingScreen() {
  const navigation = useNavigation<any>();
  const { me } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  // Leave the splash once it has shown and the session check (/api/me) has answered.
  useEffect(() => {
    if (!splashDone || me === null) return;
    navigation.reset({
      index: 0,
      routes: [{ name: me.authenticated ? "Tabs" : "Home" }],
    });
  }, [splashDone, me, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Your logo or splash image */}
      <Image
        source={require("../../assets/gradquest_logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 200, // adjust for your design
    height: 200,
  },
});
