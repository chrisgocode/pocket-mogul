import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './Typography';
import { spacing } from './tokens';

export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {note === undefined ? null : (
          <AppText variant="caption" muted>
            {note}
          </AppText>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  heading: { gap: 2 },
});
