import { Stack } from 'expo-router';
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
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title, headerShown: false }} />
    </Stack>
  );
}
