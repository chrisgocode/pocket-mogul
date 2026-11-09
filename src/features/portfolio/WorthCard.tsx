import type { Worth } from '@/application/portfolioView';
import { formatMoneyExact } from '@/domain/money';
import { ValuationDetails } from './ValuationDetails';
import { Button } from '@/ui/Button';
import { StyleSheet, View } from 'react-native';
import { sectionColors, spacing } from '@/ui/tokens';
import { DetailLine } from '@/ui/DetailLine';
import { useDisclosure } from '@/ui/state/useDisclosure';
import { AppText } from '@/ui/Typography';

export function WorthCard({ worth }: { worth: Worth }) {
  const { expanded, toggle } = useDisclosure();
  return (
    <View style={styles.content}>
      <AppText variant="caption" muted>
        Net worth
      </AppText>
      <AppText
        variant="display"
        style={styles.worth}
        accessibilityLabel={`Net worth, ${formatMoneyExact(worth.netWorthCents)}`}
      >
        {formatMoneyExact(worth.netWorthCents)}
      </AppText>
      <DetailLine label="Cash" value={formatMoneyExact(worth.cashCents)} />
      <DetailLine
        label="Estimated and assessed tax liability"
        value={formatMoneyExact(worth.taxLiabilityCents)}
      />
      <DetailLine label="Owned assets" value={formatMoneyExact(worth.assetsCents)} />
      {expanded ? <ValuationDetails worth={worth} /> : null}
      <Button
        label={expanded ? 'Hide how net worth is valued' : 'How net worth is valued'}
        variant="secondary"
        onPress={toggle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  worth: { color: sectionColors.profile },
});
