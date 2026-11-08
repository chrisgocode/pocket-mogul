import { selectHomeAttention } from '@/application/homeAttention';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { Disclosure } from '@/ui/Disclosure';
import { AppText } from '@/ui/Typography';
import { AttentionRow } from './AttentionRow';
export function AttentionCard() {
  const items = selectHomeAttention(useGameSnapshot(), getContent());
  const first = items[0];
  if (first === undefined) return null;
  return (
    <Card>
      <AppText variant="caption" muted>
        NEEDS ATTENTION · {items.length}
      </AppText>
      <AttentionRow item={first} />
      {items.length > 1 ? (
        <Disclosure title={`${items.length - 1} more`}>
          {items.slice(1).map((item) => (
            <AttentionRow key={item.title} item={item} />
          ))}
        </Disclosure>
      ) : null}
    </Card>
  );
}
