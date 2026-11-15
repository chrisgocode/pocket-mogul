import type { Content } from '@/content';
import { holdsEntitlement } from '@/domain/entitlements';
import type { GameState } from '@/domain/gameState';
import { formatMoneyCompact, moneyCents, type MoneyCents } from '@/domain/money';
import { mogulFortunes, type RankingMove, type RichListNews } from '@/domain/richList';

import { richListRules } from './economy';

export type RichListRow = {
  readonly id: string;
  readonly place: number;
  readonly name: string;
  readonly sector: string;
  readonly fortuneCents: MoneyCents;
  readonly who: 'player' | 'mogul';
  readonly nameTone: 'plain' | 'gold';
};

export type RichListView =
  | { readonly status: 'hidden' }
  | {
      readonly status: 'shown';
      readonly rows: readonly RichListRow[];
      readonly place: number;
      readonly size: number;
      readonly ahead: { readonly name: string; readonly gapCents: MoneyCents } | undefined;
    };

type Entry = Omit<RichListRow, 'place'>;

const PLAYER_ID = 'player';

function ranked(entries: readonly Entry[]): readonly RichListRow[] {
  const richer = (entry: Entry, than: Entry) =>
    entry.fortuneCents > than.fortuneCents ||
    (entry.fortuneCents === than.fortuneCents && entry.who === 'player');
  return entries
    .reduce<readonly Entry[]>((sorted, entry) => {
      const at = sorted.findIndex((other) => richer(entry, other));
      const index = at === -1 ? sorted.length : at;
      return [...sorted.slice(0, index), entry, ...sorted.slice(index)];
    }, [])
    .map((entry, index) => Object.assign({ place: index + 1 }, entry));
}

export function selectRichList(state: GameState, content: Content): RichListView {
  if (state.richList.status === 'none' || content.moguls.length === 0) return { status: 'hidden' };
  const moguls = mogulFortunes(state.richList, richListRules(content)).map(
    ({ mogul: { id, name, sector }, fortuneCents }): Entry => ({
      id,
      name,
      sector,
      fortuneCents,
      who: 'mogul',
      nameTone: 'plain',
    }),
  );
  const founder = holdsEntitlement(state, 'founder');
  const player: Entry = {
    id: PLAYER_ID,
    name: 'You',
    sector: founder ? 'Founder · Peak net worth' : 'Peak net worth',
    fortuneCents: state.peakNetWorthCents,
    who: 'player',
    nameTone: founder ? 'gold' : 'plain',
  };
  const rows = ranked([...moguls, player]);
  const place = rows.findIndex((row) => row.who === 'player') + 1;
  const next = rows.find((row) => row.place === place - 1);
  return {
    status: 'shown',
    rows,
    place,
    size: rows.length,
    ahead:
      next === undefined
        ? undefined
        : { name: next.name, gapCents: moneyCents(next.fortuneCents - player.fortuneCents) },
  };
}

export function richListGapText(view: Extract<RichListView, { status: 'shown' }>): string {
  if (view.ahead === undefined) return 'You are the richest of all';
  return `${formatMoneyCompact(view.ahead.gapCents)} behind ${view.ahead.name}`;
}

const mogulName = (content: Content, mogulId: string) =>
  content.moguls.find((mogul) => mogul.id === mogulId)?.name ?? 'a mogul';

export function rankingText(move: RankingMove, content: Content): string {
  const name = mogulName(content, move.mogulId);
  return move.direction === 'passed'
    ? `Passed ${name} on the Rich List · now #${move.place}`
    : `${name} overtook you on the Rich List · now #${move.place}`;
}

export function richListNewsText(news: RichListNews, content: Content): string | undefined {
  return news.status === 'none' ? undefined : rankingText(news, content);
}
