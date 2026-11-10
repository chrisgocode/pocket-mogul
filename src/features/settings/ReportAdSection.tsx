import { Linking } from 'react-native';

import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

const REPORT_SUBJECT = 'Report an ad in Pocket Fortune';

const AD_REPORT_ADDRESS = 'ads@pocketfortune.example';

function reportAd(): void {
  const subject = encodeURIComponent(REPORT_SUBJECT);
  Linking.openURL(`mailto:${AD_REPORT_ADDRESS}?subject=${subject}`).catch(() => undefined);
}

export function ReportAdSection() {
  return (
    <Section
      title="Ads"
      note="Saw an ad that seems inappropriate? Tell us which screen it was on and what it showed."
    >
      <Card>
        <Button label="Report an ad" variant="secondary" onPress={reportAd} />
      </Card>
    </Section>
  );
}
