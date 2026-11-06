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

export function contentAt(versions: EconomyVersions, economyVersion: number): Content {
  const past = versions.pastContent ?? [];
  return past.find((content) => content.economyVersion === economyVersion) ?? versions.content;
}
