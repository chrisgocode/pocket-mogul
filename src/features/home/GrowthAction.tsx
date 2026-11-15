import { useRouter } from 'expo-router';

import type { HomeGrowth } from '@/application/homeGrowth';
import { ListRow } from '@/ui/ListRow';

export function GrowthAction({
  growth,
  onLeave,
}: {
  growth: HomeGrowth | undefined;
  onLeave: () => void;
}) {
  const router = useRouter();
  if (growth === undefined) return null;
  const open = () => {
    onLeave();
    if (growth.kind === 'business')
      router.push({
        pathname: '/businesses/[businessId]',
        params: { businessId: growth.id, section: 'grow' },
      });
    else router.push({ pathname: '/businesses', params: { tier: String(growth.tier) } });
  };
  return <ListRow title={growth.title} subtitle={growth.detail} value="→" onPress={open} />;
}
