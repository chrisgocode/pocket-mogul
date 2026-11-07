import { Stack } from 'expo-router';

import { HeaderActions } from './HeaderActions';
import { useScreenAnimation } from './motion';
import { colors } from './tokens';

export function TabStack({ title }: { title: string }) {
  const animation = useScreenAnimation();
  return (
    <Stack
      screenOptions={{
        animation,
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
