import type { ReputationRules } from './deliveryRules';
import type { DeliveryDayRecord } from './deliveryState';

export type Reputation = {
  readonly stars: number;
  readonly onTimeBps: number | undefined;
};

const BASIS_POINTS = 10_000;

function totals(history: readonly DeliveryDayRecord[]): DeliveryDayRecord {
  return history.reduce(
    (sum, day) => ({ due: sum.due + day.due, delivered: sum.delivered + day.delivered }),
    { due: 0, delivered: 0 },
  );
}

export function reputationOf(
  history: readonly DeliveryDayRecord[],
  rules: ReputationRules,
): Reputation {
  const { due, delivered } = totals(history.slice(-rules.windowDays));
  if (due === 0) return { stars: rules.startingStars, onTimeBps: undefined };
  const onTimeBps = Math.floor((delivered * BASIS_POINTS) / due);
  const stars = rules.stars.filter((star) => onTimeBps >= star.minOnTimeBps).length;
  return { stars, onTimeBps };
}

export function recordedDay(
  history: readonly DeliveryDayRecord[],
  record: { readonly day: DeliveryDayRecord; readonly windowDays: number },
): readonly DeliveryDayRecord[] {
  return [...history, record.day].slice(-record.windowDays);
}
