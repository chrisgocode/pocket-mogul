import type { AvailableHire, ReadyStage } from '@/application/businessDetailView';
import type { Business } from '@/content';
import type { StaffRole } from '@/domain/business/definition';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import type { ConfirmationLine } from '@/ui/ConfirmationDetails';
import { formatCashChange } from '@/features/game/priceFormat';

import { formatPerDay, profitChange, roleName, spent, stageName } from './businessFormat';
import { flagshipUnlockName } from './flagshipUnlockText';

export function hireText(hire: AvailableHire, business: Business): ActionSheetText {
  const role = roleName(business, hire.role);
  return {
    title: `Hire ${role.toLowerCase()} staff`,
    lines: [
      { label: 'Signing fee', value: formatCashChange(spent(hire.signingFeeCents)) },
      { label: 'Wage', value: formatPerDay(hire.wageCents) },
      { label: 'Profit', value: profitChange(hire.profitCents, hire.nextProfitCents) },
      { label: role, value: `${hire.count} → ${hire.count + 1}` },
    ],
    confirmLabel: `Confirm hire · ${formatMoneyExact(hire.signingFeeCents)}`,
  };
}

export function fireText(role: StaffRole, business: Business): ActionSheetText {
  const name = roleName(business, role).toLowerCase();
  return {
    title: `Let go of ${role === 'manager' ? 'your manager' : `one ${name} hire`}`,
    lines: [
      { label: 'Cost', value: 'Free' },
      { label: 'Wages', value: 'Stop from now on' },
    ],
    confirmLabel: 'Confirm',
  };
}

function unlockLines(stage: ReadyStage, business: Business): ConfirmationLine[] {
  const unlocked = flagshipUnlockName(business, stage.unlocks);
  const parked = stage.parkedUnits;
  return [
    ...(unlocked === undefined ? [] : [{ label: 'Unlocks', value: unlocked }]),
    ...(parked === 0
      ? []
      : [{ label: 'Vans without a driver', value: `${parked} stop delivering` }]),
  ];
}

export function stageText(stage: ReadyStage, business: Business): ActionSheetText {
  const next = stageName(stage.stage + 1);
  return {
    title: `Grow to ${next}`,
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(stage.priceCents)) },
      { label: 'Stage', value: `${stageName(stage.stage)} → ${next}` },
      ...unlockLines(stage, business),
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(stage.priceCents)}`,
  };
}
