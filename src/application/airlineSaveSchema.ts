import { z } from 'zod';

import { FUEL_LEVELS, NETWORKS } from '@/domain/business/airlineRules';

export const savedAirline = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    network: z.enum(NETWORKS),
    fuel: z.enum(FUEL_LEVELS),
    fleet: z.enum(['flying', 'repositioning']),
    hub: z.enum(['none', 'installed']),
  }),
]);
