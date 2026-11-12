import { profitPerDayCents } from '@/domain/business/core';
import type { BusinessPricing } from '@/domain/business/definition';
import { bestJumboShare, withJumboShare } from '@/domain/business/laundromat';
import { runningLaundromat } from '@/domain/business/laundromatDemand';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { GameCommand } from '@/domain/commands';

export function laundromatCommands(owned: OwnedBusiness, pricing: BusinessPricing): GameCommand[] {
  const running = runningLaundromat(owned, pricing);
  if (running === undefined) return [];
  const { operation, rules } = running;
  const businessId = owned.definitionId;
  const percent = bestJumboShare(owned, pricing);
  const mixed = withJumboShare(owned, { operation, jumboPercent: percent });
  const maxLevel = Math.min(rules.service.priceBpsByLevel.length, owned.staff.operations);
  const served = (serviceLevel: number) => ({
    serviceLevel,
    profit: profitPerDayCents(
      { ...mixed, laundromat: { ...operation, jumboPercent: percent, serviceLevel } },
      pricing,
    ),
  });
  const { serviceLevel } = Array.from({ length: maxLevel + 1 }, (_, level) => served(level)).reduce(
    (best, each) => (each.profit > best.profit ? each : best),
  );
  const jumbo: GameCommand[] =
    percent === operation.jumboPercent ? [] : [{ type: 'SetJumboShare', businessId, percent }];
  const service: GameCommand[] =
    serviceLevel === operation.serviceLevel
      ? []
      : [{ type: 'SetServiceLevel', businessId, level: serviceLevel }];
  return [...jumbo, ...service];
}
