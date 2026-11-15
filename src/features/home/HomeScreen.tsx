import { ScrollView, StyleSheet, View } from 'react-native';

import { TUTORIAL_STEPS } from '@/domain/tutorial';
import { TutorialHint } from '@/features/tutorial/TutorialHint';
import { AccentProvider } from '@/ui/Accent';
import { useSegment } from '@/ui/state/useSegment';
import { colors, spacing } from '@/ui/tokens';

import { EarnLeftRail } from './EarnLeftRail';
import { EarnRightRail } from './EarnRightRail';
import { EarnSheets } from './EarnSheets';
import type { EarnSheetName } from './earnSheet';
import { PinnedGoalCard } from './PinnedGoalCard';
import { TapEarnings } from './TapEarnings';
import { WalletUpgrade } from './WalletUpgrade';

export function HomeScreen() {
  const sheet = useSegment<EarnSheetName>('none');
  return (
    <AccentProvider tone="earn">
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        bounces={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <PinnedGoalCard />
        <TutorialHint steps={TUTORIAL_STEPS} />
        <View style={styles.stage}>
          <EarnLeftRail onOpen={sheet.select} />
          <TapEarnings />
          <EarnRightRail onOpen={sheet.select} />
        </View>
        <WalletUpgrade />
      </ScrollView>
      <EarnSheets open={sheet.selected} onClose={() => sheet.select('none')} />
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.md },
  stage: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
