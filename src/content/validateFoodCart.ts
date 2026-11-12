import { CART_SPOTS, CROWDS } from '@/domain/business/foodCartRules';

import type { FoodCartMechanic } from './foodCartSchema';
import type { Business, Content } from './schema';

const BASIS_POINTS = 10_000;

function crowdIssues(mechanic: FoodCartMechanic): string[] {
  const chances = CROWDS.reduce((total, crowd) => total + mechanic.crowdChanceBps[crowd], 0);
  const falling = CART_SPOTS.some((spot) => {
    const { quiet, steady, busy } = mechanic.spots[spot];
    return quiet >= steady || steady >= busy;
  });
  return [
    chances !== BASIS_POINTS && 'crowd chances must add up to 100%',
    falling && 'every spot must draw more customers as its crowd grows',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: FoodCartMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const windowStage = mechanic.secondWindow.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (windowStage > stages || windowStage < mechanic.unlockStage) &&
      'second window must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function foodCartIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'food_cart') return [];
  return [...crowdIssues(mechanic), ...stageIssues(mechanic, content)].map(
    (issue) => `Business ${business.id} ${issue}`,
  );
}

export function foodCartMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => foodCartIssues(business, content));
}
