import { formatMoneyExact } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';

import type { TradeSheetControls } from './useTradeSheet';

export function TradeTaxLines({ sheet }: { sheet: TradeSheetControls }) {
  const { ticket } = sheet;
  if (ticket.status !== 'ready' || ticket.tax === undefined || ticket.quote.side !== 'sell')
    return null;
  return (
    <>
      <DetailLine label="Allocated tax basis" value={formatMoneyExact(ticket.tax.basisCents)} />
      <DetailLine
        label="Realized taxable gain/loss"
        value={formatMoneyExact(ticket.tax.gainCents)}
      />
      <DetailLine
        label="Estimated tax change"
        value={formatMoneyExact(ticket.tax.taxChangeCents)}
      />
      <DetailLine
        label="Cash after debt collection"
        value={formatMoneyExact(ticket.tax.cashChangeCents)}
      />
      <AppText muted>
        Estimated tax is paid with your return, not withheld from this sale. This firm quote fixes
        ownership at its saved game moment; later earnings follow the resulting stake.
      </AppText>
    </>
  );
}
