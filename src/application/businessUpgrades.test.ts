import { CURRENT_ECONOMY_VERSION, getContent, type Content } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import type { Game } from './game';
import { startTestGameFrom, withBusinessCosts, type TestGame } from './testGame';

const BUSINESS_DAY_MS = 600_000;

const run = (game: Game, command: GameCommand, id: string = command.type) =>
  game.dispatch({ id, command });

const businessId = 'vending';

async function owningVending(
  change: { cash?: string; treasury?: string; units?: number },
  hooks: { content?: Content } = {},
): Promise<TestGame> {
  return startTestGameFrom(
    {
      ...freshGameState({ saveId: 'saver', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
      cashCents: dollars(change.cash ?? '0'),
      businesses: [
        ownedBusiness(businessId, {
          treasuryCents: dollars(change.treasury ?? '0'),
          units: change.units ?? 1,
        }),
      ],
    },
    hooks,
  );
}

const vendingOf = (game: Game) => game.getSnapshot().state.businesses[0];

describe('growing a business from its treasury (BUS07, BUS10)', () => {
  it('buys a second machine for $100 from the treasury and keeps it after a restart', async () => {
    const session = await owningVending({ cash: '500', treasury: '150' });
    expect(await run(session.game, { type: 'BuyUnit', businessId, fromUnits: 1 })).toEqual({
      ok: true,
      revision: 1,
      cashChangeCents: dollars('0'),
    });
    const { game } = await session.restart();
    expect(vendingOf(game)).toMatchObject({ units: 2, treasuryCents: dollars('50') });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('500'));
  });

  it('spends nothing when the treasury is short, whatever the cash', async () => {
    const { game } = await owningVending({ cash: '5,000', treasury: '62.49' });
    const upgrade: GameCommand = {
      type: 'UpgradeBusiness',
      businessId,
      track: 'quality',
      fromLevel: 0,
    };
    expect(await run(game, upgrade)).toEqual({ ok: false, error: 'INSUFFICIENT_TREASURY' });
    expect(vendingOf(game)).toMatchObject({ treasuryCents: dollars('62.49') });
  });

  it('refuses a fourth machine at the Startup stage with AT_CAP', async () => {
    const { game } = await owningVending({ treasury: '10,000', units: 3 });
    expect(await run(game, { type: 'BuyUnit', businessId, fromUnits: 3 })).toEqual({
      ok: false,
      error: 'AT_CAP',
    });
  });

  it('refuses to grow a business the player does not own', async () => {
    const { game } = await owningVending({ treasury: '10,000' });
    expect(await run(game, { type: 'BuyUnit', businessId: 'food_cart', fromUnits: 1 })).toEqual({
      ok: false,
      error: 'NOT_OWNED',
    });
  });
});

describe('running a business', () => {
  it('earns $107.82 per business day at Premium, half of it to cash (AC07)', async () => {
    const { game, clock } = await owningVending({});
    await run(game, { type: 'SetPriceLevel', businessId, priceLevel: 'premium' });
    clock.advance(BUSINESS_DAY_MS);
    await game.checkpoint();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('53.91'));
    expect(vendingOf(game)?.treasuryCents).toBe(dollars('53.91'));
  });

  it('pays the whole day to cash at a 100 percent payout', async () => {
    const { game, clock } = await owningVending({});
    await run(game, { type: 'SetPayout', businessId, payoutPercent: 100 });
    clock.advance(BUSINESS_DAY_MS);
    await game.checkpoint();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('100'));
  });

  it('moves cash in and out of the treasury (BUS11)', async () => {
    const { game } = await owningVending({ cash: '80' });
    const amountCents = dollars('30');
    await run(game, { type: 'DepositToTreasury', businessId, amountCents });
    expect(await run(game, { type: 'WithdrawFromTreasury', businessId, amountCents })).toEqual({
      ok: true,
      revision: 2,
      cashChangeCents: dollars('30'),
    });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('80'));
  });
});

const losingVending = () =>
  withBusinessCosts(getContent(), { businessId, costsPerDay: dollars('340') });

describe('a business that loses more than its treasury (AC36)', () => {
  it('closes when the treasury reaches zero, leaves cash alone and reopens on a deposit', async () => {
    const { game, clock } = await owningVending(
      { cash: '500', treasury: '10' },
      { content: losingVending() },
    );
    clock.advance(BUSINESS_DAY_MS);
    await game.checkpoint();
    expect(vendingOf(game)).toMatchObject({ status: 'closed', treasuryCents: dollars('0') });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('500'));
    const amountCents = dollars('40');
    await run(game, { type: 'DepositToTreasury', businessId, amountCents });
    expect(vendingOf(game)).toMatchObject({ status: 'open', treasuryCents: dollars('40') });
  });

  it('refuses to grow while closed', async () => {
    const { game, clock } = await owningVending({ treasury: '10' }, { content: losingVending() });
    clock.advance(BUSINESS_DAY_MS);
    expect(await run(game, { type: 'BuyUnit', businessId, fromUnits: 1 })).toEqual({
      ok: false,
      error: 'BUSINESS_CLOSED',
    });
  });
});
