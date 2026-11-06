import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/ui/Button';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

import { TradeEntryFields } from './TradeEntryFields';
import { confirmLabel, quoteLines, sideVerb } from './tradeFormat';
import { TradeNotices } from './TradeNotices';
import type { TradeSheetControls } from './useTradeSheet';

function primaryLabel(sheet: TradeSheetControls): string {
  const { ticket, stale, confirmation } = sheet;
  if (stale) return 'Review new price';
  if (confirmation.status === 'pending') return 'Saving…';
  return ticket.status === 'ready' ? confirmLabel(ticket.quote) : `Review ${sheet.draft.side}`;
}

export function TradeSheet({ name, sheet }: { name: string; sheet: TradeSheetControls }) {
  const { ticket, stale, confirmation } = sheet;
  const pending = confirmation.status === 'pending';
  const quoted =
    ticket.status === 'ready' || ticket.status === 'refused' ? ticket.quote : undefined;
  return (
    <Modal
      visible={confirmation.status !== 'closed'}
      transparent
      animationType="slide"
      onRequestClose={sheet.close}
    >
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppText variant="title" accessibilityRole="header">
              {`${sideVerb(sheet.draft.side)} ${name}`}
            </AppText>
            <TradeEntryFields sheet={sheet} />
            {quoted === undefined
              ? null
              : quoteLines(quoted, ticket.tick).map((line) => (
                  <DetailLine key={line.label} {...line} />
                ))}
            <TradeNotices sheet={sheet} />
            <Button
              label={primaryLabel(sheet)}
              onPress={stale ? sheet.refresh : sheet.confirm}
              disabled={pending || (!stale && ticket.status !== 'ready')}
            />
            <Button label="Cancel" variant="secondary" onPress={sheet.close} disabled={pending} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
  },
  content: { padding: spacing.xl, gap: spacing.md },
});
