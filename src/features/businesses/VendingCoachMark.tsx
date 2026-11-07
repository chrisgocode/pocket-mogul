import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function VendingCoachMark({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card highlighted>
      <AppText variant="heading">New at Local: locations and stock</AppText>
      <AppText muted>
        Place machines where people are: busy spots bring more customers. Stock each location with
        the mix its crowd wants, and keep it filled: a location that runs out sells nothing.
        Restocking staff refill every location at the start of each day.
      </AppText>
      <Button label="Got it" variant="secondary" onPress={onDismiss} />
    </Card>
  );
}
