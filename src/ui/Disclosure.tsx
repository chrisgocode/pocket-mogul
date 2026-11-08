import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDisclosure } from './state/useDisclosure';
import { AppText } from './Typography';
import { minimumTouchTarget, spacing } from './tokens';
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const { expanded, toggle } = useDisclosure();
  return (
    <View style={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={styles.toggle}
      >
        <AppText variant="caption" muted>{`${expanded ? '▾' : '▸'} ${title}`}</AppText>
      </Pressable>
      {expanded ? children : null}
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  toggle: { minHeight: minimumTouchTarget, justifyContent: 'center' },
});
