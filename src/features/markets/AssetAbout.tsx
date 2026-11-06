import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import type { ListedAsset } from './AssetOverview';

export function AssetAbout({ detail }: { detail: ListedAsset }) {
  return (
    <Card>
      <AppText>{detail.kind === 'stock' ? detail.asset.description : detail.asset.story}</AppText>
    </Card>
  );
}
