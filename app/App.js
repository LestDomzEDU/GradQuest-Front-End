import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import * as React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "../src/navigation/RootNavigator";
import { SavedAppsProvider } from "../src/context/SavedAppsContext";
import { AuthProvider } from "../src/context/AuthContext";

export default function App() {
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: "#ffffff" },
  };
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <SavedAppsProvider>
          <NavigationContainer theme={theme}>
            <RootNavigator />
          </NavigationContainer>
        </SavedAppsProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
