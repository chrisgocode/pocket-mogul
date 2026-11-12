import type { LaundromatMechanic } from './laundromatSchema';
import type { Business, Content } from './schema';

const WHOLE_PERCENT = 100;

const rises = (values: readonly number[]) =>
  values.every((value, index) => index === 0 || value > (values[index - 1] ?? value));

const falls = (values: readonly number[]) =>
  values.every((value, index) => index === 0 || value < (values[index - 1] ?? value));

function mixIssues(mechanic: LaundromatMechanic): string[] {
  const { jumbo, service } = mechanic;
  const reserved = service.loadsPercentPerLevel * service.priceBpsByLevel.length;
  return [
    (jumbo.sharePercents[0] !== 0 || !rises(jumbo.sharePercents)) &&
      'jumbo shares must start at none and rise',
    !falls(service.priceBpsByLevel) && 'each service level must sell for less than the one before',
    reserved >= WHOLE_PERCENT && 'service washes must leave machines for walk-ins',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: LaundromatMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const pickupStage = mechanic.pickup.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (pickupStage > stages || pickupStage < mechanic.unlockStage) &&
      'pickup must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function laundromatIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'laundromat') return [];
  return [...mixIssues(mechanic), ...stageIssues(mechanic, content)].map(
    (issue) => `Business ${business.id} ${issue}`,
  );
}

export function laundromatMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => laundromatIssues(business, content));
}
