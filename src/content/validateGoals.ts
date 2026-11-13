import type { Content } from './schema';

function stageGoalIssues(content: Content): string[] {
  return content.goals.flatMap((goal) => {
    if (goal.kind !== 'business_stage') return [];
    const known = content.businesses.some((business) => business.id === goal.businessId);
    return [
      !known && `Goal ${goal.id} names an unknown business`,
      goal.stage > content.economy.businessRules.stages.length &&
        `Goal ${goal.id} names a stage that does not exist`,
    ].filter((issue) => issue !== false);
  });
}

function rankIssues(content: Content): string[] {
  const thresholds = content.ranks.map((rank) => rank.threshold);
  if (thresholds.length === 0) return [];
  return [
    thresholds[0] !== 0n && 'The first rank must start at a net worth of zero',
    thresholds.some((threshold, index) => index > 0 && threshold <= thresholds[index - 1]!) &&
      'Rank thresholds must ascend',
  ].filter((issue) => issue !== false);
}

export function goalsFit(content: Content): string[] {
  return [...stageGoalIssues(content), ...rankIssues(content)];
}
