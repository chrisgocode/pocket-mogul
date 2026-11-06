import { StyleSheet, View } from 'react-native';

import type { NewsItem } from '@/application/marketNews';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';

import { newsTiming } from './marketFormat';

export function NewsList({ items, empty }: { items: readonly NewsItem[]; empty: string }) {
  return (
    <Card>
      {items.length === 0 ? (
        <AppText muted>{empty}</AppText>
      ) : (
        items.map((item) => (
          <View key={item.key} style={styles.item} accessible>
            <AppText>{item.headline}</AppText>
            <AppText variant="caption" muted>
              {newsTiming(item)}
            </AppText>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { gap: 2, paddingVertical: spacing.xs },
});
