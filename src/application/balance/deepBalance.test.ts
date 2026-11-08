import { getContent } from '@/content';
import { businessEconomy } from '@/application/economy';
import { newBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { simulateBalance, type BalanceScenario } from './simulation';
import { renderBalanceReport, runBalance } from './balanceReport';

const content = getContent();
const { catalog, rules } = businessEconomy(content);
const vending = catalog[0]!;
const atMs = 31 * rules.dayMs;
const base = freshGameState({
  saveId: 'deep-balance-test',
  economyVersion: content.economyVersion,
  wallMs: 0,
});

function scenario(): BalanceScenario {
  return {
    name: 'Deep test',
    seed: 'deep-balance-test',
    policy: 'cheapestNext',
    management: 'manager',
    payoutPercent: 70,
    tapsPerSecond: 0,
    stepMs: 1000,
    sessions: [{ activeMs: 1000, awayMs: 0 }],
    maxActiveMs: 1000,
    stopAtPeakCents: dollars('1,000,000,000'),
    start: {
      ...base,
      clock: { ...base.clock, simulationMs: atMs },
      businesses: [
        {
          ...newBusiness(vending, { rules, atMs: 0 }),
          units: rules.stages[0]!.unitCap,
          treasuryCents: dollars('100,000'),
        },
      ],
    },
  };
}

describe('deep balance policies through the engine', () => {
  it('grows a ready business, hires its manager and records accepted actions', () => {
    const run = simulateBalance(scenario(), content);
    expect(run.businesses[0]).toMatchObject({ stage: 2, payoutPercent: 70, staff: { manager: 1 } });
    expect(run.actions.UpgradeStage).toBe(1);
    expect(run.actions.HireStaff).toBeGreaterThan(0);
    expect(run.businesses[0]!.treasuryCents).toBeLessThan(dollars('100,000'));
  });

  it('records a closure instead of silently losing an insolvent business', () => {
    const setup = scenario();
    const start = setup.start!;
    const owned = start.businesses[0]!;
    const run = simulateBalance(
      {
        ...setup,
        management: 'handsOn',
        start: {
          ...start,
          businesses: [
            {
              ...owned,
              treasuryCents: dollars('0'),
              staff: { operations: 0, sales: 100, manager: 0 },
            },
          ],
        },
      },
      content,
    );
    expect(run.businesses[0]!.status).toBe('closed');
    expect(run.events.filter((event) => event.kind === 'closure')).toHaveLength(1);
  });

  it('retains incident losses across an offline gap', () => {
    const setup = scenario();
    const start = setup.start!;
    const owned = start.businesses[0]!;
    const riskContent = {
      ...content,
      businesses: content.businesses.map((business) => ({
        ...business,
        incidents: [
          {
            id: 'guaranteed-loss',
            name: 'Guaranteed loss',
            category: 'liability' as const,
            chanceBps: 10000,
            effect: { kind: 'treasury' as const, revenueDays: 1 },
          },
        ],
      })),
    };
    const run = simulateBalance(
      {
        ...setup,
        management: 'handsOn',
        sessions: [
          { activeMs: 1000, awayMs: rules.dayMs },
          { activeMs: 1000, awayMs: 0 },
        ],
        maxActiveMs: 2000,
        start: { ...start, businesses: [{ ...owned, units: 1 }] },
      },
      riskContent,
    );
    expect(run.events.filter((event) => event.kind === 'incident')).toHaveLength(1);
    expect(run.events.find((event) => event.kind === 'incident')).toMatchObject({
      treasuryChangeCents: dollars('-140'),
    });
  });

  it('reports stages, treasuries and direct incident losses', () => {
    const report = renderBalanceReport(
      runBalance({ seed: 'deep-balance-test', content, scenarios: [scenario()] }),
    );
    expect(report).toContain('## Deep businesses');
    expect(report).toContain('Direct incident losses');
    expect(report).toContain('## Accepted operating actions');
    expect(report).toContain('UpgradeStage');
  });
});
