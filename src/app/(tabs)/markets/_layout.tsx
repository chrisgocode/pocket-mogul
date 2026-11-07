import { BannerLayout } from '@/features/ads/BannerLayout';
import { TabStack } from '@/ui/TabStack';

export default function Layout() {
  return (
    <BannerLayout screen="markets">
      <TabStack title="Markets" />
    </BannerLayout>
  );
}
