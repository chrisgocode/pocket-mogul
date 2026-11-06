import type { PriceMicros } from './money';
import { anchorPullBps, applyReturn, clampBps } from './marketPrices';
import { tickDraws, type TickDraw } from './marketRandom';
import { regimeAt, regimeSign, windowStart } from './marketRegime';
import {
  closedCandles,
  extendCandle,
  hourOfTick,
  openCandle,
  trimmedHistory,
  type Candles,
  type HourlyCandle,
  type MarketHistory,
  type MinuteObservation,
} from './marketHistory';
import { eventDriftBps, marketEventAt, type MarketEvent } from './marketEvents';
import type { MarketEconomy, MarketInstrument, MarketKind } from './marketRules';

export type { MarketEconomy, MarketInstrument, MarketRules } from './marketRules';
export type { HourlyCandle, MarketHistory, MinuteObservation, Ohlc } from './marketHistory';

export type MarketState = {
  readonly seed: string;
  readonly tick: number;
  readonly quotes: Readonly<Record<string, PriceMicros>>;
  readonly candles: Candles;
};

export function freshMarket(seed: string): MarketState {
  return { seed, tick: 0, quotes: {}, candles: {} };
}

export function quoteOf(
  market: MarketState,
  instrument: Pick<MarketInstrument, 'id' | 'initialPrice'>,
): PriceMicros {
  return market.quotes[instrument.id] ?? instrument.initialPrice;
}

type TickContext = {
  readonly seed: string;
  readonly tick: number;
  readonly economy: MarketEconomy;
  readonly draw: TickDraw;
};

type TickDrivers = TickContext & {
  readonly regimeSign: number;
  readonly events: Readonly<Record<MarketKind, MarketEvent>>;
  readonly sharedShocks: ReadonlyMap<string, number>;
};

type WindowEvents = Map<number, Readonly<Record<MarketKind, MarketEvent>>>;

function shock(context: TickContext, draw: { scope: string; stream: string; bps: number }): number {
  return context.draw(draw, [-draw.bps, draw.bps]);
}

function sharedShocks(context: TickContext): Map<string, number> {
  const { rules, instruments } = context.economy;
  const shocks = new Map<string, number>();
  for (const instrument of instruments) {
    const classRules = rules[instrument.market];
    const { market, sector } = instrument;
    if (!shocks.has(market)) {
      shocks.set(
        market,
        shock(context, { scope: market, stream: 'common', bps: classRules.commonShockBps }),
      );
    }
    if (sector === undefined || shocks.has(sector)) continue;
    shocks.set(
      sector,
      shock(context, { scope: sector, stream: 'sector', bps: classRules.sectorShockBps }),
    );
  }
  return shocks;
}

function eventsAt(
  context: TickContext,
  cache: WindowEvents,
): Readonly<Record<MarketKind, MarketEvent>> {
  const { seed, tick, economy } = context;
  const window = windowStart(tick, economy.rules.eventEveryTicks);
  const cached = cache.get(window);
  if (cached !== undefined) return cached;
  const events = {
    stocks: marketEventAt(seed, { market: 'stocks', tick, economy }),
    crypto: marketEventAt(seed, { market: 'crypto', tick, economy }),
  };
  cache.set(window, events);
  return events;
}

function tickDrivers(context: TickContext, cache: WindowEvents): TickDrivers {
  const regime = regimeAt(context.seed, { tick: context.tick, rules: context.economy.rules });
  return {
    ...context,
    regimeSign: regimeSign(regime),
    events: eventsAt(context, cache),
    sharedShocks: sharedShocks(context),
  };
}

function shocksBps(instrument: MarketInstrument, drivers: TickDrivers): number {
  const shared = drivers.sharedShocks;
  const common = shared.get(instrument.market) ?? 0;
  const sector = instrument.sector === undefined ? 0 : (shared.get(instrument.sector) ?? 0);
  const asset = shock(drivers, {
    scope: instrument.id,
    stream: 'asset',
    bps: instrument.assetShockBps,
  });
  return common + sector + asset;
}

function tickReturnBps(
  instrument: MarketInstrument,
  drivers: TickDrivers & { readonly previous: PriceMicros },
): number {
  const { rules } = drivers.economy;
  const classRules = rules[instrument.market];
  const event = eventDriftBps(drivers.events[instrument.market], {
    tick: drivers.tick,
    instrument,
    driftBps: classRules.eventDriftBps,
  });
  const anchor = anchorPullBps(drivers.previous, {
    initialPrice: instrument.initialPrice,
    pullBps: rules.anchorPullBps,
    clampBps: rules.anchorClampBps,
  });
  const drift = drivers.regimeSign * classRules.regimeDriftBps + event + anchor;
  return clampBps(shocksBps(instrument, drivers) + drift, rules.totalReturnClampBps);
}

function nextQuotes(
  market: MarketState,
  context: Omit<TickContext, 'draw'> & { readonly events: WindowEvents },
): Record<string, PriceMicros> {
  const draw = tickDraws(context.seed, context.tick);
  const drivers = tickDrivers({ ...context, draw }, context.events);
  return Object.fromEntries(
    context.economy.instruments.map((instrument) => {
      const previous = quoteOf(market, instrument);
      return [
        instrument.id,
        applyReturn(previous, tickReturnBps(instrument, { ...drivers, previous })),
      ];
    }),
  );
}

function candlesAfter(
  market: MarketState,
  tick: { quotes: Record<string, PriceMicros>; economy: MarketEconomy; startsHour: boolean },
): Candles {
  return Object.fromEntries(
    tick.economy.instruments.map((instrument) => {
      const price = tick.quotes[instrument.id] ?? instrument.initialPrice;
      const previousClose = openCandle(quoteOf(market, instrument));
      const candle = tick.startsHour
        ? previousClose
        : (market.candles[instrument.id] ?? previousClose);
      return [instrument.id, extendCandle(candle, price)];
    }),
  );
}

type Recorded = { minutes: MinuteObservation[]; hours: HourlyCandle[]; events: WindowEvents };

function stepTick(
  market: MarketState,
  step: { tick: number; economy: MarketEconomy; recorded: Recorded },
): MarketState {
  const { tick, economy, recorded } = step;
  const quotes = nextQuotes(market, { seed: market.seed, tick, economy, events: recorded.events });
  const previousHour = hourOfTick(market.tick, economy.rules);
  const startsHour = hourOfTick(tick, economy.rules) !== previousHour;
  if (startsHour) recorded.hours.push(...closedCandles(market.candles, previousHour));
  for (const [assetId, price] of Object.entries(quotes))
    recorded.minutes.push({ assetId, tick, price });
  return {
    ...market,
    tick,
    quotes,
    candles: candlesAfter(market, { quotes, economy, startsHour }),
  };
}

export function advanceMarket(
  market: MarketState,
  advance: { toTick: number; economy: MarketEconomy },
): { market: MarketState; history: MarketHistory } {
  const recorded: Recorded = { minutes: [], hours: [], events: new Map() };
  let current = market;
  for (let tick = market.tick + 1; tick <= advance.toTick; tick += 1) {
    current = stepTick(current, { tick, economy: advance.economy, recorded });
  }
  const history = trimmedHistory(recorded, { tick: current.tick, rules: advance.economy.rules });
  return { market: current, history };
}
