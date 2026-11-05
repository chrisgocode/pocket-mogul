import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { STARTUP_CONTENT_ISSUES } from '@/content';
import { ContentErrorScreen } from '@/features/startup/ContentErrorScreen';
import { colors } from '@/ui/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {STARTUP_CONTENT_ISSUES.length > 0 ? (
        <ContentErrorScreen issues={STARTUP_CONTENT_ISSUES} />
      ) : (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="goals" options={{ title: 'Goals', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
        </Stack>
      )}
    </SafeAreaProvider>
  );
}
