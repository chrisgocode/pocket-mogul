import type { AvailableHire } from '@/application/businessDetailView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';

export function HireButton({
  hire,
  role,
  onHire,
}: {
  hire: AvailableHire;
  role: string;
  onHire: (hire: AvailableHire) => void;
}) {
  const label = priceLabel('Hire', { ...hire, priceCents: hire.signingFeeCents });
  return (
    <Button
      label={label}
      accessibilityLabel={`Hire ${role}, ${label}`}
      onPress={() => onHire(hire)}
      disabled={!hire.affordable}
    />
  );
}
