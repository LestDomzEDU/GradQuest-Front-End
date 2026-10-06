import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import * as React from "react";
import {
  NavigationContainer,
  DefaultTheme,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "../src/navigation/RootNavigator";
import SessionExpiredRedirect from "../src/navigation/SessionExpiredRedirect";
import { SavedAppsProvider } from "../src/context/SavedAppsContext";
import { AuthProvider } from "../src/context/AuthContext";

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: "#ffffff" },
  };
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <SavedAppsProvider>
          <NavigationContainer ref={navigationRef} theme={theme}>
            <RootNavigator />
          </NavigationContainer>
          <SessionExpiredRedirect navigationRef={navigationRef} />
        </SavedAppsProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
