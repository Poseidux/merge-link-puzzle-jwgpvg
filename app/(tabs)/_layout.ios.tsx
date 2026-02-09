
import React from 'react';
import { Stack } from 'expo-router';

export default function TabLayout() {
  // Navigation bar removed - using Stack navigation with menu button for iOS
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen key="home" name="(home)" options={{ gestureEnabled: false }} />
      <Stack.Screen key="profile" name="profile" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
