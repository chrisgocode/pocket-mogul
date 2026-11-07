import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { BannerScreen } from '@/application/automaticAds';

import { AdBanner } from './AdBanner';

export function BannerLayout({ screen, children }: { screen: BannerScreen; children: ReactNode }) {
  return (
    <View style={styles.layout}>
      <View style={styles.content}>{children}</View>
      <AdBanner screen={screen} />
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1 },
  content: { flex: 1 },
});
