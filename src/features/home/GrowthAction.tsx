import { useRouter } from 'expo-router';
import { selectHomeGrowth } from '@/application/homeGrowth';
import { selectHomeAttention } from '@/application/homeAttention';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { ListRow } from '@/ui/ListRow';
export function GrowthAction() {
  const router = useRouter();
  const snapshot = useGameSnapshot();
  const content = getContent();
  const growth = selectHomeGrowth(snapshot, content);
  if (growth === undefined || selectHomeAttention(snapshot, content).length > 0) return null;
  const open = () =>
    growth.kind === 'business'
      ? router.push({
          pathname: '/businesses/[businessId]',
          params: { businessId: growth.id, section: 'grow' },
        })
      : router.push({ pathname: '/businesses', params: { tier: String(growth.tier) } });
  return <ListRow title={growth.title} subtitle={growth.detail} value="→" onPress={open} />;
}
