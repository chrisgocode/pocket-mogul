import type { Content } from './schema';
import type { SynergyLink } from './synergySchema';

const WHOLE = 100;

function linkIssues(link: SynergyLink, businessIds: ReadonlySet<string>): string[] {
  return [
    !businessIds.has(link.businessId) && `Synergy ${link.id} helps an unknown business`,
    !businessIds.has(link.partnerId) && `Synergy ${link.id} needs an unknown partner`,
    link.businessId === link.partnerId && `Synergy ${link.id} must pair two businesses`,
  ].filter((issue) => issue !== false);
}

function repeatedPairs(links: readonly SynergyLink[]): string[] {
  const pairs = links.map((link) => `${link.businessId} with ${link.partnerId}`);
  return [...new Set(pairs.filter((pair, index) => pairs.indexOf(pair) !== index))].map(
    (pair) => `Only one synergy may link ${pair}`,
  );
}

function businessIssues(businessId: string, content: Content): string[] {
  const links = content.synergies.links.filter((link) => link.businessId === businessId);
  const total = links.reduce((sum, link) => sum + link.percent, 0);
  const saved = links
    .filter((link) => link.effect === 'cost')
    .reduce((sum, link) => sum + link.percent, 0);
  return [
    links.length === 0 && `Business ${businessId} needs at least one synergy`,
    total > content.synergies.capPercent && `Business ${businessId} synergies pass the cap`,
    saved >= WHOLE && `Business ${businessId} synergies must leave a cost`,
  ].filter((issue) => issue !== false);
}

export function synergiesFit(content: Content): string[] {
  const { links } = content.synergies;
  if (links.length === 0) return [];
  const businessIds = new Set(content.businesses.map((business) => business.id));
  return [
    ...links.flatMap((link) => linkIssues(link, businessIds)),
    ...repeatedPairs(links),
    ...content.businesses.flatMap((business) => businessIssues(business.id, content)),
  ];
}
