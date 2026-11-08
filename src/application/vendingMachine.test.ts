import { CURRENT_ECONOMY_VERSION } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import type { GameCommand } from '@/domain/commands';
import { dollars } from '@/domain/money';
import { vendingBusiness } from '@/domain/testVending';

import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const HOUR_MS = 3_600_000;
const LEFT_AT_MS = 1_800_000_000_000;

function startWith(business: ReturnType<typeof vendingBusiness>): Promise<TestGame> {
  const state: GameState = {
    ...freshGameState({
      saveId: 'vending',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: LEFT_AT_MS,
    }),
    businesses: [business],
  };
  return startTestGameFrom(state);
}

const run = (game: Game, command: GameCommand) =>
  game.dispatch({ id: game.createCommandId(), command });

const vendingOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0];

const emptyOffice = { office: { machines: 1, mix: 'balanced', stock: 0 } } as const;

describe('a vending location out of stock while away (AC42)', () => {
  it('serves no one without a Restocker', async () => {
    const left = await startWith(vendingBusiness(emptyOffice, { treasuryCents: dollars('200') }));
    const back = await left.restart({ awayMs: HOUR_MS });
    expect(vendingOf(back)).toMatchObject({
      treasuryCents: dollars('104'),
      vending: { spots: { office: { stock: 0 } } },
    });
  });

  it('is restocked by a Restocker at the next day boundary, offline too', async () => {
    const staffed = vendingBusiness(emptyOffice, {
      treasuryCents: dollars('200'),
      staff: { operations: 1, sales: 0, manager: 0 },
    });
    const back = await (await startWith(staffed)).restart({ awayMs: HOUR_MS });
    expect(vendingOf(back)).toMatchObject({ vending: { spots: { office: { stock: 300 } } } });
    expect(back.game.getSnapshot().state.cashCents).toBeGreaterThan(0n);
  });
});

describe('running vending locations (BUS20a)', () => {
  it('moves a machine, sets its mix and restocks every location in one tap', async () => {
    const session = await startWith(
      vendingBusiness(
        { office: { machines: 2, mix: 'balanced', stock: 100 } },
        { treasuryCents: dollars('20') },
      ),
    );
    const businessId = 'vending';
    await run(session.game, {
      type: 'MoveVendingMachine',
      businessId,
      from: 'office',
      to: 'school',
    });
    await run(session.game, {
      type: 'SetVendingMix',
      businessId,
      location: 'school',
      mix: 'snacks',
    });
    expect(
      await run(session.game, { type: 'RestockVending', businessId, location: 'all' }),
    ).toMatchObject({ ok: true });
    expect(vendingOf(session)).toMatchObject({
      treasuryCents: dollars('15.50'),
      vending: {
        spots: {
          office: { machines: 1, stock: 300 },
          school: { machines: 1, mix: 'snacks', stock: 300 },
        },
      },
    });
  });

  it('remembers a dismissed coach mark across a restart', async () => {
    const session = await startWith(vendingBusiness(emptyOffice));
    await run(session.game, { type: 'DismissCoachMark', coachMark: 'vending' });
    const back = await session.restart({ awayMs: 0 });
    expect(back.game.getSnapshot().state.seenCoachMarks).toEqual(['vending']);
  });
});
