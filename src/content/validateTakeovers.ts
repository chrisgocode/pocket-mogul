import type { Business, Content } from './schema';

const RIVALS_PER_BUSINESS = 3;

function rivalIssues(business: Business, maxTrackLevel: number): string[] {
  const count =
    business.rivals.length !== RIVALS_PER_BUSINESS &&
    `Business ${business.id} needs exactly ${RIVALS_PER_BUSINESS} rivals`;
  const quality = business.rivals
    .filter((rival) => rival.quality > maxTrackLevel)
    .map((rival) => `Rival ${rival.id} quality must not pass the max track level`);
  return [count, ...quality].filter((issue) => issue !== false);
}

function ruleIssues(content: Content): string[] {
  const { takeovers, stages } = content.economy.businessRules;
  const { offerPercents } = takeovers;
  return [
    takeovers.fromStage > stages.length && 'Takeovers must unlock at a stage that exists',
    takeovers.acceptFromPercent >= takeovers.acceptAllPercent &&
      'Takeover acceptance must rise from a lower to a higher share of valuation',
    offerPercents.some((percent, index) => index > 0 && percent <= offerPercents[index - 1]!) &&
      'Takeover offer sizes must rise',
  ].filter((issue) => issue !== false);
}

export function takeoversFit(content: Content): string[] {
  const { maxTrackLevel } = content.economy.businessRules;
  return [
    ...ruleIssues(content),
    ...content.businesses.flatMap((business) => rivalIssues(business, maxTrackLevel)),
  ];
}
