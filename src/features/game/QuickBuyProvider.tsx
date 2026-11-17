import { createContext, use, useMemo, type ReactNode } from 'react';

import { useDismissAfter } from '@/ui/effects/useDismissAfter';
import { useNotice } from '@/ui/state/useNotice';

export type QuickBuyNotice = { readonly tone: 'gain' | 'problem'; readonly message: string };

type QuickBuyNotices = {
  readonly notice: QuickBuyNotice | undefined;
  readonly show: (notice: QuickBuyNotice) => void;
  readonly dismiss: () => void;
};

const NOTICE_MS = 2500;

const QuickBuyContext = createContext<QuickBuyNotices | undefined>(undefined);

export function QuickBuyProvider({ children }: { children: ReactNode }) {
  const { notice, show, dismiss } = useNotice<QuickBuyNotice>();
  useDismissAfter(notice, { ms: NOTICE_MS, dismiss });
  const notices = useMemo(() => ({ notice, show, dismiss }), [notice, show, dismiss]);
  return <QuickBuyContext value={notices}>{children}</QuickBuyContext>;
}

export function useQuickBuyNotices(): QuickBuyNotices {
  const notices = use(QuickBuyContext);
  if (notices === undefined) throw new Error('useQuickBuyNotices needs a QuickBuyProvider');
  return notices;
}
