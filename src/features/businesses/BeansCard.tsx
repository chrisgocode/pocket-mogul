import type { BeanGradeView } from '@/application/coffeeKioskView';
import type { BeanGrade } from '@/domain/business/coffeeKioskRules';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';

import { GRADE_NAMES } from './coffeeKioskFormat';

const gradeLabel = (option: BeanGradeView) =>
  option.best ? `${GRADE_NAMES[option.grade]} ★` : GRADE_NAMES[option.grade];

const gradeFacts = (option: BeanGradeView | undefined) =>
  option === undefined
    ? ''
    : `Price ${option.pricePercent}% · Cost a cup ${option.costPercent}% · Customers ${option.customersPercent}%`;

export function BeansCard({
  grade,
  grades,
  onSelect,
}: {
  grade: BeanGrade;
  grades: readonly BeanGradeView[];
  onSelect: (grade: BeanGrade) => void;
}) {
  return (
    <Card>
      <ChoiceRow
        title="Beans"
        note={gradeFacts(grades.find((option) => option.grade === grade))}
        choices={grades.map((option) => ({ value: option.grade, label: gradeLabel(option) }))}
        selected={grade}
        onSelect={onSelect}
      />
      {grades.map((option) => (
        <DetailLine
          key={option.grade}
          label={GRADE_NAMES[option.grade]}
          value={`${formatMoneyExact(option.profitCents)}/day`}
        />
      ))}
    </Card>
  );
}
