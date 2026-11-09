import { useRouter } from 'expo-router';
import type { HomeAttention } from '@/application/homeAttention';
import { ListRow } from '@/ui/ListRow';
export function AttentionRow({ item }: { item: HomeAttention }) {
  const router = useRouter();
  const open = () => {
    if (item.kind === 'taxes') router.push('/taxes');
    else if (item.kind === 'property')
      router.push({ pathname: '/properties/[propertyId]', params: { propertyId: item.id } });
    else
      router.push({
        pathname: '/businesses/[businessId]',
        params: { businessId: item.id, section: item.section },
      });
  };
  return <ListRow title={item.title} subtitle={item.detail} value="→" onPress={open} />;
}
