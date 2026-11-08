import { StyleSheet, View } from 'react-native';
import { TabStack } from '@/ui/TabStack';
import { GameHeader } from './GameHeader';
export function GameTabStack({ title }: { title: string }) {
  return (
    <View style={styles.stack}>
      <GameHeader />
      <TabStack title={title} />
    </View>
  );
}
const styles = StyleSheet.create({ stack: { flex: 1 } });
