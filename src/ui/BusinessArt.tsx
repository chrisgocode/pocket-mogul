import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { businessDrawings } from './businessDrawings';

export function BusinessArt({ id }: { id: string }) {
  const drawing = businessDrawings[id] ?? [];
  return (
    <View style={styles.art} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Svg width={52} height={56} viewBox="0 0 100 100" accessibilityElementsHidden>
        {drawing.map((layer) => (
          <Path key={layer.d} {...layer} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  art: {
    width: 52,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
