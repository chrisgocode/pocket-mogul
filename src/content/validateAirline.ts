import { FUEL_LEVELS, NETWORKS, ROUTES } from '@/domain/business/airlineRules';

import type { AirlineMechanic } from './airlineSchema';
import type { Business, Content } from './schema';

const WHOLE_PERCENT = 100;
const BASIS_POINTS = 10_000;

function networkIssues(mechanic: AirlineMechanic): string[] {
  const uneven = NETWORKS.some(
    (network) =>
      ROUTES.reduce((total, route) => total + mechanic.networks[network][route], 0) !==
      WHOLE_PERCENT,
  );
  const chances = FUEL_LEVELS.reduce((total, fuel) => total + mechanic.fuelChanceBps[fuel], 0);
  const { cheap, normal, expensive } = mechanic.fuelCostBps;
  return [
    uneven && 'every network must place the whole fleet',
    chances !== BASIS_POINTS && 'fuel chances must add up to 100%',
    !(cheap < normal && normal < expensive) && 'fuel must cost more from Cheap to Expensive',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: AirlineMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const hubStage = mechanic.hub.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (hubStage > stages || hubStage < mechanic.unlockStage) &&
      'hub must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function airlineIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'airline') return [];
  return [...networkIssues(mechanic), ...stageIssues(mechanic, content)].map(
    (issue) => `Business ${business.id} ${issue}`,
  );
}

export function airlineMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => airlineIssues(business, content));
}
