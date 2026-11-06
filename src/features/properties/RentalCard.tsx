import type { OwnedPropertyDetail } from '@/application/propertyDetailView';
import { formatRatePerMinute } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function RentalCard({
  detail,
  onReview,
}: {
  detail: OwnedPropertyDetail;
  onReview: (rented: boolean) => void;
}) {
  const { name } = detail.property;
  const net = formatRatePerMinute(detail.rentedNetPerMinuteCents, 'full');
  if (detail.rented) {
    return (
      <Card>
        <AppText variant="heading">Rented</AppText>
        <AppText muted>Earning {net} net. Unrenting stops both rent and upkeep.</AppText>
        <Button
          label="Unrent"
          accessibilityLabel={`Unrent ${name}`}
          variant="secondary"
          onPress={() => onReview(false)}
        />
      </Card>
    );
  }
  return (
    <Card>
      <AppText variant="heading">Vacant</AppText>
      <AppText muted>Rent it out to earn {net} net. A vacant property pays no upkeep.</AppText>
      <Button
        label="Rent out"
        accessibilityLabel={`Rent out ${name}`}
        onPress={() => onReview(true)}
      />
    </Card>
  );
}
