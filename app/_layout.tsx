
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
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { RC_OFFERING_ID } from "@/constants/RevenueCatProducts";


SplashScreen.preventAutoHideAsync();

// Configure RevenueCat SYNCHRONOUSLY at module load time on iOS.
// This must happen before any screen renders so that Purchases.getSharedInstance()
// never throws "no singleton instance" when the shop screen mounts.
if (Platform.OS === "ios") {
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: "appl_ECLMFKJuAaPHoerTjPgaMwDCdLw", appUserID: null });
    console.log("[RevenueCat] Configured at module load (iOS)");
  } catch (e) {
    console.error("[RevenueCat] Module-level configure failed:", e);
  }
}
console.log("[RevenueCat] isConfigured after module-level setup:", Platform.OS === "ios" ? Purchases.isConfigured() : "N/A");

export const unstable_settings = {
  initialRouteName: "index",
};

// Global RevenueCat readiness context
export const RevenueCatContext = createContext<{ revenueCatReady: boolean }>({
  revenueCatReady: false,
});


// No subscription redirect — the app sells individual non-consumable items (themes and chain
// colors), not a subscription. Users are never forced to the paywall; they browse the shop
// and purchase items individually.

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  // On iOS, RC is already configured synchronously above — start as ready.
  // On other platforms, SubscriptionContext handles initialization.
  const [revenueCatReady, setRevenueCatReady] = useState(Platform.OS === "ios");

  // Post-configure async work: diagnostics + pre-fetch offerings cache
  useEffect(() => {
    if (Platform.OS !== "ios") {
      setRevenueCatReady(true);
      return;
    }

    const postConfigureAsync = async () => {
      try {
        const appUserID = await Purchases.getAppUserID();
        console.log("[RevenueCat Diagnostics] Configured. App User ID:", appUserID);
        console.log("[RevenueCat Diagnostics] Bundle ID: com.poseiduxfitness.numble");
        console.log("[RevenueCat Diagnostics] RC App ID: appaca42abb99");
        console.log("[RevenueCat Diagnostics] RC Project ID: projfc6dd717");
        console.log("[RevenueCat Diagnostics] Purchase type: NON-CONSUMABLE (one-time) only — no subscriptions");

        // Pre-fetch offerings so they are cached before the shop screen opens
        try {
          const offerings = await Purchases.getOfferings();
          const themesOffering = offerings.all[RC_OFFERING_ID] ?? offerings.current;
          console.log("[RevenueCat Diagnostics] Offering used:", themesOffering?.identifier ?? "none");
          console.log("[RevenueCat Diagnostics] Package count:", themesOffering?.availablePackages?.length ?? 0);
          themesOffering?.availablePackages?.forEach(pkg => {
            console.log("[RevenueCat Diagnostics] Package:", pkg.identifier, "| Product ID:", pkg.storeProduct.productIdentifier, "| Price:", pkg.storeProduct.priceString);
          });
          if ((themesOffering?.availablePackages?.length ?? 0) === 0) {
            console.warn("[RevenueCat Diagnostics] ⚠️ StoreKit returned 0 products. Bundle: com.poseiduxfitness.numble | Offering: themes (ofrng11cb78188e) | RC App: app733f6356d7. Ensure all 35 products are Approved in App Store Connect.");
          }
        } catch (offeringsError) {
          console.warn("[RevenueCat] Pre-fetch offerings failed (will retry in shop):", offeringsError);
        }
      } catch (e) {
        console.error("[RevenueCat Diagnostics] Post-configure async error:", e);
      }
    };

    postConfigureAsync();
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
    <SubscriptionProvider>
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
                <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
              </Stack>
              <SystemBars style={"auto"} />
            </GestureHandlerRootView>
          </WidgetProvider>
        </ThemeProvider>
      </RevenueCatContext.Provider>
    </SubscriptionProvider>
  );
}
