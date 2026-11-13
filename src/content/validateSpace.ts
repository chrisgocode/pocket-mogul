import { LAUNCH_WEATHERS } from '@/domain/business/spaceRules';

import type { Business, Content } from './schema';
import type { SpaceMechanic } from './spaceSchema';

const WHOLE_PERCENT = 100;
const BASIS_POINTS = 10_000;

function cadenceIssues(mechanic: SpaceMechanic): string[] {
  const chances = LAUNCH_WEATHERS.reduce(
    (total, weather) => total + mechanic.weatherChanceBps[weather],
    0,
  );
  const { careful, standard, rapid } = mechanic.cadences;
  const faster =
    careful.capacityBps < standard.capacityBps && standard.capacityBps < rapid.capacityBps;
  const riskier =
    careful.launchedBps.storm > standard.launchedBps.storm &&
    standard.launchedBps.storm > rapid.launchedBps.storm;
  return [
    chances !== BASIS_POINTS && 'weather chances must add up to 100%',
    !(faster && riskier) && 'a faster cadence must launch more and lose more to a storm',
  ].filter((issue) => issue !== false);
}

function payloadIssues(mechanic: SpaceMechanic): string[] {
  const { payloads } = mechanic;
  const largest = Math.max(...payloads.sizePercents) * payloads.maxContracts;
  const ids = new Set(payloads.clients.map((client) => client.id));
  return [
    largest >= WHOLE_PERCENT && 'payload contracts must leave pads for the open market',
    payloads.rateBps.min > payloads.rateBps.max && 'payload rates must be a range',
    payloads.days.min > payloads.days.max && 'payload contract lengths must be a range',
    ids.size !== payloads.clients.length && 'payload clients must have unique IDs',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: SpaceMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const boosterStage = mechanic.boosters.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (boosterStage > stages || boosterStage < mechanic.unlockStage) &&
      'reusable boosters must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function spaceIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'space') return [];
  return [
    ...cadenceIssues(mechanic),
    ...payloadIssues(mechanic),
    ...stageIssues(mechanic, content),
  ].map((issue) => `Business ${business.id} ${issue}`);
}

export function spaceMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => spaceIssues(business, content));
}
