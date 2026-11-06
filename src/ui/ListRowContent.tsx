import { StyleSheet, View } from 'react-native';

import type { ListRowProps } from './ListRow';
import { OptionalCaption } from './OptionalCaption';
import { AppText } from './Typography';

export function ListRowContent({ leading, title, subtitle, value, detail }: ListRowProps) {
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
        <OptionalCaption text={detail} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
});
