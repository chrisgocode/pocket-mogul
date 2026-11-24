import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { Freeze } from 'react-freeze';

export function FrozenWhenHidden({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  return <Freeze freeze={!focused}>{children}</Freeze>;
}
