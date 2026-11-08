import { getContent } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, units } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { engineStep } from './balance/engineStep';
import { decodeSave, encodeSave } from './saveFormat';
import { taxReturnOwner } from './taxTesting';
import { quoteTaxCommand } from './taxQuotes';
import { withoutIncidents } from './testGame';

const content = withoutIncidents(getContent());

function listed(): GameState {
  const state = {
    ...freshGameState({
      saveId: 'tax-firm-quote',
      economyVersion: content.economyVersion,
      wallMs: 0,
    }),
    cashCents: dollars('98750'),
    tradingUnlocked: true,
    businesses: [ownedBusiness('vending', { stage: 4, treasuryCents: dollars('1000') })],
  };
  return engineStep(state, {
    content,
    command: { type: 'GoPublic', businessId: 'vending', floatPercent: 30, ticker: 'VMOG' },
  }).state!;
}

describe('financial quote integrity', () => {
  it('revalues a listed stake in the same tick when Treasury is distributed', () => {
    const before = listed();
    const withdrew = engineStep(before, {
      content,
      command: {
        type: 'WithdrawFromTreasury',
        businessId: 'vending',
        amountCents: before.businesses[0]!.treasuryCents,
      },
    }).state!;
    expect(withdrew.market.tick).toBe(before.market.tick);
    expect(
      withdrew.market.quotes['listing:vending']! < before.market.quotes['listing:vending']!,
    ).toBe(true);
    const originalSale = quoteTaxCommand(before, {
      content,
      command: { type: 'SellBusiness', businessId: 'vending' },
    })!;
    const newSale = quoteTaxCommand(withdrew, {
      content,
      command: { type: 'SellBusiness', businessId: 'vending' },
    })!;
    expect(newSale.cashChangeCents < originalSale.cashChangeCents).toBe(true);
  });

  it('executes a firm share sale at the reviewed revision and accrues later profit under the resulting ownership', () => {
    const before = listed();
    const command = {
      type: 'ExecuteTrade',
      side: 'sell',
      assetId: 'listing:vending',
      quantity: units('350000'),
      quotedTick: before.market.tick,
      quotedRevision: before.revision,
    } as const;
    const quote = quoteTaxCommand(before, { content, command })!;
    const committed = engineStep(before, { content, command, elapsedMs: 10_000 });
    expect(committed.outcome.ok).toBe(true);
    expect(committed.state?.tax).toMatchObject({
      pools: { capital: { profitCents: quote.gainCents } },
    });
    expect(quote.basisCents).toBe(dollars('575'));
  });

  it('expires a reviewed sale at the next market boundary rather than accepting an old contract', () => {
    const before = listed();
    expect(
      engineStep(before, {
        content,
        command: { type: 'SellBusiness', businessId: 'vending', quotedRevision: before.revision },
        elapsedMs: 60_000,
      }).outcome,
    ).toEqual({ ok: false, error: 'STALE_QUOTE' });
  });

  it('rejects missing saved asset basis instead of assuming zero', () => {
    const state = listed();
    expect(
      decodeSave(encodeSave({ ...state, tax: { ...taxReturnOwner().tax, basis: {} } })),
    ).toEqual({ status: 'corrupt' });
  });

  it('preserves a pending audit fine after future economy terms change', () => {
    const before = taxReturnOwner('safe');
    const filed = engineStep(
      { ...before, cashCents: dollars('500') },
      { content, command: { type: 'FileTaxReturn', returnId: 1, method: 'zero', revision: 0 } },
    ).state!;
    const rules = { ...content.economy.taxes!, fineMultiplier: 4 };
    const future = { ...content, economyVersion: 3, economy: { ...content.economy, taxes: rules } };
    const adopted = { ...filed, economyVersion: future.economyVersion };
    const audited = engineStep(adopted, {
      content: future,
      command: { type: 'AdvanceTime' },
      elapsedMs: 600_000,
    }).state!;
    expect(audited.tax).toMatchObject({
      debts: [{ principalCents: dollars('500'), fineCents: dollars('2000') }],
    });
  });
});
