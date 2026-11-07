import { StyleSheet } from 'react-native';

import { getContent } from '@/content';
import { AppText } from '@/ui/Typography';
import { colors } from '@/ui/tokens';

import { marketClockText, ticketProblem } from './tradeFormat';
import { tradeUnits } from './tradeUnits';
import type { TradeSheetControls } from './useTradeSheet';

export function TradeNotices({ sheet }: { sheet: TradeSheetControls }) {
  const { ticket, stale, confirmation } = sheet;
  const problem = ticketProblem(ticket, {
    minimum: getContent().economy.market.minBuyNotional,
    units: tradeUnits(sheet.kind),
  });
  return (
    <>
      {problem === undefined ? null : <AppText style={styles.problem}>{problem}</AppText>}
      {stale ? (
        <AppText accessibilityRole="alert" style={styles.problem}>
          {`The price moved at ${marketClockText(ticket.tick)}. Review the new amount before you confirm.`}
        </AppText>
      ) : null}
      {confirmation.status === 'failed' && !stale ? (
        <AppText accessibilityRole="alert" style={styles.problem}>
          {confirmation.message}
        </AppText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  problem: { color: colors.loss },
});
