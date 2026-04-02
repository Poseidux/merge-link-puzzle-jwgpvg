
import React from 'react';
import { Stack } from 'expo-router';
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

export default function TabLayout() {
  useSubscriptionGuard();

  // For Android and Web, use Stack navigation without floating tab bar
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen key="home" name="(home)" options={{ gestureEnabled: false }} />
      <Stack.Screen key="profile" name="profile" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
