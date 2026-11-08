import { createContext, type ReactNode } from 'react';
export type SectionRegistration = (name: string, y: number) => void;
export const ScrollSectionContext = createContext<SectionRegistration | undefined>(undefined);
export function ScrollSections({
  register,
  children,
}: {
  register: SectionRegistration;
  children: ReactNode;
}) {
  return <ScrollSectionContext value={register}>{children}</ScrollSectionContext>;
}
