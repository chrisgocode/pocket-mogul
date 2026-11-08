import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { ScrollViewInstance } from 'react-native';
export function useScrollSection(section: string | undefined) {
  const ref = useRef<ScrollViewInstance>(null);
  const positions = useRef<Record<string, number>>({});
  const reached = useRef<string | undefined>(undefined);
  const scroll = useCallback(() => {
    if (section === undefined || reached.current === section) return;
    const y = positions.current[section];
    if (y === undefined || ref.current === null) return;
    ref.current.scrollTo({ y, animated: false });
    reached.current = section;
  }, [section]);
  const register = (name: string, y: number) => {
    positions.current[name] = y;
    scroll();
  };
  useFocusEffect(scroll);
  return { ref, register, onContentSizeChange: scroll };
}
