import { selectMarketNews } from '@/application/marketNews';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Disclosure } from '@/ui/Disclosure';
import { NewsList } from './NewsList';
const NEWS_ITEMS = 4;
export function MarketNews({ market }: { market: 'stocks' | 'crypto' }) {
  const news = selectMarketNews(useGameSnapshot().state, {
    market,
    content: getContent(),
    limit: NEWS_ITEMS,
  });
  return (
    <Disclosure title="Market news">
      <NewsList items={news} empty="No market news yet." />
    </Disclosure>
  );
}
