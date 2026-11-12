import type { JumboShareView, JumboView } from '@/application/laundromatView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

import { jumboShareName } from './laundromatFormat';

const shareLabel = (option: JumboShareView) =>
  option.best ? `${jumboShareName(option.percent)} ★` : jumboShareName(option.percent);

const shareChoice = (option: JumboShareView) => ({
  value: String(option.percent),
  label: shareLabel(option),
});

function jumboNote(jumbo: JumboView): string {
  if (jumbo.percent === 0) return 'No jumbo machines: big loads go in the standard ones';
  return `${jumbo.served} of ${jumbo.customers} big-load customers served`;
}

export function MachineMixCard({
  jumbo,
  shares,
  managerHired,
  onSelect,
}: {
  jumbo: JumboView;
  shares: readonly JumboShareView[];
  managerHired: boolean;
  onSelect: (percent: number) => void;
}) {
  const note = managerHired
    ? 'Your manager sets the most profitable share'
    : 'The share of your machines that are jumbo';
  return (
    <Card>
      <ListRow
        title="Jumbo machines"
        subtitle={jumboNote(jumbo)}
        value={`${jumbo.pricePercent}% price`}
      />
      <ChoiceRow
        title="Jumbo share"
        note={note}
        choices={shares.map(shareChoice)}
        selected={String(jumbo.percent)}
        onSelect={(percent) => onSelect(Number(percent))}
      />
      {shares.map((option) => (
        <DetailLine
          key={option.percent}
          label={jumboShareName(option.percent)}
          value={`${formatMoneyExact(option.profitCents)}/day`}
        />
      ))}
    </Card>
  );
}
