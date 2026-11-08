import type { DeliveryMechanic } from './deliverySchema';
import type { Business, Content } from './schema';

const BASIS_POINTS = 10_000;
const STAR_LEVELS = 5;

const ascending = (values: readonly number[]) =>
  values.every((value, index) => index === 0 || value > (values[index - 1] ?? value));

function offerIssues(mechanic: DeliveryMechanic): string[] {
  const { offers } = mechanic;
  const ranges = [offers.fleetSharePercent, offers.ratePercent, offers.penaltyPercent, offers.days];
  const ids = offers.clients.map((client) => client.id);
  return [
    ranges.some((range) => range.min > range.max) && 'offer ranges must not run backwards',
    offers.days.min < 1 && 'contracts must last at least a day',
    new Set(ids).size !== ids.length && 'client IDs must be unique',
  ].filter((issue) => issue !== false);
}

function reputationIssues(mechanic: DeliveryMechanic): string[] {
  const { reputation } = mechanic;
  const thresholds = reputation.stars.map((star) => star.minOnTimeBps);
  return [
    thresholds.length !== STAR_LEVELS && 'reputation needs a rule for each of five stars',
    thresholds[0] !== 0 && 'one star must need no on-time share',
    (!ascending(thresholds) || thresholds.some((bps) => bps > BASIS_POINTS)) &&
      'star thresholds must rise and stay within 100%',
    reputation.startingStars > STAR_LEVELS && 'starting reputation must be at most five stars',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: DeliveryMechanic, content: Content): string[] {
  const { stages } = content.economy.businessRules;
  const hub = mechanic.sortingHub.stage;
  const staffed = stages.every(
    (stage) => stage.staffCap.operations * mechanic.vansPerDriver >= stage.unitCap,
  );
  return [
    mechanic.unlockStage > stages.length && 'mechanic must unlock at a stage that exists',
    (hub > stages.length || hub < mechanic.unlockStage) &&
      'the sorting hub must unlock at a stage after the mechanic',
    !staffed && 'drivers allowed at each stage must be able to drive every van',
  ].filter((issue) => issue !== false);
}

function deliveryIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'delivery') return [];
  return [
    ...offerIssues(mechanic),
    ...reputationIssues(mechanic),
    ...stageIssues(mechanic, content),
  ].map((issue) => `Business ${business.id} ${issue}`);
}

export function deliveryMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => deliveryIssues(business, content));
}
