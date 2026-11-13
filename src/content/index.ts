import { economyV2 } from './economy-v2';
import { economyV1 } from './economy-v1';
import type { Content } from './schema';
import { findContentIssues, validateContent } from './validate';

export * from './schema';
export type { Incident } from './riskSchema';
export type { Rival } from './takeoverSchema';
export { businessDefinition } from './businessCore';
export { ContentValidationError, findContentIssues, validateContent } from './validate';

const bundledContentByEconomyVersion = { 1: economyV1, 2: economyV2 } as const;
export const CURRENT_ECONOMY_VERSION = 2;

let cached: Content | undefined;

export function getContent(): Content {
  cached ??= validateContent(bundledContentByEconomyVersion[CURRENT_ECONOMY_VERSION]);
  return cached;
}

let cachedPast: readonly Content[] | undefined;

export function getPastContent(): readonly Content[] {
  cachedPast ??= Object.values(bundledContentByEconomyVersion)
    .filter((content) => content.economyVersion !== CURRENT_ECONOMY_VERSION)
    .map(validateContent);
  return cachedPast;
}

export const FICTIONAL_NOTICE = 'All companies and coins are fictional.';

export const STARTUP_CONTENT_ISSUES: readonly string[] = findContentIssues(
  bundledContentByEconomyVersion[CURRENT_ECONOMY_VERSION],
);
