import { TradeTaxLines } from './TradeTaxLines';
import { Button } from '@/ui/Button';
import { DetailLine } from '@/ui/DetailLine';
import { KeyboardSheet } from '@/ui/KeyboardSheet';
import { AppText } from '@/ui/Typography';

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
    <KeyboardSheet visible={confirmation.status !== 'closed'} onRequestClose={sheet.close}>
      <AppText variant="title" accessibilityRole="header">
        {`${sideVerb(sheet.draft.side)} ${name}`}
      </AppText>
      <TradeEntryFields sheet={sheet} />
      {quoted === undefined
        ? null
        : quoteLines(quoted, { tick: ticket.tick, units: sheet.units }).map((line) => (
            <DetailLine key={line.label} {...line} />
          ))}
      <TradeTaxLines sheet={sheet} />
      <TradeNotices sheet={sheet} />
      <Button
        label={primaryLabel(sheet)}
        onPress={stale ? sheet.refresh : sheet.confirm}
        disabled={pending || (!stale && ticket.status !== 'ready')}
      />
      <Button label="Cancel" variant="secondary" onPress={sheet.close} disabled={pending} />
    </KeyboardSheet>
  );
}
