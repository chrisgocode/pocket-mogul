import { DRAWN_WEATHERS, STANDARD_PACKAGES } from '@/domain/business/carWashRules';

import type { CarWashMechanic } from './carWashSchema';
import type { Business, Content } from './schema';

const WHOLE_PERCENT = 100;
const BASIS_POINTS = 10_000;

function shareIssues(mechanic: CarWashMechanic): string[] {
  const shares = STANDARD_PACKAGES.reduce(
    (total, washPackage) => total + mechanic.packages[washPackage].sharePercent,
    0,
  );
  const chances = DRAWN_WEATHERS.reduce(
    (total, weather) => total + mechanic.weatherChanceBps[weather],
    0,
  );
  return [
    shares !== WHOLE_PERCENT && 'package shares must add up to 100%',
    mechanic.detailing.sharePercent > mechanic.packages.basic.sharePercent &&
      'detailing must take no more walk-ins than Basic has',
    chances !== BASIS_POINTS && 'weather chances must add up to 100%',
  ].filter((issue) => issue !== false);
}

function capIssues(mechanic: CarWashMechanic): string[] {
  const { capStepPercent, maxCapPercent, defaultCapPercent, managerCapPercent } =
    mechanic.memberships;
  const caps = [defaultCapPercent, managerCapPercent.rainAhead, managerCapPercent.clear];
  const offStep = caps.some((cap) => cap % capStepPercent !== 0 || cap > maxCapPercent);
  return offStep ? ['membership caps must sit on a cap step at or below the maximum'] : [];
}

function stageIssues(mechanic: CarWashMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (mechanic.detailing.stage > stages || mechanic.detailing.stage < mechanic.unlockStage) &&
      'detailing must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function carWashIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'car_wash') return [];
  return [...shareIssues(mechanic), ...capIssues(mechanic), ...stageIssues(mechanic, content)].map(
    (issue) => `Business ${business.id} ${issue}`,
  );
}

export function carWashMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => carWashIssues(business, content));
}
