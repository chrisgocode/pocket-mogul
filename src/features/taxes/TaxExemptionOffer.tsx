import { useRouter } from 'expo-router';

import { useGame } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function TaxExemptionOffer() {
  const router = useRouter();
  const { storefront } = useGame();
  if (storefront.status === 'closed') return null;
  return (
    <Card>
      <AppText variant="heading">Done with taxes?</AppText>
      <AppText muted>The tax exemption ends filing and tax for good.</AppText>
      <Button
        label="See it in the Store"
        variant="secondary"
        onPress={() => router.push('/store')}
      />
    </Card>
  );
}
