import { INCIDENT_CATEGORIES } from '@/domain/business/definition';

import type { Business, Content } from './schema';

const BASIS_POINTS = 10_000;

function incidentIssues(business: Business): string[] {
  const missing = INCIDENT_CATEGORIES.filter(
    (category) =>
      business.incidents.filter((incident) => incident.category === category).length !== 1,
  ).map((category) => `Business ${business.id} needs exactly one ${category} incident`);
  const chanceBps = business.incidents.reduce((total, incident) => total + incident.chanceBps, 0);
  const tooLikely =
    chanceBps >= BASIS_POINTS && `Business ${business.id} incident chances must stay below 100%`;
  return [...missing, tooLikely].filter((issue) => issue !== false);
}

export function businessRisksFit(content: Content): string[] {
  const { stages, risks } = content.economy.businessRules;
  const insurable = risks.insuranceFromStage <= stages.length;
  return [
    ...content.businesses.flatMap(incidentIssues),
    ...(insurable ? [] : ['Insurance must unlock at a stage that exists']),
  ];
}
