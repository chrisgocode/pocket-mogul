import { useRouter } from 'expo-router';
import type { Holdings } from '@/application/holdingsView';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { AppText } from '@/ui/Typography';
import { holdingRows } from './holdingRows';
export function HoldingsCard({ holdings }: { holdings: Holdings }) {
  const router = useRouter();
  const rows = holdingRows(holdings);
  const open = (row: (typeof rows)[number]) => {
    if (row.kind === 'business')
      router.push({ pathname: '/businesses/[businessId]', params: { businessId: row.id } });
    else if (row.kind === 'property')
      router.push({ pathname: '/properties/[propertyId]', params: { propertyId: row.id } });
    else router.push({ pathname: '/markets/[assetId]', params: { assetId: row.id } });
  };
  return (
    <Card>
      {rows.length === 0 ? <AppText muted>Nothing owned yet</AppText> : null}
      {rows.map((row) => (
        <ListRow
          key={`${row.kind}:${row.id}`}
          title={row.title}
          subtitle={row.subtitle}
          value={row.value}
          detail={row.detail}
          onPress={() => open(row)}
        />
      ))}
    </Card>
  );
}
