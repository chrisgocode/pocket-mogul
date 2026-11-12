import { economyV2 } from './economy-v2';
import { economyV3 } from './economy-v3';
import { economyV4 } from './economy-v4';
import { economyV5 } from './economy-v5';
import { economyV1 } from './economy-v1';
import type { Content } from './schema';
import { findContentIssues, validateContent } from './validate';

export * from './schema';
export type { Incident } from './riskSchema';
export type { Rival } from './takeoverSchema';
export { businessDefinition } from './businessCore';
export { ContentValidationError, findContentIssues, validateContent } from './validate';

const bundledContentByEconomyVersion = {
  1: economyV1,
  2: economyV2,
  3: economyV3,
  4: economyV4,
  5: economyV5,
} as const;
export const CURRENT_ECONOMY_VERSION = 5;

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
