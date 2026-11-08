import baseline from './fixtures/save-baseline.json';
import { decodeSave, decodeSaveIn, encodeSave, SAVE_FORMAT } from './saveFormat';
import { taxReturnOwner } from './taxTesting';
import { getContent } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { taxLiabilityCents } from '@/domain/tax/assessment';

import { engineStep } from './balance/engineStep';
import { withoutIncidents, startTestGameFrom, startTestGameFromDocument } from './testGame';

const content = withoutIncidents(getContent());
const DAY_MS = 600_000;

function owner(): GameState {
  return {
    ...freshGameState({ saveId: 'tax-owner', economyVersion: content.economyVersion, wallMs: 0 }),
    cashCents: dollars('99750'),
    businesses: [ownedBusiness('vending')],
  };
}

function advance(state: GameState, elapsedMs: number): GameState {
  const result = engineStep(state, { content, command: { type: 'AdvanceTime' }, elapsedMs });
  expect(result.outcome.ok).toBe(true);
  return result.state!;
}

describe('taxes in the Game command pipeline', () => {
  it.each([0, 50, 100])('keeps tax independent of a %s percent payout', (payoutPercent) => {
    const state = owner();
    const after = advance(
      {
        ...state,
        businesses: [ownedBusiness('vending', { payoutPercent })],
      },
      DAY_MS,
    );
    expect(taxLiabilityCents(after.tax)).toBe(dollars('4.50'));
  });

  it('assesses the entire owned profit, including retained Treasury, without withholding cash', () => {
    const after = advance(owner(), DAY_MS);
    expect(after.cashCents).toBe(dollars('99800'));
    expect(after.businesses[0]?.treasuryCents).toBe(dollars('50'));
    expect(taxLiabilityCents(after.tax)).toBe(dollars('4.50'));
    expect(after.minReaderVersion).toBe(4);
  });

  it('records the same liability and source statements across small advances', () => {
    const chunks = Array.from({ length: 60 }, () => DAY_MS / 60);
    const small = chunks.reduce(advance, owner());
    const long = advance(owner(), DAY_MS);
    expect(small.tax).toEqual(long.tax);
    expect(small.cashCents).toBe(long.cashCents);
  });
});

describe('manual returns and durable collection', () => {
  it('collects honest tax once across repeated command IDs and restart', async () => {
    const session = await startTestGameFrom(taxReturnOwner());
    const envelope = {
      id: 'file-honest',
      command: {
        type: 'FileTaxReturn' as const,
        returnId: 1,
        method: 'honest' as const,
        revision: session.game.getSnapshot().state.revision,
      },
    };
    expect((await session.game.dispatch(envelope)).ok).toBe(true);
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('1000'));
    await session.game.dispatch(envelope);
    const reopened = await session.restart();
    expect(reopened.game.getSnapshot().state.cashCents).toBe(dollars('1000'));
    expect(reopened.game.getSnapshot().state.tax).toMatchObject({
      paidCents: dollars('1000'),
      debts: [],
    });
  });

  it('rolls back filing and payment when saving fails', async () => {
    const session = await startTestGameFrom(taxReturnOwner());
    session.faults.failWrites = true;
    const outcome = await session.game.dispatch({
      id: 'failed-tax',
      command: {
        type: 'FileTaxReturn',
        returnId: 1,
        method: 'honest',
        revision: session.game.getSnapshot().state.revision,
      },
    });
    expect(outcome).toEqual({ ok: false, error: 'SAVE_FAILED' });
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('2000'));
    expect(session.game.getSnapshot().state.tax).toMatchObject({ paidCents: 0n });
    session.faults.failWrites = false;
  });

  it('restricts expansion until the ready return is filed', () => {
    const outcome = engineStep(taxReturnOwner(), {
      content,
      command: { type: 'UpgradeWallet', fromLevel: 0 },
    }).outcome;
    expect(outcome).toEqual({ ok: false, error: 'TAX_ACTION_REQUIRED' });
  });
});

describe('one-shot audits and free recovery', () => {
  it('assesses back tax plus a two-times fine once and preserves tapped recovery cash', () => {
    const original = taxReturnOwner();
    const state = {
      ...original,
      cashCents: dollars('500'),
      market: { ...original.market, seed: 'safe' },
    };
    const filed = engineStep(state, {
      content,
      command: { type: 'FileTaxReturn', returnId: 1, method: 'zero', revision: 0 },
    });
    expect(filed.state?.cashCents).toBe(dollars('500'));
    const audited = advance(filed.state!, DAY_MS);
    expect(audited.cashCents).toBe(0n);
    expect(audited.tax).toMatchObject({
      paidCents: dollars('500'),
      debts: [{ principalCents: dollars('500'), fineCents: dollars('2000') }],
    });
    const tapped = engineStep(audited, {
      content,
      command: { type: 'TapBatch', taps: 100 },
    }).state!;
    expect(tapped.cashCents).toBe(dollars('100'));
    const paid = engineStep(tapped, {
      content,
      command: { type: 'PayTaxDebt', amountCents: dollars('100') },
    }).state!;
    expect(paid.tax).toMatchObject({
      debts: [{ principalCents: dollars('400'), fineCents: dollars('2000') }],
    });
    expect(advance(paid, 2 * DAY_MS).tax).toMatchObject({
      paidCents: dollars('600'),
      debts: [{ principalCents: dollars('400'), fineCents: dollars('2000') }],
    });
  });

  it('clears a successful zero report permanently without rerolling it', () => {
    const state = taxReturnOwner();
    const filed = engineStep(state, {
      content,
      command: { type: 'FileTaxReturn', returnId: 1, method: 'zero', revision: 0 },
    });
    const cleared = advance(filed.state!, DAY_MS);
    expect(cleared.cashCents).toBe(dollars('2000'));
    expect(cleared.tax).toMatchObject({
      evadedCents: dollars('1000'),
      debts: [],
      returns: [{ filing: { status: 'cleared' } }],
    });
    expect(advance(cleared, DAY_MS).cashCents).toBe(dollars('2000'));
  });
});

describe('prospective tax saves and capped time', () => {
  it('loads the baseline with neutral tax state and refuses a tax-active save in an older reader', () => {
    expect(decodeSave(JSON.stringify(baseline))).toMatchObject({
      status: 'current',
      state: { tax: { status: 'notStarted' } },
    });
    const document = encodeSave(advance(owner(), DAY_MS));
    expect(decodeSaveIn({ ...SAVE_FORMAT, readerVersion: 3 }, document)).toEqual({
      status: 'newer',
    });
  });

  it('does not infer pre-tax liabilities from eight hours earned under the previous economy', async () => {
    const before = { ...owner(), economyVersion: 1 };
    const back = await startTestGameFromDocument(encodeSave(before), 36_000_000);
    expect(back.game.getSnapshot().state.clock.simulationMs).toBe(28_800_000);
    expect(back.game.getSnapshot().state.tax).toMatchObject({ status: 'active' });
    expect(taxLiabilityCents(back.game.getSnapshot().state.tax)).toBe(0n);
  });
});
