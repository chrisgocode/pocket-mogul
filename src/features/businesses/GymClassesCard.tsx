import type { ClassesView } from '@/application/gymView';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';

import { bpsAsPercent, classLevelName } from './gymFormat';

function classNote(classes: ClassesView, managerHired: boolean): string {
  if (managerHired)
    return 'Your manager adds classes while studios have room and trims them when full';
  const kept = bpsAsPercent(classes.churnCutBps);
  return `Each level keeps ${kept} more members a day and takes ${classes.studioPercent}% of studio time`;
}

export function GymClassesCard({
  classes,
  managerHired,
  onSelect,
}: {
  classes: ClassesView;
  managerHired: boolean;
  onSelect: (level: number) => void;
}) {
  const levels = Array.from({ length: classes.maxLevel + 1 }, (_, level) => ({
    value: String(level),
    label: classLevelName(level),
  }));
  return (
    <Card>
      <ChoiceRow
        title="Classes"
        note={classNote(classes, managerHired)}
        choices={levels}
        selected={String(classes.level)}
        onSelect={(level) => onSelect(Number(level))}
      />
    </Card>
  );
}
