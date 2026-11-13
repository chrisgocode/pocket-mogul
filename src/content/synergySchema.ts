import { z } from 'zod';

import { SYNERGY_EFFECTS } from '@/domain/business/synergyRules';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');
const wholePercent = z.number().int().min(0).max(100);

const synergyLinkSchema = z.object({
  id,
  name: z.string().min(1),
  note: z.string().min(1),
  businessId: id,
  partnerId: id,
  effect: z.enum(SYNERGY_EFFECTS),
  percent: z.number().int().positive().max(100),
});

export const synergiesSchema = z.object({
  capPercent: wholePercent,
  links: z.array(synergyLinkSchema),
});

export const NO_SYNERGY_CONTENT = { capPercent: 0, links: [] };

export type SynergyLink = z.output<typeof synergyLinkSchema>;
