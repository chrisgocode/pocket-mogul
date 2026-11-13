import type { BakeLevelView, ShelfView } from '@/application/bakeryView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

const levelLabel = (option: BakeLevelView) =>
  option.best ? `${option.percent}% ★` : `${option.percent}%`;

const levelChoice = (option: BakeLevelView) => ({
  value: String(option.percent),
  label: levelLabel(option),
});

export function OvenScheduleCard({
  bakePercent,
  levels,
  shelf,
  managerHired,
  onSelect,
}: {
  bakePercent: number;
  levels: readonly BakeLevelView[];
  shelf: ShelfView;
  managerHired: boolean;
  onSelect: (percent: number) => void;
}) {
  const note = managerHired
    ? 'Your manager sets the most profitable bake level'
    : 'The share of oven capacity you bake each day';
  return (
    <Card>
      <ListRow
        title="Retail shelf"
        subtitle={`${shelf.sold} of ${shelf.baked} baked orders sold`}
        value={shelf.stale === 0 ? 'Sold out' : `${shelf.stale} go stale`}
      />
      <ChoiceRow
        title="Bake level"
        note={note}
        choices={levels.map(levelChoice)}
        selected={String(bakePercent)}
        onSelect={(percent) => onSelect(Number(percent))}
      />
      {levels.map((option) => (
        <DetailLine
          key={option.percent}
          label={`${option.percent}%`}
          value={`${formatMoneyExact(option.profitCents)}/day`}
        />
      ))}
    </Card>
  );
}
