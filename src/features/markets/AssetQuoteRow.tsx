import { useRouter } from 'expo-router';

import type { AssetQuote } from '@/application/marketsView';
import { formatMoneyExact, formatPriceCompact } from '@/domain/money';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';

import { changeBadge, changeWords } from './marketFormat';

const CLASS_LABEL = { standard: 'Stock', blue_chip: 'Blue chip', penny: 'Penny stock' } as const;

const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function assetSubtitle(quote: AssetQuote): string {
  if (quote.kind === 'coin') return `${quote.asset.ticker} · ${quote.asset.theme}`;
  const { ticker, sector, volatilityClass } = quote.asset;
  return `${ticker} · ${titleCase(sector)} · ${CLASS_LABEL[volatilityClass]}`;
}

export function dividendLabel(quote: AssetQuote): string | undefined {
  if (quote.kind === 'coin' || quote.asset.dividendCentsPerSharePerHour === 0n) return undefined;
  return `${formatMoneyExact(quote.asset.dividendCentsPerSharePerHour)}/share/hr`;
}

export function AssetQuoteRow({ quote }: { quote: AssetQuote }) {
  const router = useRouter();
  const { asset } = quote;
  const price = formatPriceCompact(quote.price);
  return (
    <ListRow
      leading={<LogoMark logo={asset.logo} />}
      title={asset.name}
      subtitle={assetSubtitle(quote)}
      value={price}
      detail={changeBadge(quote.hourChangeBps)}
      accessibilityLabel={`${asset.name}, ${asset.ticker}, ${price}, ${changeWords(quote.hourChangeBps)} this market hour`}
      onPress={() => router.push({ pathname: '/markets/[assetId]', params: { assetId: asset.id } })}
    />
  );
}
