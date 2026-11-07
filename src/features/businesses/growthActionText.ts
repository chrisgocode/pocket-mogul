import type { AvailableHire, ReadyStage } from '@/application/businessDetailView';
import type { StaffRole } from '@/domain/business/definition';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { formatPerDay, profitChange, ROLE_NAMES, spent, stageName } from './businessFormat';

export function hireText(hire: AvailableHire): ActionSheetText {
  const role = ROLE_NAMES[hire.role];
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

export function fireText(role: StaffRole): ActionSheetText {
  const name = ROLE_NAMES[role].toLowerCase();
  return {
    title: `Let go of ${role === 'manager' ? 'your manager' : `one ${name} hire`}`,
    lines: [
      { label: 'Cost', value: 'Free' },
      { label: 'Wages', value: 'Stop from now on' },
    ],
    confirmLabel: 'Confirm',
  };
}

export function stageText(stage: ReadyStage): ActionSheetText {
  const next = stageName(stage.stage + 1);
  return {
    title: `Grow to ${next}`,
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(stage.priceCents)) },
      { label: 'Stage', value: `${stageName(stage.stage)} → ${next}` },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(stage.priceCents)}`,
  };
}
