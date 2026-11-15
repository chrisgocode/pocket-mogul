export type BusinessTab = 'grow' | 'run' | 'staff' | 'more';

export const BUSINESS_TABS: readonly { value: BusinessTab; label: string }[] = [
  { value: 'grow', label: 'Grow' },
  { value: 'run', label: 'Run' },
  { value: 'staff', label: 'Staff' },
  { value: 'more', label: 'More' },
];

const TAB_BY_SECTION: Readonly<Record<string, BusinessTab>> = {
  grow: 'grow',
  overview: 'run',
  treasury: 'run',
  mechanic: 'run',
  staff: 'staff',
  risks: 'more',
  deals: 'more',
  synergies: 'more',
};

export function tabForSection(section: string | undefined): BusinessTab {
  return (section === undefined ? undefined : TAB_BY_SECTION[section]) ?? 'grow';
}
