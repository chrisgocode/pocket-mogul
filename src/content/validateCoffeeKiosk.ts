import type { CoffeeKioskMechanic } from './coffeeKioskSchema';
import type { Business, Content } from './schema';

function gradeIssues(mechanic: CoffeeKioskMechanic): string[] {
  const { house, single_origin: singleOrigin, reserve } = mechanic.grades;
  const rising = house.priceBps < singleOrigin.priceBps && singleOrigin.priceBps < reserve.priceBps;
  const dearer = house.costBps < singleOrigin.costBps && singleOrigin.costBps < reserve.costBps;
  return [
    !(rising && dearer) && 'better bean grades must cost more and sell for more',
    mechanic.rushDemandBps <= mechanic.rushWindowBps &&
      'the rush must bring a bigger share of customers than its share of the day',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: CoffeeKioskMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const orderStage = mechanic.orderAhead.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (orderStage > stages || orderStage < mechanic.unlockStage) &&
      'order-ahead must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function coffeeKioskIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'coffee_kiosk') return [];
  return [...gradeIssues(mechanic), ...stageIssues(mechanic, content)].map(
    (issue) => `Business ${business.id} ${issue}`,
  );
}

export function coffeeKioskMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => coffeeKioskIssues(business, content));
}
