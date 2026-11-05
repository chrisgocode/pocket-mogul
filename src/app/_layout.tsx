import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ContentValidationError, getContent } from '@/content';
import { ContentErrorScreen } from '@/features/startup/ContentErrorScreen';
import { colors } from '@/ui/tokens';

export default function RootLayout() {
  // Content is validated once at startup; a bad edit stops here with every issue listed.
  const [contentError] = useState<ContentValidationError | null>(() => {
    try {
      getContent();
      return null;
    } catch (error) {
      if (error instanceof ContentValidationError) return error;
      throw error;
    }
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {contentError ? (
        <ContentErrorScreen issues={contentError.issues} />
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
