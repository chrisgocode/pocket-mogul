import type { z } from 'zod';

import { dollars } from '@/domain/money';

import type { mogulSchema } from './richListSchema';

type Pace = readonly [growthBps: number, setbackPercent: number, setbackBps: number];
type Named = readonly [id: string, name: string, sector: string];

const mogul = (
  [id, name, sector]: Named,
  fortune: string,
  [growthBps, setbackPercent, setbackBps]: Pace,
): z.input<typeof mogulSchema> => ({
  id: `mogul_${id}`,
  name,
  sector,
  startCents: dollars(fortune),
  growthBps,
  setbackPercent,
  setbackBps,
});

export const moguls: z.input<typeof mogulSchema>[] = [
  mogul(['tusk', 'Elon Tusk', 'Rockets and electric cars'], '5,000,000,000', [40, 3, 500]),
  mogul(['bezillion', 'Jeff Bezillion', 'Online retail'], '2,600,000,000', [30, 2, 400]),
  mogul(['webpage', 'Larry Webpage', 'Web search'], '1,400,000,000', [35, 4, 450]),
  mogul(['grin', 'Sergey Grin', 'Web search'], '750,000,000', [45, 5, 600]),
  mogul(['zuckerbucks', 'Mark Zuckerbucks', 'Social media'], '400,000,000', [30, 3, 400]),
  mogul(['dill', 'Michael Dill', 'Computers'], '200,000,000', [30, 3, 400]),
  mogul(['banquet', 'Warren Banquet', 'Investing'], '100,000,000', [25, 2, 300]),
  mogul(['sellison', 'Larry Sellison', 'Databases'], '48,000,000', [30, 3, 350]),
  mogul(['balmy', 'Steve Balmy', 'Software'], '22,000,000', [35, 4, 500]),
  mogul(['fortega', 'Amancio Fortega', 'Fast fashion'], '10,000,000', [30, 3, 400]),
  mogul(['wallet_rob', 'Rob Wallet', 'Superstores'], '4,500,000', [25, 3, 350]),
  mogul(['wallet_jim', 'Jim Wallet', 'Superstores'], '2,000,000', [20, 2, 300]),
  mogul(['twang', 'Jensen Twang', 'Computer chips'], '900,000', [30, 4, 450]),
  mogul(['wallet_alice', 'Alice Wallet', 'Superstores'], '400,000', [35, 4, 500]),
  mogul(['slender', 'Carlos Slender', 'Telecoms'], '180,000', [25, 3, 350]),
  mogul(['fences', 'Bill Fences', 'Software'], '75,000', [30, 3, 400]),
  mogul(['arnaughty', 'Bernard Arnaughty', 'Luxury goods'], '30,000', [20, 2, 300]),
  mogul(['zap', 'Chainpeng Zap', 'Crypto exchange'], '12,000', [90, 6, 1200]),
  mogul(['bettencurl', 'Francoise Bettencurl', 'Cosmetics'], '5,000', [20, 2, 300]),
  mogul(['peterfee', 'Thomas Peterfee', 'Discount brokerage'], '2,000', [15, 2, 250]),
];
