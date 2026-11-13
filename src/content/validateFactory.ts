import type { FactoryMechanic } from './factorySchema';
import type { Business, Content } from './schema';

const WHOLE_PERCENT = 100;

function productIssues(mechanic: FactoryMechanic): string[] {
  const { standard, precision, custom } = mechanic.products;
  const dearer = standard.priceBps < precision.priceBps && precision.priceBps < custom.priceBps;
  const rarer = standard.demandBps > precision.demandBps && precision.demandBps > custom.demandBps;
  return dearer && rarer ? [] : ['finer products must sell for more to fewer buyers'];
}

function bulkIssues(mechanic: FactoryMechanic): string[] {
  const { bulk } = mechanic;
  const largest = Math.max(...bulk.sizePercents) * bulk.maxOrders;
  const ids = new Set(bulk.clients.map((client) => client.id));
  return [
    largest >= WHOLE_PERCENT && 'bulk orders must leave lines for the open market',
    bulk.rateBps.min > bulk.rateBps.max && 'bulk rates must be a range',
    bulk.days.min > bulk.days.max && 'bulk order lengths must be a range',
    ids.size !== bulk.clients.length && 'bulk clients must have unique IDs',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: FactoryMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const automationStage = mechanic.automation.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (automationStage > stages || automationStage < mechanic.unlockStage) &&
      'automation must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function factoryIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'factory') return [];
  return [
    ...productIssues(mechanic),
    ...bulkIssues(mechanic),
    ...stageIssues(mechanic, content),
  ].map((issue) => `Business ${business.id} ${issue}`);
}

export function factoryMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => factoryIssues(business, content));
}
