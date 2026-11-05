import { economyV1 } from './economy-v1';
import type { Content } from './schema';
import { findContentIssues, validateContent } from './validate';

export * from './schema';
export { ContentValidationError, findContentIssues, validateContent } from './validate';

const bundledContentByEconomyVersion = { 1: economyV1 } as const;
export const CURRENT_ECONOMY_VERSION = 1;

let cached: Content | undefined;

export function getContent(): Content {
  cached ??= validateContent(bundledContentByEconomyVersion[CURRENT_ECONOMY_VERSION]);
  return cached;
}

export const FICTIONAL_NOTICE = 'All companies and coins are fictional.';

export const STARTUP_CONTENT_ISSUES: readonly string[] = findContentIssues(
  bundledContentByEconomyVersion[CURRENT_ECONOMY_VERSION],
);
