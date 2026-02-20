
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, Platform } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Initialize RevenueCat on app startup
  useEffect(() => {
    console.log("=== RevenueCat Initialization Start ===");
    console.log("[RevenueCat] Setting log level to VERBOSE");
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS === "ios") {
      const API_KEY = "appl_eSqPGLdMlJGuNyCAThUysRVZTcj";
      console.log(`[RevenueCat] Configuring for iOS with API key: ${API_KEY}`);
      
      try {
        Purchases.configure({ apiKey: API_KEY });
        console.log("[RevenueCat] ✅ Configuration successful for iOS");
        
        // Verify configuration
        Purchases.isConfigured().then((isConfigured) => {
          console.log(`[RevenueCat] Is configured: ${isConfigured}`);
        }).catch((error) => {
          console.error("[RevenueCat] Error checking configuration:", error);
        });
      } catch (error) {
        console.error("[RevenueCat] ❌ Configuration failed:", error);
      }
    } else {
      console.log(`[RevenueCat] Platform is ${Platform.OS}, skipping configuration (iOS only)`);
    }
    
    console.log("=== RevenueCat Initialization Complete ===");
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!loaded) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)",
      background: "rgb(242, 242, 247)",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)",
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
    },
  };
  
  return (
    <>
      <StatusBar style="auto" animated />
        <ThemeProvider
          value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
        >
          <WidgetProvider>
            <GestureHandlerRootView>
            <Stack
              screenOptions={{
                gestureEnabled: false,
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="game" options={{ headerShown: false, gestureEnabled: false }} />
            </Stack>
            <SystemBars style={"auto"} />
            </GestureHandlerRootView>
          </WidgetProvider>
        </ThemeProvider>
    </>
  );
}
