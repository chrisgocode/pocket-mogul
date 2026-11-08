import { useRouter } from 'expo-router';
import type { AssetQuote } from '@/application/marketsView';
import { selectPosition } from '@/application/positionView';
import { getContent } from '@/content';
import { formatMoneyExact, formatPriceCompact, formatQuantity } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { cashTrend, formatCashChange } from '@/features/game/priceFormat';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';
const PERCENT_SCALE = 10_000n;
const PERCENT_DECIMALS = 100;
const PERCENT_DIGITS = 2;
const HALF = 2n;
export function MarketPositionRow({ quote }: { quote: AssetQuote }) {
  const router = useRouter();
  const position = selectPosition(useGameSnapshot().state, {
    assetId: quote.asset.id,
    content: getContent(),
  });
  if (position === undefined) return null;
  const percent =
    position.basisCents === 0n
      ? 0
      : Number(
          (position.unrealizedCents * PERCENT_SCALE +
            (position.unrealizedCents < 0n ? 0n - position.basisCents : position.basisCents) /
              HALF) /
            position.basisCents,
        ) / PERCENT_DECIMALS;
  const average =
    position.averageCost === undefined ? '—' : formatPriceCompact(position.averageCost);
  return (
    <ListRow
      leading={<LogoMark logo={quote.asset.logo} />}
      title={quote.asset.ticker}
      subtitle={`${formatQuantity(position.quantity)} held · avg ${average}`}
      value={formatMoneyExact(position.valueCents)}
      detail={`${formatCashChange(position.unrealizedCents)} · ${percent.toFixed(PERCENT_DIGITS)}%`}
      detailTrend={cashTrend(position.unrealizedCents)}
      onPress={() =>
        router.push({ pathname: '/markets/[assetId]', params: { assetId: quote.asset.id } })
      }
    />
  );
}
