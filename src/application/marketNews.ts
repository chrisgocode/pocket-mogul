import type { Content, EventTemplate } from '@/content';
import type { GameState } from '@/domain/gameState';
import { eventAffects, marketEventAt, type MarketEvent } from '@/domain/marketEvents';
import { drawInt } from '@/domain/marketRandom';
import { windowStart } from '@/domain/marketRegime';
import type { MarketEconomy, MarketKind } from '@/domain/marketRules';

import { marketEconomy } from './economy';

const NEWS_WINDOWS = 8;

export type NewsTiming =
  | { readonly status: 'live'; readonly endsInMs: number }
  | { readonly status: 'ended'; readonly agoMs: number };

export type NewsItem = {
  readonly key: string;
  readonly headline: string;
  readonly durationMs: number;
  readonly timing: NewsTiming;
};

type NewsRequest = {
  readonly market: MarketKind;
  readonly content: Content;
  readonly assetId?: string;
  readonly limit: number;
};

type NewsContext = NewsRequest & { readonly economy: MarketEconomy };

function templateScope(event: MarketEvent): EventTemplate['scope'] {
  if (event.target.scope !== 'asset') return event.target.scope;
  return event.market === 'stocks' ? 'company' : 'coin';
}

function subjectName(event: MarketEvent, content: Content): string {
  const { target } = event;
  if (target.scope === 'sector') return target.sector;
  if (target.scope === 'market') return '';
  const assets: readonly { id: string; name: string }[] = [...content.stocks, ...content.coins];
  return assets.find((asset) => asset.id === target.assetId)?.name ?? target.assetId;
}

function headline(event: MarketEvent, context: { seed: string; content: Content }): string {
  const scope = templateScope(event);
  const templates = context.content.events.filter(
    (template) =>
      template.market === event.market &&
      template.scope === scope &&
      template.direction === event.direction,
  );
  const index = drawInt(
    { seed: context.seed, tick: event.startTick, scope: event.market, stream: 'headline' },
    [0, Math.max(0, templates.length - 1)],
  );
  const subject = subjectName(event, context.content);
  return (templates[index]?.headline ?? '').replace('{name}', subject).replace('{sector}', subject);
}

function timing(event: MarketEvent, at: { tick: number; tickMs: number }): NewsTiming {
  return at.tick < event.endTick
    ? { status: 'live', endsInMs: (event.endTick - at.tick) * at.tickMs }
    : { status: 'ended', agoMs: (at.tick - event.endTick) * at.tickMs };
}

function recentEvents(state: GameState, request: NewsContext): MarketEvent[] {
  const { economy } = request;
  const every = economy.rules.eventEveryTicks;
  const latest = windowStart(state.market.tick, every);
  const starts = Array.from({ length: NEWS_WINDOWS }, (_, back) => latest - back * every);
  return starts
    .filter((tick) => tick >= 0)
    .map((tick) => marketEventAt(state.market.seed, { market: request.market, tick, economy }));
}

function concerns(event: MarketEvent, request: NewsContext): boolean {
  if (request.assetId === undefined) return true;
  const instrument = request.economy.instruments.find(
    (candidate) => candidate.id === request.assetId,
  );
  return instrument !== undefined && eventAffects(event, instrument);
}

export function selectMarketNews(state: GameState, request: NewsRequest): NewsItem[] {
  const { tickMs } = request.content.economy.market;
  const seed = state.market.seed;
  const context = { ...request, economy: marketEconomy(request.content) };
  return recentEvents(state, context)
    .filter((event) => concerns(event, context))
    .slice(0, request.limit)
    .map((event) => ({
      key: `${event.market}-${event.startTick}`,
      headline: headline(event, { seed, content: request.content }),
      durationMs: (event.endTick - event.startTick) * tickMs,
      timing: timing(event, { tick: state.market.tick, tickMs }),
    }));
}
