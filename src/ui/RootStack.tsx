import { Stack } from 'expo-router';

import { useScreenAnimation } from './motion';
import { colors } from './tokens';

export function RootStack() {
  const animation = useScreenAnimation();
  return (
    <Stack
      screenOptions={{
        animation,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="goals" options={{ title: 'Goals', presentation: 'modal' }} />
      <Stack.Screen name="taxes" options={{ title: 'Taxes', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
    </Stack>
  );
}
