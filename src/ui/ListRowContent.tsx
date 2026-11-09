import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionalCaption } from './OptionalCaption';
import { AppText } from './Typography';
import type { Trend } from './tokens';

export type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string | undefined;
  value?: string | undefined;
  detail?: string | undefined;
  detailTrend?: Trend;
  dimmed?: boolean;
  accessibilityLabel?: string;
  onPress?: (() => void) | undefined;
};

export function ListRowContent({
  leading,
  title,
  subtitle,
  value,
  detail,
  detailTrend,
}: ListRowProps) {
  return (
    <>
      {leading}
      <View style={styles.main}>
        <AppText variant="heading" numberOfLines={2}>
          {title}
        </AppText>
        <OptionalCaption text={subtitle} />
      </View>
      <View style={styles.trailing}>
        {value === undefined ? null : <AppText variant="number">{value}</AppText>}
        <OptionalCaption text={detail} trend={detailTrend} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, minWidth: 0, gap: 2 },
  trailing: { alignItems: 'flex-end', gap: 2, flexShrink: 1, maxWidth: '48%' },
});
