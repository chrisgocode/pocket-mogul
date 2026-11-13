import { SEASONS } from '@/domain/business/hotelRules';

import type { HotelMechanic } from './hotelSchema';
import type { Business, Content } from './schema';

const BASIS_POINTS = 10_000;

function seasonIssues(mechanic: HotelMechanic): string[] {
  const chances = SEASONS.reduce((total, season) => total + mechanic.seasonChanceBps[season], 0);
  const { low, shoulder, high, event } = mechanic.seasonDemandBps;
  return [
    chances !== BASIS_POINTS && 'season chances must add up to 100%',
    !(low < shoulder && shoulder < high && high < event) &&
      'seasons must draw more guests from Low to Event',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: HotelMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const conferenceStage = mechanic.conference.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (conferenceStage > stages || conferenceStage < mechanic.unlockStage) &&
      'conference centre must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function hotelIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'hotel') return [];
  return [...seasonIssues(mechanic), ...stageIssues(mechanic, content)].map(
    (issue) => `Business ${business.id} ${issue}`,
  );
}

export function hotelMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => hotelIssues(business, content));
}
