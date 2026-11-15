import { useRouter } from 'expo-router';

import { useGame } from '@/features/game/GameContext';
import { RoundButton } from '@/ui/RoundButton';

export function ShopButton() {
  const router = useRouter();
  const { storefront } = useGame();
  if (storefront.status !== 'open') return null;
  return (
    <RoundButton
      icon="store"
      label="Shop"
      accessibilityLabel="Open Shop"
      onPress={() => router.push('/store')}
    />
  );
}
