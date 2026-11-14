import type { Content, Goal } from '@/content';
import type { CollectionMeasure } from '@/domain/collection/rules';
import { collectionProgress } from '@/domain/collection/sets';
import type { GameState } from '@/domain/gameState';
import { businessStage, goalMeasure, type GoalMeasure } from '@/domain/goalMeasures';
import { formatMoneyCompact } from '@/domain/money';

import { collectionEconomy } from './economy';

const FIRST_ACTION_HINTS: Readonly<Record<string, string>> = {
  wallet_upgrade: 'Upgrade your wallet on Earn',
  business_purchase: 'Buy any business',
  rental_started: 'Rent out a property you own',
  stock_purchase: 'Buy shares of any stock',
  crypto_purchase: 'Buy any coin',
  dividend_received: 'Hold a dividend stock through a market hour',
};

const COLLECTION_NAMES: Readonly<Record<CollectionMeasure, string>> = {
  pieces: 'Pieces collected',
  sets: 'Sets finished',
  categories: 'Categories collected',
};

const MEASURE_NAMES: Readonly<Record<GoalMeasure, string>> = {
  businesses: 'Businesses owned',
  rivals_merged: 'Rivals taken over',
  listings: 'Businesses taken public',
  properties: 'Properties owned',
  rentals: 'Properties rented out',
  trades: 'Trades made',
  tax_returns: 'Tax returns filed',
  wallet_level: 'Wallet level',
  taps: 'Taps',
  tiers: 'Tiers unlocked',
  moguls_passed: 'Moguls passed',
};

const STAGE_NAMES = ['Startup', 'Local', 'Regional', 'National', 'Global'];

const stageName = (stage: number) => STAGE_NAMES[stage - 1] ?? `stage ${stage}`;

const whole = (count: number) => String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

type Progress = { readonly state: GameState; readonly content: Content };

function stageText(goal: Extract<Goal, { kind: 'business_stage' }>, progress: Progress): string {
  const business = progress.content.businesses.find((each) => each.id === goal.businessId);
  const name = business?.name ?? goal.businessId;
  const stage = businessStage(progress.state, goal.businessId);
  const target = `Grow the ${name} to ${stageName(goal.stage)}`;
  return stage === 0 ? `${target} · not owned yet` : `${target} · now ${stageName(stage)}`;
}

function countText(goal: Extract<Goal, { kind: 'milestone' }>, state: GameState): string {
  const reached = Math.min(goalMeasure(state, goal.measure), goal.count);
  return `${MEASURE_NAMES[goal.measure]} ${whole(reached)} of ${whole(goal.count)}`;
}

export function goalProgressText(goal: Goal, progress: Progress): string {
  const { state, content } = progress;
  if (goal.kind === 'first_action') return FIRST_ACTION_HINTS[goal.action] ?? goal.title;
  if (goal.kind === 'business_stage') return stageText(goal, progress);
  if (goal.kind === 'milestone') return countText(goal, state);
  if (goal.kind === 'collection') {
    const measured = { economy: collectionEconomy(content), measure: goal.measure };
    const reached = collectionProgress(state.collectibles, measured);
    return `${COLLECTION_NAMES[goal.measure]} ${reached} of ${goal.count}`;
  }
  const peak = formatMoneyCompact(state.peakNetWorthCents);
  return `Peak net worth ${peak} of ${formatMoneyCompact(goal.threshold)}`;
}
