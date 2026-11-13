import { getContent } from '@/content';
import { dollars } from '@/domain/money';

import { analyzeRun } from './analysis';
import { renderBalanceReport, runBalance } from './balanceReport';
import { checkProfitLoops } from './profitLoops';
import { simulateBalance, type BalanceScenario } from './simulation';

const content = getContent();
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const SIX_SIMULATION_TIMEOUT_MS = 15_000;

function scenario(overrides: Partial<BalanceScenario>): BalanceScenario {
  return {
    name: 'Test play',
    seed: 'balance-test',
    policy: 'bestPayback',
    tapsPerSecond: 2,
    stepMs: 1000,
    sessions: [{ activeMs: 20 * MINUTE_MS, awayMs: 0 }],
    maxActiveMs: 20 * MINUTE_MS,
    stopAtPeakCents: dollars('1,000,000,000'),
    ...overrides,
  };
}

describe('balance simulation', () => {
  it('reaches the first wallet upgrade after $100 of taps at two taps a second', () => {
    const run = simulateBalance(scenario({ policy: 'cheapestNext' }), content);
    expect(run.goals['first_wallet_upgrade']).toEqual({ activeMs: 50_000, elapsedMs: 50_000 });
  });

  it('buys the first business after $250 of taps when saving for it', () => {
    const run = simulateBalance(scenario({ policy: 'saveForNextBusiness' }), content);
    expect(run.goals['first_business']).toEqual({ activeMs: 125_000, elapsedMs: 125_000 });
    expect(run.purchases[0]).toMatchObject({ kind: 'business purchase', assetId: 'vending' });
    expect(run.purchases[0]?.paybackMinutes).toBe(25);
  });

  it('credits at most eight hours for a longer offline gap', () => {
    const run = simulateBalance(
      scenario({
        policy: 'saveForNextBusiness',
        sessions: [
          { activeMs: 125_000, awayMs: 10 * HOUR_MS },
          { activeMs: 1000, awayMs: 0 },
        ],
        maxActiveMs: 126_000,
      }),
      content,
    );
    expect(run.final.elapsedMs).toBe(126_000 + 10 * HOUR_MS);
    expect<bigint>(run.final.worth.netWorthCents).toBe(dollars('5,365.65'));
  });

  it('stops once peak net worth reaches the target', () => {
    const run = simulateBalance(
      scenario({ maxActiveMs: 2 * HOUR_MS, stopAtPeakCents: dollars('1,000') }),
      content,
    );
    expect(run.final.worth.netWorthCents >= dollars('1,000')).toBe(true);
    expect(run.goals['peak_1k']?.activeMs).toBe(run.final.activeMs);
  });

  it('rejects a schedule with no active play', () => {
    expect(() =>
      simulateBalance(scenario({ sessions: [{ activeMs: 0, awayMs: HOUR_MS }] }), content),
    ).toThrow('Scenario Test play has no active play');
  });
});

describe('balance analysis', () => {
  it('flags a choice that takes more than half of all spending', () => {
    const run = simulateBalance(
      scenario({ policy: 'saveForNextBusiness', maxActiveMs: 125_000 }),
      content,
    );
    expect(analyzeRun(run).dominant).toMatchObject({ kind: 'business purchase', percent: 100 });
  });

  it('flags a stall when nothing is bought for more than 30 minutes', () => {
    const run = simulateBalance(scenario({ tapsPerSecond: 0, maxActiveMs: HOUR_MS }), content);
    expect(analyzeRun(run)).toMatchObject({
      stalled: true,
      longestStall: { fromActiveMs: 0, toActiveMs: HOUR_MS },
    });
  });

  it('finds no buy/sell profit loop for any business or property', () => {
    const loops = checkProfitLoops(content);
    expect(loops).toHaveLength(content.businesses.length + content.properties.length);
    expect(loops.filter((loop) => loop.bestNetCents >= 0n)).toEqual([]);
    expect(loops.find((loop) => loop.assetId === 'vending')?.bestNetCents).toBe(dollars('-100'));
    expect(loops.find((loop) => loop.assetId === 'studio')?.bestNetCents).toBe(dollars('-1,000'));
  });
});

describe('balance report', () => {
  const policies = (['cheapestNext', 'bestPayback', 'saveForNextBusiness'] as const).map((policy) =>
    scenario({ policy }),
  );

  it(
    'writes the same report for the same seed',
    () => {
      const first = renderBalanceReport(runBalance({ seed: 'same', content, scenarios: policies }));
      const second = renderBalanceReport(
        runBalance({ seed: 'same', content, scenarios: policies }),
      );
      expect(second).toBe(first);
    },
    SIX_SIMULATION_TIMEOUT_MS,
  );

  it('compares the three policies on each milestone', () => {
    const report = renderBalanceReport(
      runBalance({ seed: 'compare', content, scenarios: policies }),
    );
    expect(report).toContain('| Milestone | cheapestNext | bestPayback | saveForNextBusiness |');
    expect(report).toContain('| First wallet upgrade | 50 s | 50 s | not reached |');
    expect(report).toContain('| $1M peak net worth | not reached | not reached | not reached |');
    expect(report).toContain('No buy/sell profit loop');
  });
});
