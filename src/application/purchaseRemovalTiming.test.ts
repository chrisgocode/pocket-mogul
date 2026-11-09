import { getContent } from '@/content';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { taxLiabilityCents } from '@/domain/tax/assessment';
import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { taxReturnOwner } from './taxTesting';
import { startTestGameFrom, withoutIncidents, type TestGame } from './testGame';

const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;
const removed = {
  ...current,
  observedAtMs: 1_800_036_000_000,
  ownership: [],
  removals: [ownership.reference],
};

async function owner() {
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [current],
    ownership: [{ status: 'unavailable' }, removed],
  });
  const session = await startTestGameFrom(
    {
      ...taxReturnOwner(),
      tax: { ...taxReturnOwner().tax, basis: { 'business:vending': dollars('150') } },
      cashCents: dollars('100000'),
      businesses: [ownedBusiness('vending')],
    },
    { billing, purchasePolicy, content: withoutIncidents(getContent()) },
  );
  await session.game.purchases.restore();
  return session;
}

async function launch(session: TestGame): Promise<TestGame> {
  return session.restart({
    awayMs: 36_000_000,
    billing: scriptedBilling({ ownership: [removed] }),
  });
}

async function foreground(session: TestGame): Promise<TestGame> {
  await session.game.pause();
  session.clock.advance(36_000_000);
  await session.game.resume();
  return session;
}

it.each([
  { name: 'launch', returnToGame: launch },
  { name: 'foreground', returnToGame: foreground },
])(
  'revokes prospectively at $name across day and return boundaries with one exempt settlement',
  async ({ returnToGame }) => {
    const session = await returnToGame(await owner());
    const state = session.game.getSnapshot().state;
    expect(state.tax).toMatchObject({
      status: 'active',
      returns: [{ filing: { status: 'waived' } }],
      debts: [],
      lines: [],
    });
    expect(taxLiabilityCents(state.tax)).toBe(0n);
    expect(state.cashCents).toBe(dollars('102400'));
    expect(state.income.businessEarningsCents).toBe(dollars('2400'));
    expect(state.returnSummary).toMatchObject({
      status: 'pending',
      summary: {
        awayMs: 36_000_000,
        creditedMs: 28_800_000,
        earnings: { businesses: dollars('2400') },
      },
    });
    expect(
      (await session.game.readActivity()).filter((entry) => entry.kind === 'offline'),
    ).toHaveLength(1);
    const back = await session.restart({ billing: scriptedBilling() });
    expect(back.game.getSnapshot().state.returnSummary).toEqual(state.returnSummary);
    expect(back.game.getSnapshot().state.income).toEqual(state.income);
    const taxed = await back.restart({ awayMs: 21_600_000, billing: scriptedBilling() });
    expect(taxLiabilityCents(taxed.game.getSnapshot().state.tax)).toBeGreaterThan(0n);
  },
);
