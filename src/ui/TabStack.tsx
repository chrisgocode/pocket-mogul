import { Stack } from 'expo-router';

import { HeaderActions } from './HeaderActions';
import { colors } from './tokens';

/** The Stack each main tab owns, so detail screens push inside their tab. */
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerRight: () => <HeaderActions />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
