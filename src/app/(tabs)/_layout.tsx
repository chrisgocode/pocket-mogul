import { Tabs } from 'expo-router/js-tabs';

import { useHomeBreak } from '@/features/ads/useHomeBreak';
import type { IconName } from '@/ui/Icons';
import { TabIcon } from '@/ui/TabIcon';
import { colors, sectionColors, type SectionTone } from '@/ui/tokens';

const TABS: { name: string; title: string; icon: IconName; tone: SectionTone }[] = [
  { name: 'businesses', title: 'Businesses', icon: 'businesses', tone: 'businesses' },
  { name: 'markets', title: 'Markets', icon: 'markets', tone: 'markets' },
  { name: 'home', title: 'Earn', icon: 'home', tone: 'earn' },
  { name: 'properties', title: 'Properties', icon: 'properties', tone: 'properties' },
  { name: 'portfolio', title: 'Profile', icon: 'profile', tone: 'profile' },
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
            tabBarActiveTintColor: sectionColors[tab.tone],
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={tab.icon} color={color} focused={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
