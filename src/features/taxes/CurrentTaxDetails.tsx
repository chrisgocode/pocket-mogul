import type { TaxesView } from '@/application/taxesView';
import { Button } from '@/ui/Button';
import { useDisclosure } from '@/ui/state/useDisclosure';

import { TaxStatementLines } from './TaxStatementLines';

export function CurrentTaxDetails({ view }: { view: TaxesView }) {
  const { expanded, toggle } = useDisclosure();
  return (
    <>
      <Button
        label={expanded ? 'Hide daily source details' : 'Inspect daily source details'}
        variant="secondary"
        onPress={toggle}
      />
      {expanded ? <TaxStatementLines lines={view.lines} sourceName={view.sourceName} /> : null}
    </>
  );
}
