import { StyleSheet, View } from 'react-native';
import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { AppText } from '@/ui/Typography';
import { sectionColors, spacing } from '@/ui/tokens';
import { stageName } from './businessFormat';
export function BusinessHeading({ detail }: { detail: OwnedBusinessDetail }) {
  return (
    <View style={styles.heading}>
      <AppText
        variant="caption"
        style={styles.badge}
      >{`TIER ${detail.business.tier} · ${stageName(detail.stage).toUpperCase()}`}</AppText>
      <AppText variant="display" accessibilityRole="header">
        {detail.business.name}
      </AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  heading: { gap: spacing.md, paddingTop: spacing.lg },
  badge: { color: sectionColors.businesses },
});
