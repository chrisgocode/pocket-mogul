import { BannerLayout } from '@/features/ads/BannerLayout';
import { TabStack } from '@/ui/TabStack';

export default function Layout() {
  return (
    <BannerLayout screen="portfolio">
      <TabStack title="Portfolio" />
    </BannerLayout>
  );
}
