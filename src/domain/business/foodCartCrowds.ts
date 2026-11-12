import { drawInt, type InclusiveRange } from '@/domain/marketRandom';

import { CROWDS, type CartSpot, type Crowd, type FoodCartRules } from './foodCartRules';
import type { Crowds } from './foodCartState';

export type CrowdDraw = {
  readonly seed: string;
  readonly businessId: string;
  readonly rules: FoodCartRules;
};

const BASIS_POINTS = 10_000;
const CROWD_STREAM = 'crowd';
const ROLL: InclusiveRange = [0, BASIS_POINTS - 1];
const FALLBACK_CROWD: Crowd = 'steady';

function crowdAt(draw: CrowdDraw, visit: { readonly spot: CartSpot; readonly day: number }): Crowd {
  const scope = `${draw.businessId}:${visit.spot}`;
  const roll = drawInt({ seed: draw.seed, tick: visit.day, scope, stream: CROWD_STREAM }, ROLL);
  const chances = draw.rules.crowdChanceBps;
  const reached = CROWDS.map((_, index) =>
    CROWDS.slice(0, index + 1).reduce((total, each) => total + chances[each], 0),
  );
  return CROWDS[reached.findIndex((threshold) => roll < threshold)] ?? FALLBACK_CROWD;
}

export function crowdsOn(draw: CrowdDraw, day: number): Crowds {
  return {
    park: crowdAt(draw, { spot: 'park', day }),
    offices: crowdAt(draw, { spot: 'offices', day }),
    campus: crowdAt(draw, { spot: 'campus', day }),
    market: crowdAt(draw, { spot: 'market', day }),
    stadium: crowdAt(draw, { spot: 'stadium', day }),
  };
}

export function crowdForecast(draw: CrowdDraw, day: number): readonly Crowds[] {
  return Array.from({ length: draw.rules.forecastDays }, (_, index) =>
    crowdsOn(draw, day + index + 1),
  );
}
