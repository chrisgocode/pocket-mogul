import { drawInt } from './marketRandom';
import { PERCENT_DRAW, windowStart } from './marketRegime';
import type { MarketEconomy, MarketInstrument, MarketKind } from './marketRules';

export type EventScope = 'asset' | 'sector' | 'market';

export type EventTarget =
  | { readonly scope: 'asset'; readonly assetId: string }
  | { readonly scope: 'sector'; readonly sector: string }
  | { readonly scope: 'market' };

export type MarketEvent = {
  readonly market: MarketKind;
  readonly startTick: number;
  readonly endTick: number;
  readonly direction: 'up' | 'down';
  readonly target: EventTarget;
};

type EventDraw = { readonly seed: string; readonly market: MarketKind; readonly tick: number };

function drawFrom<T>(draw: EventDraw, pick: { stream: string; options: readonly T[] }): T {
  const index = drawInt(
    { seed: draw.seed, tick: draw.tick, scope: draw.market, stream: pick.stream },
    [0, pick.options.length - 1],
  );
  const option = pick.options[index];
  if (option === undefined) throw new RangeError(`No options to draw for ${pick.stream}`);
  return option;
}

function marketSectors(instruments: readonly MarketInstrument[]): string[] {
  const sectors = instruments.flatMap((instrument) =>
    instrument.sector === undefined ? [] : [instrument.sector],
  );
  return [...new Set(sectors)];
}

function eventScope(draw: EventDraw, economy: MarketEconomy): EventScope {
  const chance = economy.rules.eventChancePercent;
  const roll = drawInt(
    { seed: draw.seed, tick: draw.tick, scope: draw.market, stream: 'event-scope' },
    PERCENT_DRAW,
  );
  if (roll < chance.asset) return 'asset';
  if (roll >= chance.asset + chance.sector) return 'market';
  return draw.market === 'stocks' ? 'sector' : 'asset';
}

function eventTarget(draw: EventDraw, economy: MarketEconomy): EventTarget {
  const listed = economy.instruments.filter(
    (instrument) => instrument.market === draw.market && instrument.listingValueCents === undefined,
  );
  const scope = eventScope(draw, economy);
  if (scope === 'market') return { scope };
  if (scope === 'sector') {
    return {
      scope,
      sector: drawFrom(draw, { stream: 'event-sector', options: marketSectors(listed) }),
    };
  }
  return { scope, assetId: drawFrom(draw, { stream: 'event-asset', options: listed }).id };
}

export function marketEventAt(
  seed: string,
  at: { market: MarketKind; tick: number; economy: MarketEconomy },
): MarketEvent {
  const { rules } = at.economy;
  const startTick = windowStart(at.tick, rules.eventEveryTicks);
  const draw = { seed, market: at.market, tick: startTick };
  return {
    market: at.market,
    startTick,
    endTick: startTick + rules[at.market].eventDurationTicks,
    direction: drawFrom(draw, { stream: 'event-direction', options: ['up', 'down'] as const }),
    target: eventTarget(draw, at.economy),
  };
}

export function eventAffects(event: MarketEvent, instrument: MarketInstrument): boolean {
  const { target } = event;
  if (target.scope === 'market') return true;
  if (target.scope === 'sector') return instrument.sector === target.sector;
  return instrument.id === target.assetId;
}

export function eventDriftBps(
  event: MarketEvent,
  at: { tick: number; instrument: MarketInstrument; driftBps: number },
): number {
  const active = at.tick >= event.startTick && at.tick < event.endTick;
  if (!active || !eventAffects(event, at.instrument)) return 0;
  return event.direction === 'up' ? at.driftBps : -at.driftBps;
}
