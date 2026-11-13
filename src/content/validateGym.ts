import type { GymMechanic } from './gymSchema';
import type { Business, Content } from './schema';

const WHOLE_PERCENT = 100;

function tierIssues(mechanic: GymMechanic): string[] {
  const { basic, plus, elite } = mechanic.tiers;
  const { classes } = mechanic;
  const dearer = basic.feeCents < plus.feeCents && plus.feeCents < elite.feeCents;
  const leakier = basic.churnBps < plus.churnBps && plus.churnBps < elite.churnBps;
  return [
    !(dearer && leakier) && 'higher tiers must charge more and lose members faster',
    classes.churnCutBps * classes.maxLevel >= basic.churnBps &&
      'classes must leave some members leaving on every tier',
    classes.studioPercent * classes.maxLevel >= WHOLE_PERCENT &&
      'classes must leave studio time for visits',
  ].filter((issue) => issue !== false);
}

function stageIssues(mechanic: GymMechanic, content: Content): string[] {
  const stages = content.economy.businessRules.stages.length;
  const hoursStage = mechanic.allHours.stage;
  return [
    mechanic.unlockStage > stages && 'mechanic must unlock at a stage that exists',
    (hoursStage > stages || hoursStage < mechanic.unlockStage) &&
      '24-hour access must unlock at a stage after the mechanic',
  ].filter((issue) => issue !== false);
}

function gymIssues(business: Business, content: Content): string[] {
  const { mechanic } = business;
  if (mechanic?.kind !== 'gym') return [];
  return [...tierIssues(mechanic), ...stageIssues(mechanic, content)].map(
    (issue) => `Business ${business.id} ${issue}`,
  );
}

export function gymMechanicsFit(content: Content): string[] {
  return content.businesses.flatMap((business) => gymIssues(business, content));
}
