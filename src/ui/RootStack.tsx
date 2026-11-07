import { Stack } from 'expo-router';

import { useScreenAnimation } from './motion';
import { colors, type } from './tokens';

export function RootStack() {
  const animation = useScreenAnimation();
  return (
    <Stack
      screenOptions={{
        animation,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text, fontFamily: type.title.fontFamily },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="goals" options={{ title: 'Goals', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
    </Stack>
  );
}
