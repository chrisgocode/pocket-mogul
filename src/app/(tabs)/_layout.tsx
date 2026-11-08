import { Tabs } from 'expo-router/js-tabs';

import { useHomeBreak } from '@/features/ads/useHomeBreak';
import { Icon, type IconName } from '@/ui/Icons';
import { colors } from '@/ui/tokens';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'businesses', title: 'Businesses', icon: 'businesses' },
  { name: 'markets', title: 'Markets', icon: 'markets' },
  { name: 'home', title: 'Earn', icon: 'home' },
  { name: 'properties', title: 'Properties', icon: 'properties' },
  { name: 'portfolio', title: 'Profile', icon: 'portfolio' },
];

export default function TabsLayout() {
  const leftHome = useHomeBreak();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          listeners={tab.name === 'home' ? { blur: leftHome } : {}}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
