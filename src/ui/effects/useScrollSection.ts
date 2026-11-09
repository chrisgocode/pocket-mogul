import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { ScrollViewInstance } from 'react-native';
type AnchorState = { status: 'waiting' } | { status: 'ready'; reached?: string };
export function useScrollSection(section: string | undefined) {
  const ref = useRef<ScrollViewInstance>(null);
  const positions = useRef<Record<string, number>>({});
  const layout = useRef<AnchorState>({ status: 'waiting' });
  const scroll = useCallback(() => {
    if (
      section === undefined ||
      layout.current.status === 'waiting' ||
      layout.current.reached === section
    )
      return;
    const y = positions.current[section];
    if (y === undefined || ref.current === null) return;
    ref.current.scrollTo({ y, animated: false });
    layout.current = { status: 'ready', reached: section };
  }, [section]);
  const register = (name: string, y: number) => {
    positions.current[name] = y;
    scroll();
  };
  const onContentSizeChange = () => {
    if (layout.current.status === 'waiting') layout.current = { status: 'ready' };
    scroll();
  };
  useFocusEffect(
    useCallback(() => {
      if (layout.current.status === 'ready') layout.current = { status: 'ready' };
      scroll();
    }, [scroll]),
  );
  return { ref, register, onContentSizeChange };
}
