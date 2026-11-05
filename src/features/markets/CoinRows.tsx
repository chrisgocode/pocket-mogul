import { getContent } from '@/content';
import { formatPrice } from '@/domain/money';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';

export function CoinRows() {
  return getContent().coins.map((coin) => (
    <ListRow
      key={coin.id}
      leading={<LogoMark logo={coin.logo} />}
      title={coin.name}
      subtitle={`${coin.ticker} · ${coin.theme}`}
      value={formatPrice(coin.initialPrice)}
    />
  ));
}
