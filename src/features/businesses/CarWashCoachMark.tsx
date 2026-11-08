import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function CarWashCoachMark({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card highlighted>
      <AppText variant="heading">New at Local: packages and memberships</AppText>
      <AppText muted>
        Walk-ins pick a package, and bigger packages hold a bay longer. Rain keeps drivers away and
        the day after brings them back in crowds, so check the forecast. Members pay every day
        whatever the weather, but their washes take bay time first.
      </AppText>
      <Button label="Got it" variant="secondary" onPress={onDismiss} />
    </Card>
  );
}
