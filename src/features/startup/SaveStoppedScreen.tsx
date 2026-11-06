import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SaveStopReason } from '@/application/openSave';
import { AppText } from '@/ui/Typography';
import { colors, spacing } from '@/ui/tokens';

const EXPLANATIONS: Record<SaveStopReason, { title: string; body: string }> = {
  UNSUPPORTED_SAVE_VERSION: {
    title: 'Update Pocket Mogul to keep playing',
    body: 'Your save was made by a newer version of the game. Update the app to open it.',
  },
  DAMAGED_SAVE: {
    title: "Your save couldn't be opened",
    body: 'Your save and its backups are damaged, so the game stopped instead of starting over.',
  },
};

export function SaveStoppedScreen({ reason }: { reason: SaveStopReason }) {
  const { title, body } = EXPLANATIONS[reason];
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText muted>{body}</AppText>
        <AppText muted>Nothing in your save has been changed.</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
});
