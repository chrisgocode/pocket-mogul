import { StyleSheet, View } from 'react-native';

import type { RiskOption } from '@/application/businessRisksView';
import type { InsuranceQuote } from '@/domain/business/risks';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { CATEGORY_NAMES, formatChance, POLICY_NAMES, stageName } from './businessFormat';
import { InsuranceButton, type InsuranceChange } from './InsuranceButton';

function policyValue(insurance: InsuranceQuote): string {
  if (insurance.status === 'locked') return `Insurance at ${stageName(insurance.unlockStage)}`;
  return POLICY_NAMES[insurance.policy];
}

export function RiskRow({
  option,
  onInsurance,
}: {
  option: RiskOption;
  onInsurance: (change: InsuranceChange) => void;
}) {
  const { incident, insurance } = option;
  const subtitle = `${CATEGORY_NAMES[incident.category]} · ${formatChance(incident.chanceBps)} a day · ${option.effect}`;
  return (
    <View style={styles.row}>
      <ListRow
        title={incident.name}
        subtitle={subtitle}
        value={policyValue(insurance)}
        dimmed={insurance.status === 'locked'}
      />
      {insurance.status === 'available' ? (
        <InsuranceButton insurance={insurance} onChange={onInsurance} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
});
