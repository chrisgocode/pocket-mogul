import { useRouter } from 'expo-router';
import type { HomeGrowth } from '@/application/homeGrowth';
import { ListRow } from '@/ui/ListRow';
export function GrowthAction({ growth }: { growth: HomeGrowth | undefined }) {
  const router = useRouter();
  if (growth === undefined) return null;
  const open = () =>
    growth.kind === 'business'
      ? router.push({
          pathname: '/businesses/[businessId]',
          params: { businessId: growth.id, section: 'grow' },
        })
      : router.push({ pathname: '/businesses', params: { tier: String(growth.tier) } });
  return <ListRow title={growth.title} subtitle={growth.detail} value="→" onPress={open} />;
}
