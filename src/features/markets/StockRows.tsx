import { getContent, type Stock } from '@/content';
import { formatMoneyExact, formatPrice } from '@/domain/money';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';

const CLASS_LABEL = { standard: 'Stock', blue_chip: 'Blue chip', penny: 'Penny stock' } as const;

const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const dividendLabel = (stock: Stock) =>
  stock.dividendCentsPerSharePerHour > 0n
    ? `${formatMoneyExact(stock.dividendCentsPerSharePerHour)}/share/hr`
    : undefined;

export function StockRows() {
  return getContent().stocks.map((stock) => (
    <ListRow
      key={stock.id}
      leading={<LogoMark logo={stock.logo} />}
      title={stock.name}
      subtitle={`${stock.ticker} · ${titleCase(stock.sector)} · ${CLASS_LABEL[stock.volatilityClass]}`}
      value={formatPrice(stock.initialPrice)}
      detail={dividendLabel(stock)}
    />
  ));
}
