import { StyleSheet, View } from 'react-native';

import { Icon } from './Icons';
import { colors, spacing } from './tokens';

const BRANCH_ICON_SIZE = 28;

export function BranchArt({ branches }: { branches: number }) {
  const label = branches === 1 ? '1 branch' : `${branches} branches`;
  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      {Array.from({ length: branches }, (_, index) => (
        <Icon
          key={`branch-${index}`}
          name="businesses"
          color={colors.accent}
          size={BRANCH_ICON_SIZE}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
});
