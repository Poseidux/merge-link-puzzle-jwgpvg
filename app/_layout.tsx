
import "react-native-reanimated";
import React, { useEffect, useState, createContext } from "react";
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

// Global RevenueCat readiness context
export const RevenueCatContext = createContext<{ revenueCatReady: boolean }>({ 
  revenueCatReady: false 
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [revenueCatReady, setRevenueCatReady] = useState(false);

  // Initialize RevenueCat on app startup
  useEffect(() => {
    const configureRevenueCat = async () => {
      if (Platform.OS === 'ios') {
        try {
          const API_KEY = "appl_eSqPGLdMlJGuNyCAThUysRVZTcj";

          if (!Purchases.isConfigured()) {
            if (__DEV__) {
              Purchases.setLogLevel(LOG_LEVEL.DEBUG);
              console.log('[RevenueCat] Configuring for iOS');
            }
            Purchases.configure({
              apiKey: API_KEY,
              appUserID: null, // anonymous — correct for non-subscription one-time purchases
            });
          } else {
            if (__DEV__) {
              console.log('[RevenueCat] Already configured, skipping duplicate configure()');
            }
          }

          if (__DEV__) {
            console.log('[RevenueCat] ✅ Configuration successful');
          }

          // Verify configuration before setting ready flag
          const isConfigured = Purchases.isConfigured();
          if (isConfigured) {
            setRevenueCatReady(true);
            if (__DEV__) {
              console.log('[RevenueCat] ✅ Ready flag set to true');
              console.log('[RevenueCat Diagnostics] Bundle ID in use: com.poseiduxfitness.numble');
              console.log('[RevenueCat Diagnostics] RevenueCat App ID: app733f6356d7');
              const appUserID = await Purchases.getAppUserID();
              console.log('[RevenueCat Diagnostics] App User ID:', appUserID);
            }

            // Pre-fetch offerings so they are cached before the shop screen opens
            try {
              const offerings = await Purchases.getOfferings();
              const packages = offerings.current?.availablePackages ?? [];
              console.log('[RevenueCat Diagnostics] Current offering ID:', offerings.current?.identifier ?? 'none');
              console.log('[RevenueCat Diagnostics] Loaded package count:', packages.length);
              packages.forEach(pkg => {
                console.log('[RevenueCat Diagnostics] Package:', pkg.identifier, '| Product ID:', pkg.storeProduct.productIdentifier, '| Price:', pkg.storeProduct.priceString);
              });
              console.log('[RevenueCat Diagnostics] StoreKit product count:', packages.length);
            } catch (offeringsError) {
              console.warn('[RevenueCat] Pre-fetch offerings failed (will retry in shop):', offeringsError);
            }
          } else {
            if (__DEV__) {
              console.error('[RevenueCat] ❌ Configuration verification failed');
            }
          }
        } catch (error) {
          if (__DEV__) {
            console.error('[RevenueCat] ❌ Configuration error:', error);
          }
        }
      } else {
        if (__DEV__) {
          console.log(`[RevenueCat] Platform is ${Platform.OS}, skipping iOS configuration`);
        }
        // For non-iOS platforms, set ready to true to allow shop to proceed
        setRevenueCatReady(true);
      }
    };

    configureRevenueCat();
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
      <RevenueCatContext.Provider value={{ revenueCatReady }}>
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
      </RevenueCatContext.Provider>
    </>
  );
}
