import type { Content } from '@/content';
import type { BusinessEconomy } from '@/domain/businesses';
import type { PassiveEconomy } from '@/domain/passiveIncome';
import type { ProgressRules } from '@/domain/progression';
import type { PropertyEconomy } from '@/domain/properties';

export function businessEconomy(content: Content): BusinessEconomy {
  return { catalog: content.businesses, rules: content.economy.businessRules };
}

export function propertyEconomy(content: Content): PropertyEconomy {
  return { catalog: content.properties, rules: content.economy.propertyRules };
}

export function passiveEconomy(content: Content): PassiveEconomy {
  return { businesses: businessEconomy(content), properties: propertyEconomy(content) };
}

export function progressRules(content: Content): ProgressRules {
  return { tierUnlocks: content.economy.tierUnlocks, properties: propertyEconomy(content) };
}

export type EconomyVersions = {
  readonly content: Content;
  readonly pastContent?: readonly Content[];
};

const bundled = (versions: EconomyVersions) => [versions.content, ...(versions.pastContent ?? [])];

export function contentAt(versions: EconomyVersions, economyVersion: number): Content {
  return (
    bundled(versions).find((content) => content.economyVersion === economyVersion) ??
    versions.content
  );
}

export function supportsEconomy(versions: EconomyVersions) {
  const supported = new Set(bundled(versions).map((content) => content.economyVersion));
  return (economyVersion: number) => supported.has(economyVersion);
}
