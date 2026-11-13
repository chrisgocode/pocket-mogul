import type { BakeryMechanic } from './bakerySchema';
import type { Business, Content } from './schema';

const WHOLE_PERCENT = 100;
const BASIS_POINTS = 10_000;

const rises = (values: readonly number[]) =>
  values.every((value, index) => index === 0 || value > (values[index - 1] ?? value));

function wholesaleIssues(mechanic: BakeryMechanic): string[] {
  const { wholesale, bakePercents } = mechanic;
  const largest = Math.max(...wholesale.sizePercents) * wholesale.maxOrders;
  const ids = new Set(wholesale.clients.map((client) => client.id));
  return [
    (!rises(bakePercents) || bakePercents[bakePercents.length - 1] !== WHOLE_PERCENT) &&
      'bake levels must rise to a full bake',
    largest >= WHOLE_PERCENT && 'wholesale orders must leave ovens for retail',
    (wholesale.priceBps.min > wholesale.priceBps.max || wholesale.priceBps.max >= BASIS_POINTS) &&
      'wholesale prices must be a range below the retail price',
    wholesale.days.min > wholesale.days.max && 'wholesale lengths must be a range',
    ids.size !== wholesale.clients.length && 'wholesale clients must have unique IDs',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: BakeryMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const kitchenStage = mechanic.centralKitchen.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (kitchenStage > stages || kitchenStage < mechanic.unlockStage) &&
      'central kitchen must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function bakeryIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'bakery') return [];
  return [...wholesaleIssues(mechanic), ...stageIssues(mechanic, content)].map(
    (issue) => `Business ${business.id} ${issue}`,
  );
}

export function bakeryMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => bakeryIssues(business, content));
}
