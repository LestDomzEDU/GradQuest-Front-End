import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import API from "../lib/api";

export default function GoogleWelcomeScreen() {
  const navigation = useNavigation();
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    try {
      const res = await fetch(API.ME, { credentials: "include" });
      const data = await res.json();
      setMe(data);
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const doLogout = async () => {
    try {
      await fetch(API.LOGOUT, { method: "POST", credentials: "include" });
      navigation.popToTop(); // back to OAuth screen
    } catch (e) {
      Alert.alert("Logout failed", String(e));
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  const displayName = me?.name || me?.login || me?.email || "";
  const avatar = me?.avatar_url;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You’re signed in</Text>

      {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : null}

      <Text style={styles.name}>{displayName}</Text>

      <View style={{ height: 12 }} />
      <Button title="Go to app" onPress={() => navigation.navigate("Tabs")} />
      <View style={{ height: 8 }} />
      <Button title="Logout" color="#b00020" onPress={doLogout} />
      <View style={{ height: 12 }} />
      <Button title="Refresh" onPress={load} />
      <View style={{ height: 8 }} />
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  name: { fontSize: 16, color: "#333", marginBottom: 4, textAlign: "center" },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
    backgroundColor: "#eee",
  },
});
