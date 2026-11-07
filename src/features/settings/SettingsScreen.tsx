import Constants from 'expo-constants';

import { CURRENT_ECONOMY_VERSION, FICTIONAL_NOTICE } from '@/content';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { AppText } from '@/ui/Typography';

import { PreferencesSection } from './PreferencesSection';
import { ResetSaveSection } from './ResetSaveSection';

export function SettingsScreen() {
  return (
    <Screen>
      <PreferencesSection />
      <ResetSaveSection />
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
