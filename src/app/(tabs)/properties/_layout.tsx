import { BannerLayout } from '@/features/ads/BannerLayout';
import { TabStack } from '@/ui/TabStack';

export default function Layout() {
  return (
    <BannerLayout screen="properties">
      <TabStack title="Properties" />
    </BannerLayout>
  );
}
