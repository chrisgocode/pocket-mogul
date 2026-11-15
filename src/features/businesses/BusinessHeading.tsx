import { StyleSheet, View } from 'react-native';

import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { BusinessArt } from '@/ui/BusinessArt';
import { Pips } from '@/ui/Pips';
import { AppText } from '@/ui/Typography';
import { sectionColors, spacing } from '@/ui/tokens';

import { STAGE_COUNT, stageName } from './businessFormat';

export function BusinessHeading({ detail }: { detail: OwnedBusinessDetail }) {
  return (
    <View style={styles.heading}>
      <BusinessArt id={detail.business.id} />
      <View style={styles.text}>
        <AppText
          variant="label"
          style={styles.badge}
        >{`TIER ${detail.business.tier} · ${stageName(detail.stage).toUpperCase()}`}</AppText>
        <AppText variant="title" accessibilityRole="header" numberOfLines={1}>
          {detail.business.name}
        </AppText>
        <Pips total={STAGE_COUNT} filled={detail.stage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
  badge: { color: sectionColors.businesses },
});
