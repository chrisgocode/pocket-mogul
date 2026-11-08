import { PRODUCT_LINES, type ProductSplit } from '@/domain/business/vendingRules';

import type { Business, Content } from './schema';
import type { VendingMechanic } from './vendingSchema';

const WHOLE_PERCENT = 100;

const splitTotal = (split: ProductSplit) =>
  PRODUCT_LINES.reduce((total, line) => total + split[line], 0);

function splitIssues(business: Business, mechanic: VendingMechanic): string[] {
  const splits = [
    ...Object.entries(mechanic.locations).map(([id, location]) => ({
      name: `location ${id} taste`,
      split: location.taste,
    })),
    ...Object.entries(mechanic.mixes).map(([id, split]) => ({ name: `mix ${id}`, split })),
  ];
  return splits
    .filter(({ split }) => splitTotal(split) !== WHOLE_PERCENT)
    .map(({ name }) => `Business ${business.id} ${name} must add up to 100%`);
}

function stageIssues(business: Business, mechanic: VendingMechanic, content: Content): string[] {
  const { stages } = content.economy.businessRules;
  const finalCap = stages[stages.length - 1]?.unitCap ?? 0;
  const readersStage = mechanic.cardReaders.stage;
  return [
    mechanic.unlockStage > stages.length &&
      `Business ${business.id} mechanic must unlock at a stage that exists`,
    (readersStage > stages.length || readersStage < mechanic.unlockStage) &&
      `Business ${business.id} card readers must unlock at a stage after the mechanic`,
    mechanic.locations.office.slots < finalCap &&
      `Business ${business.id} office must hold every machine at the top stage`,
  ].filter((issue) => issue !== false);
}

function vendingIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'vending') return [];
  const matchIssue =
    mechanic.matchBps.poor >= mechanic.matchBps.perfect
      ? [`Business ${business.id} poor match must be below a perfect match`]
      : [];
  return [
    ...splitIssues(business, mechanic),
    ...matchIssue,
    ...stageIssues(business, mechanic, content),
  ];
}

export function vendingMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => vendingIssues(business, content));
}
