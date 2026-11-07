import { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';

import type { BannerScreen } from '@/application/automaticAds';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { colors, spacing } from '@/ui/tokens';

import { useRenderBanner } from './BannerViewContext';

export function AdBanner({ screen }: { screen: BannerScreen }) {
  const game = useGame();
  const { banner } = useGameSnapshot();
  const renderBanner = useRenderBanner();
  if (banner !== 'allowed') return null;
  return (
    <View style={styles.slot} testID={`ad-banner-${screen}`}>
      <Suspense fallback={null}>
        {renderBanner({
          onLoaded: () => game.reportBanner('loaded', screen),
          onClicked: () => game.reportBanner('clicked', screen),
        })}
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
