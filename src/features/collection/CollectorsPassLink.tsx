import { useRouter } from 'expo-router';

import { useGame } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';

export function CollectorsPassLink() {
  const router = useRouter();
  const { storefront } = useGame();
  if (storefront.status !== 'open') return null;
  return (
    <Button
      variant="secondary"
      label="See the Collector's pass"
      accessibilityLabel="See the Collector's pass in the Store"
      onPress={() => router.push('/store')}
    />
  );
}
