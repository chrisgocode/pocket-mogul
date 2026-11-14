import type { z } from 'zod';

import { dollars } from '@/domain/money';

import { economyV1 } from './economy-v1';
import type { goalSchema, rankSchema } from './goalSchema';

type GoalInput = z.input<typeof goalSchema>;

const STARTING_REWARDS: Readonly<Record<string, bigint>> = {
  first_wallet_upgrade: dollars('10'),
  first_business: dollars('50'),
  first_rental: dollars('1,000'),
  first_stock: dollars('100'),
  first_crypto: dollars('100'),
  first_dividend: dollars('250'),
};

const PEAK_REWARD_DIVISOR = 20n;

const startingGoals: GoalInput[] = economyV1.goals.map((goal) => ({
  ...goal,
  reward:
    goal.kind === 'peak_net_worth'
      ? goal.threshold / PEAK_REWARD_DIVISOR
      : (STARTING_REWARDS[goal.id] ?? 0n),
}));

const LOCAL_STAGE = 2;
const GLOBAL_STAGE = 5;
const LOCAL_REWARD_DIVISOR = 10n;
const GLOBAL_REWARD_MULTIPLE = 2n;

const MECHANIC_TITLES: readonly (readonly [string, string])[] = [
  ['vending', 'Pick your locations'],
  ['food_cart', 'Find the crowds'],
  ['coffee_kiosk', 'Morning rush'],
  ['laundromat', 'Full service'],
  ['car_wash', 'Wash packages'],
  ['bakery', 'Wholesale orders'],
  ['delivery', 'Signed contracts'],
  ['gym_chain', 'Class schedule'],
  ['hotel_group', 'Front desk'],
  ['manufacturer', 'Factory floor'],
  ['airline', 'Routes and fleet'],
  ['space_launch', 'Launch cadence'],
];

const businessGoals: GoalInput[] = MECHANIC_TITLES.flatMap(([businessId, title]) => {
  const business = economyV1.businesses.find((each) => each.id === businessId);
  if (business === undefined) return [];
  return [
    {
      id: `${businessId}_local`,
      kind: 'business_stage',
      businessId,
      stage: LOCAL_STAGE,
      title,
      reward: business.price / LOCAL_REWARD_DIVISOR,
    },
    {
      id: `${businessId}_global`,
      kind: 'business_stage',
      businessId,
      stage: GLOBAL_STAGE,
      title: `${business.name} goes Global`,
      reward: business.price * GLOBAL_REWARD_MULTIPLE,
    },
  ];
});

const milestone = (
  id: string,
  target: readonly [Extract<GoalInput, { kind: 'milestone' }>['measure'], number],
  text: readonly [string, string],
): GoalInput => ({
  id,
  kind: 'milestone',
  measure: target[0],
  count: target[1],
  title: text[0],
  reward: dollars(text[1]),
});

const milestoneGoals: GoalInput[] = [
  milestone('businesses_3', ['businesses', 3], ['Three businesses', '500']),
  milestone('businesses_6', ['businesses', 6], ['Six businesses', '50,000']),
  milestone('businesses_12', ['businesses', 12], ['Every business', '50,000,000']),
  milestone('wallet_10', ['wallet_level', 10], ['Wallet level 10', '100']),
  milestone('wallet_50', ['wallet_level', 50], ['Wallet level 50', '25,000']),
  milestone('taps_1k', ['taps', 1000], ['A thousand taps', '100']),
  milestone('taps_10k', ['taps', 10_000], ['Ten thousand taps', '5,000']),
  milestone('every_tier', ['tiers', 4], ['Every tier unlocked', '400,000']),
  milestone('trades_10', ['trades', 10], ['Active trader', '250']),
  milestone('trades_100', ['trades', 100], ['Market regular', '10,000']),
  milestone('first_property', ['properties', 1], ['First property', '1,000']),
  milestone('properties_3', ['properties', 3], ['Landlord', '15,000']),
  milestone('properties_8', ['properties', 8], ['Every property', '25,000,000']),
  milestone('rentals_4', ['rentals', 4], ['Four homes let', '50,000']),
  milestone('first_tax_return', ['tax_returns', 1], ['First tax return', '500']),
  milestone('tax_returns_5', ['tax_returns', 5], ['Model taxpayer', '25,000']),
  milestone('first_takeover', ['rivals_merged', 1], ['First takeover', '25,000']),
  milestone('takeovers_3', ['rivals_merged', 3], ['Serial acquirer', '1,000,000']),
  milestone('first_listing', ['listings', 1], ['Going public', '250,000']),
  milestone('rich_list_top_15', ['moguls_passed', 6], ['Rich List top 15', '2,500']),
  milestone('rich_list_top_10', ['moguls_passed', 11], ['Rich List top 10', '100,000']),
  milestone('rich_list_top_5', ['moguls_passed', 16], ['Rich List top 5', '5,000,000']),
  milestone('rich_list_top_3', ['moguls_passed', 18], ['Rich List top 3', '25,000,000']),
  milestone('rich_list_first', ['moguls_passed', 20], ['Richest of all', '100,000,000']),
];

const collectionGoals: GoalInput[] = [
  {
    id: 'collection_first_piece',
    kind: 'collection',
    measure: 'pieces',
    count: 1,
    title: 'First piece',
    reward: dollars('100'),
  },
  {
    id: 'collection_every_category',
    kind: 'collection',
    measure: 'categories',
    count: 6,
    title: 'A piece of everything',
    reward: dollars('25,000'),
  },
  {
    id: 'collection_first_set',
    kind: 'collection',
    measure: 'sets',
    count: 1,
    title: 'First set',
    reward: dollars('2,500'),
  },
  {
    id: 'collection_every_set',
    kind: 'collection',
    measure: 'sets',
    count: 12,
    title: 'Every set',
    reward: dollars('100,000,000'),
  },
];

export const goals: GoalInput[] = [
  ...startingGoals,
  ...collectionGoals,
  ...businessGoals,
  ...milestoneGoals,
];

export const ranks: z.input<typeof rankSchema>[] = [
  { id: 'hustler', title: 'Hustler', threshold: 0n },
  { id: 'operator', title: 'Operator', threshold: dollars('10,000') },
  { id: 'entrepreneur', title: 'Entrepreneur', threshold: dollars('100,000') },
  { id: 'millionaire', title: 'Millionaire', threshold: dollars('1,000,000') },
  { id: 'magnate', title: 'Magnate', threshold: dollars('10,000,000') },
  { id: 'tycoon', title: 'Tycoon', threshold: dollars('100,000,000') },
  { id: 'mogul', title: 'Mogul', threshold: dollars('1,000,000,000') },
];
