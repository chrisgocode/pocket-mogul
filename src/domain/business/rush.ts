export type RushDay = {
  readonly demandShareBps: bigint;
  readonly windowBps: bigint;
  readonly boostBps: bigint;
};

const BASIS_POINTS = 10_000n;

export const NO_RUSH: RushDay = { demandShareBps: 0n, windowBps: 0n, boostBps: BASIS_POINTS };

export type RushServing = {
  readonly rushCustomers: bigint;
  readonly rushServed: bigint;
  readonly served: bigint;
};

const least = (left: bigint, right: bigint) => (left < right ? left : right);

export function serveWithRush(
  day: { readonly demand: bigint; readonly capacity: bigint },
  rush: RushDay,
): RushServing {
  const rushCustomers = (day.demand * rush.demandShareBps) / BASIS_POINTS;
  const windowCapacity = (day.capacity * rush.windowBps) / BASIS_POINTS;
  const rushCapacity = (windowCapacity * rush.boostBps) / BASIS_POINTS;
  const rushServed = least(rushCustomers, rushCapacity);
  const calmServed = least(day.demand - rushCustomers, day.capacity - windowCapacity);
  return { rushCustomers, rushServed, served: least(rushServed + calmServed, day.capacity) };
}
