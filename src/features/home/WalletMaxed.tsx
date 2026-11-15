import type { MoneyCents } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function WalletMaxed({ level, payoutCents }: { level: number; payoutCents: MoneyCents }) {
  const format = useMoneyFormat();
  return (
    <Card accessibilityLabel={`Wallet level ${level}, max level`}>
      <AppText variant="label" muted>
        Wallet Lv {level} · Max
      </AppText>
      <AppText variant="heading">{format.short(payoutCents)} / tap</AppText>
    </Card>
  );
}
