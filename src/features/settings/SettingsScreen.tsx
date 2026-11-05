import Constants from 'expo-constants';

import { CURRENT_ECONOMY_VERSION, FICTIONAL_NOTICE } from '@/content';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { AppText } from '@/ui/Typography';

export function SettingsScreen() {
  return (
    <Screen>
      <Section title="Preferences" note="Saved settings arrive with the save system.">
        <Card>
          <ListRow title="Sound" detail="On" />
          <ListRow title="Haptics" detail="On" />
          <ListRow title="Reduced motion" detail="Follow system" />
          <ListRow title="Number formatting" detail="Compact" />
        </Card>
      </Section>
      <Section title="About">
        <Card>
          <ListRow title="App version" detail={Constants.expoConfig?.version ?? 'unknown'} />
          <ListRow title="Economy version" detail={String(CURRENT_ECONOMY_VERSION)} />
          <AppText variant="caption" muted>
            {FICTIONAL_NOTICE}
          </AppText>
        </Card>
      </Section>
    </Screen>
  );
}
