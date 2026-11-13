import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { ArtworkSources } from '@/content/artworkSchema';

import type { ArtworkSize } from './Artwork';
import { Icon } from './Icons';
import { useArtworkStatus } from './state/useArtworkStatus';
import { artworkThumbnailSize, colors, radius, spacing } from './tokens';
import { AppText } from './Typography';

export function ArtworkImage({
  sources,
  label,
  size,
}: {
  sources: ArtworkSources | undefined;
  label: string;
  size: ArtworkSize;
}) {
  const { status, onDisplay, onError } = useArtworkStatus();
  return (
    <View
      style={[styles.frame, size === 'thumbnail' && styles.thumbnail]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {status !== 'ready' ? (
        <View style={styles.fallback}>
          <Icon name="collection" color={colors.textMuted} />
          {size === 'card' ? <AppText muted>{label}</AppText> : null}
        </View>
      ) : null}
      {sources !== undefined && status !== 'failed' ? (
        <Image
          testID="collectible-artwork"
          source={sources.map(({ uri, width, height }) => ({ uri, width, height, scale: 1 }))}
          style={styles.image}
          contentFit="contain"
          cachePolicy="memory-disk"
          onDisplay={onDisplay}
          onError={onError}
          accessible={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  thumbnail: { width: artworkThumbnailSize },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
});
