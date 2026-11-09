import { createContext, useContext, type ReactNode } from 'react';
import { sectionColors, type SectionTone } from './tokens';
const AccentContext = createContext<SectionTone>('profile');
export function AccentProvider({ tone, children }: { tone: SectionTone; children: ReactNode }) {
  return <AccentContext value={tone}>{children}</AccentContext>;
}
export function useAccent() {
  return sectionColors[useContext(AccentContext)];
}
