
import React from 'react';
import { Stack } from 'expo-router';

export default function TabLayout() {
  // For Android and Web, use Stack navigation without floating tab bar
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen key="home" name="(home)" />
      <Stack.Screen key="profile" name="profile" />
    </Stack>
  );
}
