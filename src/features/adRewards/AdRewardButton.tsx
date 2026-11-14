import { StyleSheet, View } from 'react-native';

import type { AdOffer } from '@/domain/adRewards';
import { Button } from '@/ui/Button';
import { spacing } from '@/ui/tokens';
import { AppText } from '@/ui/Typography';

import { useAdOffer } from './useAdOffer';

type AdRewardButtonProps = {
  offer: AdOffer;
  name: string;
  reward: string;
  detail?: string;
};

export function AdRewardButton({ offer, name, reward, detail }: AdRewardButtonProps) {
  const { text, watch } = useAdOffer(offer, reward);
  if (text === undefined) return null;
  const notes = [detail, text.note].filter((note) => note !== undefined);
  return (
    <View style={styles.offer}>
      <Button
        label={text.buttonLabel}
        accessibilityLabel={`${name}, ${text.buttonLabel}`}
        variant="secondary"
        onPress={watch}
        disabled={!text.enabled}
      />
      {notes.length > 0 ? (
        <AppText variant="caption" muted style={styles.note}>
          {notes.join(' · ')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  offer: { gap: spacing.xs },
  note: { textAlign: 'center' },
});
