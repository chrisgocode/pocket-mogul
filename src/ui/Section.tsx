import { useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollSectionContext } from './ScrollSections';
import { AppText } from './Typography';
import { spacing } from './tokens';

export function Section({
  title,
  note,
  children,
  id,
}: {
  title: string;
  id?: string;
  note?: string;
  children: ReactNode;
}) {
  const register = useContext(ScrollSectionContext);
  return (
    <View
      style={styles.section}
      onLayout={(event) => register?.(id ?? title.toLowerCase(), event.nativeEvent.layout.y)}
    >
      <View style={styles.heading}>
        <AppText variant="label" muted accessibilityRole="header">
          {title}
        </AppText>
        {note === undefined ? null : (
          <AppText variant="caption" muted numberOfLines={2}>
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
  heading: { gap: 2, paddingHorizontal: spacing.xs },
});
