import { Stack } from 'expo-router';

import { HeaderActions } from './HeaderActions';
import { colors } from './tokens';

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
