import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/ui/Typography';
import { colors, spacing } from '@/ui/tokens';

export function ContentErrorScreen({ issues }: { issues: readonly string[] }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">Game content failed to load</AppText>
        <AppText muted>Your save has not been touched. This build has a content error:</AppText>
        {issues.map((issue) => (
          <AppText key={issue} variant="caption">
            • {issue}
          </AppText>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
});
