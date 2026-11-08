import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollarPrice, dollars, units } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { taxLiabilityCents } from '@/domain/tax/assessment';

import { engineStep } from './balance/engineStep';
import { quoteTaxCommand } from './taxQuotes';
import { withoutIncidents } from './testGame';

const content = withoutIncidents(getContent());
const DAY_MS = 600_000;

function funded(): GameState {
  const state = freshGameState({
    saveId: 'tax-assets',
    economyVersion: content.economyVersion,
    wallMs: 0,
  });
  return {
    ...state,
    cashCents: dollars('100000'),
    tradingUnlocked: true,
    market: { ...state.market, quotes: { prism: dollarPrice('10') } },
  };
}

function run(state: GameState, command: GameCommand, elapsedMs = 0): GameState {
  const step = engineStep(state, { content, command, elapsedMs });
  expect(step.outcome.ok).toBe(true);
  return step.state!;
}

describe('tax basis and asset disposal', () => {
  it('allocates fees and basis on partial sales and quotes exactly the committed tax', () => {
    const bought = run(funded(), {
      type: 'ExecuteTrade',
      assetId: 'prism',
      side: 'buy',
      quantity: units('10'),
      quotedTick: 0,
    });
    const repriced = {
      ...bought,
      market: { ...bought.market, quotes: { ...bought.market.quotes, prism: dollarPrice('12') } },
    };
    const command = {
      type: 'ExecuteTrade',
      assetId: 'prism',
      side: 'sell',
      quantity: units('4'),
      quotedTick: 0,
      quotedRevision: repriced.revision,
    } as const;
    expect(quoteTaxCommand(repriced, { command, content })).toEqual({
      basisCents: dollars('40.10'),
      gainCents: dollars('7.78'),
      taxChangeCents: dollars('0.35'),
      cashChangeCents: dollars('47.88'),
    });
    const sold = run(repriced, command);
    expect(sold.tax).toMatchObject({ basis: { 'position:prism': dollars('60.15') } });
    expect(taxLiabilityCents(sold.tax)).toBe(dollars('0.35'));
    const final = run(sold, {
      type: 'ExecuteTrade',
      assetId: 'prism',
      side: 'sell',
      quantity: units('6'),
      quotedTick: 0,
    });
    expect(final.tax).toMatchObject({
      basis: { 'position:prism': 0n },
      pools: { capital: { profitCents: dollars('19.45') } },
    });
    expect(taxLiabilityCents(final.tax)).toBe(dollars('0.87'));
  });

  it('treats property upgrades as basis and preserves an actual disposal loss', () => {
    const bought = run(funded(), { type: 'BuyProperty', propertyId: 'studio' });
    const upgraded = run(bought, {
      type: 'UpgradeProperty',
      propertyId: 'studio',
      track: 'renovation',
      fromLevel: 0,
    });
    const sold = run(upgraded, { type: 'SellProperty', propertyId: 'studio' });
    expect(sold.cashCents).toBe(dollars('98520'));
    expect(sold.tax).toMatchObject({
      basis: { 'property:studio': 0n },
      pools: { capital: { profitCents: 0n - dollars('1480') } },
    });
    expect(taxLiabilityCents(sold.tax)).toBe(0n);
  });
});

describe('business ownership tax accounting', () => {
  it('preserves tax through deposits, withdrawals, retained profits and business disposal', () => {
    const bought = run(funded(), { type: 'BuyBusiness', businessId: 'vending' });
    const deposited = run(bought, {
      type: 'DepositToTreasury',
      businessId: 'vending',
      amountCents: dollars('500'),
    });
    const withdrawn = run(deposited, {
      type: 'WithdrawFromTreasury',
      businessId: 'vending',
      amountCents: dollars('500'),
    });
    expect(withdrawn.cashCents).toBe(bought.cashCents);
    expect(withdrawn.tax).toMatchObject({ basis: { 'business:vending': dollars('250') } });
    const retained = run(withdrawn, { type: 'SetPayout', businessId: 'vending', payoutPercent: 0 });
    const earned = run(retained, { type: 'AdvanceTime' }, DAY_MS);
    expect(earned.tax).toMatchObject({ basis: { 'business:vending': dollars('350') } });
    expect(taxLiabilityCents(earned.tax)).toBe(dollars('4.50'));
    const sold = run(earned, { type: 'SellBusiness', businessId: 'vending' });
    expect(sold.tax).toMatchObject({ pools: { capital: { profitCents: 0n - dollars('100') } } });
    expect(taxLiabilityCents(sold.tax)).toBe(dollars('4.50'));
  });

  it('keeps retained owner basis on IPO, taxes only owned profit, and distributes withdrawals proportionally', () => {
    const original = {
      ...funded(),
      cashCents: dollars('98750'),
      businesses: [ownedBusiness('vending', { stage: 4, treasuryCents: dollars('1000') })],
    };
    const listed = run(original, {
      type: 'GoPublic',
      businessId: 'vending',
      floatPercent: 30,
      ticker: 'VMOG',
    });
    expect(listed.tax).toMatchObject({ basis: { 'business:vending': dollars('1150') } });
    const earned = run(listed, { type: 'AdvanceTime' }, DAY_MS);
    expect(taxLiabilityCents(earned.tax)).toBe(dollars('3.15'));
    const withdrawn = run(earned, {
      type: 'WithdrawFromTreasury',
      businessId: 'vending',
      amountCents: dollars('100'),
    });
    expect(withdrawn.cashCents - earned.cashCents).toBe(dollars('70'));
    expect(withdrawn.tax).toMatchObject({ basis: { 'business:vending': dollars('1115') } });
    expect(withdrawn.shareholderPayouts[0]?.paidCents).toBe(dollars('45'));
    const priced = {
      ...withdrawn,
      market: {
        ...withdrawn.market,
        quotes: { ...withdrawn.market.quotes, 'listing:vending': dollarPrice('1') },
      },
    };
    const sold = run(priced, { type: 'SellBusiness', businessId: 'vending' });
    expect(sold.cashCents - priced.cashCents).toBe(dollars('698250'));
    expect(sold.tax).toMatchObject({ basis: { 'business:vending': 0n } });
  });
});
