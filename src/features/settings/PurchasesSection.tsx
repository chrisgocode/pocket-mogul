import { storeNotice } from '@/application/storeView';
import { useStorefront } from '@/features/store/useStorefront';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';
import { AppText } from '@/ui/Typography';

export function PurchasesSection() {
  const { storefront, front } = useStorefront();
  const notice = storeNotice(front, 'restore');
  const restoring = front.activity.status === 'restoring';
  if (storefront.status === 'closed') return null;
  return (
    <Section
      title="Purchases"
      note="Bought something on another phone or before reinstalling? Restore it here."
    >
      <Card>
        <Button
          label={restoring ? 'Restoring…' : 'Restore purchases'}
          variant="secondary"
          disabled={restoring}
          onPress={() => void storefront.restore()}
        />
        {notice === undefined ? null : <AppText accessibilityRole="alert">{notice}</AppText>}
      </Card>
    </Section>
  );
}
