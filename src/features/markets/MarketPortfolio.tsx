import type { AssetQuote } from '@/application/marketsView';
import { selectPortfolio } from '@/application/portfolioView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { formatMoneyExact } from '@/domain/money';
import { cashTrend, formatCashChange } from '@/features/game/priceFormat';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { StatChips } from '@/ui/StatChips';
import { AppText } from '@/ui/Typography';
import { MarketPositionRow } from './MarketPositionRow';
export function MarketPortfolio({ quotes }: { quotes: readonly AssetQuote[] }) {
  const snapshot = useGameSnapshot();
  const view = selectPortfolio(snapshot, getContent());
  const format = useMoneyFormat();
  const held = quotes.filter((quote) =>
    snapshot.state.positions.some((position) => position.instrumentId === quote.asset.id),
  );
  return (
    <>
      <StatChips
        stats={[
          {
            label: 'Market value',
            value: format.short(view.worth.positionsCents),
            accessibilityLabel: `Market value, ${formatMoneyExact(view.worth.positionsCents)}`,
          },
          {
            label: 'Unrealized P&L',
            value: format.shortGain(view.results.unrealizedCents),
            trend: cashTrend(view.results.unrealizedCents),
            accessibilityLabel: `Unrealized P&L, ${formatCashChange(view.results.unrealizedCents)}`,
          },
        ]}
      />
      {held.map((quote) => (
        <MarketPositionRow key={quote.asset.id} quote={quote} />
      ))}
      {held.length === 0 ? <AppText muted>No market positions</AppText> : null}
    </>
  );
}
