import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FICTIONAL_NOTICE, getContent } from '@/content';
import { formatMoneyExact, formatPrice } from '@/domain/money';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';
import { colors, radius, spacing, minimumTouchTarget } from '@/ui/tokens';

type Segment = 'stocks' | 'crypto';

const CLASS_LABEL = { standard: 'Stock', blue_chip: 'Blue chip', penny: 'Penny stock' } as const;
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function MarketsScreen() {
  const [segment, setSegment] = useState<Segment>('stocks');
  const { stocks, coins } = getContent();

  return (
    <Screen>
      <View style={styles.segments} accessibilityRole="tablist">
        {(['stocks', 'crypto'] as const).map((s) => (
          <Pressable
            key={s}
            accessibilityRole="tab"
            accessibilityState={{ selected: segment === s }}
            onPress={() => setSegment(s)}
            style={[styles.segment, segment === s && styles.segmentActive]}
          >
            <AppText variant="heading" style={segment === s ? styles.segmentTextActive : undefined}>
              {s === 'stocks' ? 'Stocks' : 'Crypto'}
            </AppText>
          </Pressable>
        ))}
      </View>
      <EmptyState
        title="Look around first"
        message="Markets become tradable after you buy your first business."
      />
      <Card>
        {segment === 'stocks'
          ? stocks.map((s) => (
              <ListRow
                key={s.id}
                leading={<LogoMark logo={s.logo} />}
                title={s.name}
                subtitle={`${s.ticker} · ${titleCase(s.sector)} · ${CLASS_LABEL[s.volatilityClass]}`}
                value={formatPrice(s.initialPrice)}
                detail={
                  s.dividendCentsPerSharePerHour > 0n
                    ? `${formatMoneyExact(s.dividendCentsPerSharePerHour)}/share/hr`
                    : undefined
                }
              />
            ))
          : coins.map((k) => (
              <ListRow
                key={k.id}
                leading={<LogoMark logo={k.logo} />}
                title={k.name}
                subtitle={`${k.ticker} · ${k.theme}`}
                value={formatPrice(k.initialPrice)}
              />
            ))}
      </Card>
      <AppText variant="caption" muted style={styles.notice}>
        {FICTIONAL_NOTICE}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentTextActive: { color: colors.accent },
  notice: { textAlign: 'center' },
});
