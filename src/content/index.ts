import { economyV1 } from './economy-v1';
import type { Content } from './schema';
import { validateContent } from './validate';

export * from './schema';
export { checkContent, ContentValidationError, validateContent } from './validate';

/** Every bundled economy version, so older saves can settle at their old rates (spec §14). */
export const bundledContent = { 1: economyV1 } as const;
export const CURRENT_ECONOMY_VERSION = 1;

let cached: Content | undefined;

/** The current content, validated once on first use. Throws ContentValidationError on a bad edit. */
export function getContent(): Content {
  cached ??= validateContent(bundledContent[CURRENT_ECONOMY_VERSION]);
  return cached;
}

/** Shown on the Markets screen and in About (spec §6, §16). */
export const FICTIONAL_NOTICE = 'All companies and coins are fictional.';
