import type { AssetQuote } from '@/application/marketsView';
import { selectPortfolio } from '@/application/portfolioView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { formatMoneyExact } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { StatPair } from '@/ui/StatPair';
import { AppText } from '@/ui/Typography';
import { MarketPositionRow } from './MarketPositionRow';
export function MarketPortfolio({ quotes }: { quotes: readonly AssetQuote[] }) {
  const snapshot = useGameSnapshot();
  const view = selectPortfolio(snapshot, getContent());
  const held = quotes.filter((quote) =>
    snapshot.state.positions.some((position) => position.instrumentId === quote.asset.id),
  );
  return (
    <>
      <StatPair
        left={{ label: 'Market value', value: formatMoneyExact(view.worth.positionsCents) }}
        right={{ label: 'Unrealized P&L', value: formatCashChange(view.results.unrealizedCents) }}
      />
      <AppText variant="caption" muted>
        Position value / your P&L
      </AppText>
      {held.map((quote) => (
        <MarketPositionRow key={quote.asset.id} quote={quote} />
      ))}
      {held.length === 0 ? <AppText muted>No market positions</AppText> : null}
    </>
  );
}
