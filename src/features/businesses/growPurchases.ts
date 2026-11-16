import type { AvailableImprovement, AvailableUnit } from '@/application/businessDetailView';
import type { Business } from '@/content';
import type { QuickPurchase } from '@/features/game/useQuickBuy';

import { profitGain, TRACK_NAMES } from './businessFormat';

export function unitPurchase(business: Business, unit: AvailableUnit): QuickPurchase {
  return {
    command: { type: 'BuyUnit', businessId: business.id, fromUnits: unit.units },
    gained: `Added a ${business.unitName} · ${profitGain(unit.profitCents, unit.nextProfitCents)} profit`,
  };
}

export function improvementPurchase(
  business: Business,
  improvement: AvailableImprovement,
): QuickPurchase {
  const track = TRACK_NAMES[improvement.label];
  const gain = profitGain(improvement.profitCents, improvement.nextProfitCents);
  return {
    command: {
      type: 'UpgradeBusiness',
      businessId: business.id,
      track: improvement.track,
      fromLevel: improvement.level,
    },
    gained: `${track} ${improvement.level + 1} · ${gain} profit`,
  };
}
