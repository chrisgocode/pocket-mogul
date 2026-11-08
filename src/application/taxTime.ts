import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import { advanceMarket } from '@/domain/market';
import { trimmedHistory, type MarketHistory } from '@/domain/marketHistory';
import { moneyCents } from '@/domain/money';
import { advanceTime, type AdvancedTime } from '@/domain/passiveIncome';
import { netWorthBreakdown, withProgress } from '@/domain/progression';
import { taxRateBps } from '@/domain/tax/assessment';
import { recoverTaxDebt, taxRestricted } from '@/domain/tax/collection';
import { resolveTaxAudits } from '@/domain/tax/filing';
import { closeTaxDay, closeTaxReturn } from '@/domain/tax/ledger';

import { marketEconomy, passiveEconomy, progressRules } from './economy';
import { listingValuesAt } from './listingMarket';
import { activateTaxes } from './taxActivation';
import {
  recordBusinessAccounting,
  recordDividendAccounting,
  recordRentAccounting,
} from '@/domain/tax/accounting';

type Advance = { elapsedMs: number; wallMs: number; content: Content };
type Timed = AdvancedTime & { readonly history: MarketHistory };

function marketAt(state: GameState, step: { before: GameState; content: Content }) {
  const economy = marketEconomy(step.content, state);
  return advanceMarket(state.market, {
    toTick: Math.floor(state.clock.simulationMs / economy.rules.tickMs),
    economy: { ...economy, listingValuesAt: listingValuesAt(step.before, step.content) },
  });
}

function endTaxDay(state: GameState, content: Content): GameState {
  const { tax } = state;
  const rules = content.economy.taxes;
  if (tax.status !== 'active' || rules === undefined || tax.dayEndsMs !== state.clock.simulationMs)
    return state;
  const closed = closeTaxDay(tax);
  const dayMs = content.economy.businessRules.dayMs;
  const filed =
    closed.returnEndsMs === state.clock.simulationMs
      ? closeTaxReturn(closed, { dayMs, rules })
      : closed;
  const wealth = netWorthBreakdown({ ...state, tax: filed }, progressRules(content)).netWorthCents;
  return {
    ...state,
    tax: {
      ...filed,
      dayEndsMs: tax.dayEndsMs + dayMs,
      openingWealthCents: wealth,
      rateBps: taxRateBps(wealth, rules),
    },
  };
}

function nextBoundary(state: GameState, target: number, content: Content): number {
  const tickMs = content.economy.market.tickMs;
  const dayMs = content.economy.businessRules.dayMs;
  const at = state.clock.simulationMs;
  const audits =
    state.tax.status === 'active'
      ? state.tax.returns.flatMap((r) =>
          r.filing.status === 'pendingAudit' ? [r.filing.dueAtMs] : [],
        )
      : [];
  return Math.min(
    target,
    (Math.floor(at / tickMs) + 1) * tickMs,
    (Math.floor(at / dayMs) + 1) * dayMs,
    ...audits.filter((due) => due > at),
  );
}

function restrictTakeovers(state: GameState): GameState {
  if (!taxRestricted(state.tax)) return state;
  return {
    ...state,
    businesses: state.businesses.map((b) => ({
      ...b,
      takeovers: { ...b.takeovers, offer: { status: 'none' } },
    })),
  };
}

function taxSegment(current: GameState, step: { endMs: number; advance: Advance }): Timed {
  const { content, wallMs } = step.advance;
  const before = restrictTakeovers(activateTaxes(current, content));
  const elapsedMs = step.endMs - before.clock.simulationMs;
  const advanced = advanceTime(before, { elapsedMs, wallMs, economy: passiveEconomy(content) });
  const market = marketAt(advanced.state, { before, content });
  const income = advanced.accounting.filter((entry) => entry.phase === 'income');
  const boundary = advanced.accounting.filter((entry) => entry.phase === 'boundary');
  const dayMs = content.economy.businessRules.dayMs;
  const operating = recordBusinessAccounting(
    { ...advanced.state, market: market.market },
    { entries: income, dayMs },
  );
  const rent = recordRentAccounting(operating, {
    before,
    elapsedMs,
    economy: passiveEconomy(content),
  });
  const dividends = recordDividendAccounting(rent, before);
  const rules = content.economy.taxes;
  const recovered =
    rules === undefined
      ? dividends
      : recoverTaxDebt(dividends, { incomingCents: advanced.earnedCents, rules });
  const audited = rules === undefined ? recovered : resolveTaxAudits(recovered);
  const ended = endTaxDay(audited, content);
  const started = recordBusinessAccounting(activateTaxes(ended, content), {
    entries: boundary,
    dayMs,
  });
  return {
    ...advanced,
    state: withProgress(started, progressRules(content)),
    earnedCents: moneyCents(started.cashCents - current.cashCents),
    history: market.history,
  };
}

export function advanceTaxTime(state: GameState, advance: Advance): Timed {
  const endMs = state.clock.simulationMs + advance.elapsedMs;
  const start = initialTaxAdvance(state, advance);
  let settled = start;
  while (settled.state.clock.simulationMs < endMs) {
    const next = taxSegment(settled.state, {
      endMs: nextBoundary(settled.state, endMs, advance.content),
      advance,
    });
    settled = {
      ...next,
      earnedCents: moneyCents(settled.earnedCents + next.earnedCents),
      earnings: {
        businesses: moneyCents(settled.earnings.businesses + next.earnings.businesses),
        rent: moneyCents(settled.earnings.rent + next.earnings.rent),
        dividends: moneyCents(settled.earnings.dividends + next.earnings.dividends),
      },
      accounting: [...settled.accounting, ...next.accounting],
      closures: [...settled.closures, ...next.closures],
      incidents: [...settled.incidents, ...next.incidents],
      history: trimmedHistory(
        {
          minutes: [...settled.history.minutes, ...next.history.minutes],
          hours: [...settled.history.hours, ...next.history.hours],
        },
        { tick: next.state.market.tick, rules: advance.content.economy.market },
      ),
    };
  }
  return settled;
}

function initialTaxAdvance(state: GameState, advance: Advance): Timed {
  return {
    state: activateTaxes(
      { ...state, clock: { ...state.clock, lastWallCheckpointMs: advance.wallMs } },
      advance.content,
    ),
    earnedCents: moneyCents(0),
    earnings: { businesses: moneyCents(0), rent: moneyCents(0), dividends: moneyCents(0) },
    accounting: [],
    closures: [],
    incidents: [],
    history: trimmedHistory(
      { minutes: [], hours: [] },
      { tick: state.market.tick, rules: advance.content.economy.market },
    ),
  };
}
