import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { hashKey } from './marketRandom';
import { moneyCents, type MoneyCents } from './money';

export type Mogul = {
  readonly id: string;
  readonly name: string;
  readonly sector: string;
  readonly startCents: MoneyCents;
  readonly growthBps: number;
  readonly setbackPercent: number;
  readonly setbackBps: number;
};

export type RichListRules = { readonly moguls: readonly Mogul[]; readonly dayMs: number };

export type RankingMove = {
  readonly direction: 'passed' | 'overtaken';
  readonly mogulId: string;
  readonly place: number;
};

export type RichListNews = { readonly status: 'none' } | ({ readonly status: 'new' } & RankingMove);

export type Fortunes = Readonly<Record<string, MoneyCents>>;

export type RichList =
  | { readonly status: 'none' }
  | {
      readonly status: 'active';
      readonly day: number;
      readonly fortunes: Fortunes;
      readonly passed: number;
      readonly mostPassed: number;
      readonly news: RichListNews;
    };

type ActiveRichList = Extract<RichList, { status: 'active' }>;

export const NO_RICH_LIST: RichList = { status: 'none' };

const BPS = 10_000n;
const PERCENT = 100;

type Span = { readonly saveId: string; readonly fromDay: number; readonly toDay: number };

function grown(fortune: MoneyCents, mogul: Mogul, span: Span): MoneyCents {
  let cents: bigint = fortune;
  for (let day = span.fromDay + 1; day <= span.toDay; day += 1) {
    const setback = hashKey(`${span.saveId}:${mogul.id}:${day}`) % PERCENT < mogul.setbackPercent;
    const change = setback ? BPS - BigInt(mogul.setbackBps) : BPS + BigInt(mogul.growthBps);
    cents = (cents * change) / BPS;
  }
  return moneyCents(cents);
}

function fortunesAt(rules: RichListRules, from: { fortunes: Fortunes; span: Span }): Fortunes {
  return Object.fromEntries(
    rules.moguls.map((mogul) => [
      mogul.id,
      grown(from.fortunes[mogul.id] ?? mogul.startCents, mogul, from.span),
    ]),
  );
}

const fortuneOf = (fortunes: Fortunes, mogul: Mogul) => fortunes[mogul.id] ?? mogul.startCents;

function placeOf(passed: number, rules: RichListRules): number {
  return rules.moguls.length - passed + 1;
}

type Standing = { readonly fortunes: Fortunes; readonly worthCents: MoneyCents };

function passedMoguls(standing: Standing, rules: RichListRules): readonly Mogul[] {
  return rules.moguls.filter((mogul) => fortuneOf(standing.fortunes, mogul) <= standing.worthCents);
}

function extreme(moguls: readonly Mogul[], better: (mogul: Mogul, than: Mogul) => boolean) {
  return moguls.reduce<Mogul | undefined>(
    (best, mogul) => (best === undefined || better(mogul, best) ? mogul : best),
    undefined,
  );
}

function moveOf(
  standing: Standing,
  change: { rules: RichListRules; before: number },
): RankingMove | undefined {
  const { rules, before } = change;
  const { fortunes } = standing;
  const behind = passedMoguls(standing, rules);
  if (behind.length === before) return undefined;
  const ahead = rules.moguls.filter((mogul) => !behind.includes(mogul));
  const richer = (mogul: Mogul, than: Mogul) =>
    fortuneOf(fortunes, mogul) > fortuneOf(fortunes, than);
  const direction = behind.length > before ? 'passed' : 'overtaken';
  const mogul =
    direction === 'passed'
      ? extreme(behind, richer)
      : extreme(ahead, (other, than) => richer(than, other));
  if (mogul === undefined) return undefined;
  return { direction, mogulId: mogul.id, place: placeOf(behind.length, rules) };
}

function started(state: GameState, rules: RichListRules, day: number): ActiveRichList {
  const span = { saveId: state.saveId, fromDay: 0, toDay: day };
  const fortunes = fortunesAt(rules, { fortunes: {}, span });
  const passed = passedMoguls({ fortunes, worthCents: state.peakNetWorthCents }, rules).length;
  return { status: 'active', day, fortunes, passed, mostPassed: passed, news: { status: 'none' } };
}

function advanced(
  list: ActiveRichList,
  step: { state: GameState; rules: RichListRules; day: number },
): { list: ActiveRichList; move: RankingMove | undefined } {
  const { state, rules, day } = step;
  const span = { saveId: state.saveId, fromDay: list.day, toDay: day };
  const fortunes =
    day > list.day ? fortunesAt(rules, { fortunes: list.fortunes, span }) : list.fortunes;
  const standing = { fortunes, worthCents: state.peakNetWorthCents };
  const move = moveOf(standing, { rules, before: list.passed });
  if (move === undefined)
    return { list: fortunes === list.fortunes ? list : { ...list, day, fortunes }, move };
  const passed = rules.moguls.length - move.place + 1;
  return {
    list: {
      ...list,
      day,
      fortunes,
      passed,
      mostPassed: Math.max(list.mostPassed, passed),
      news: { status: 'new', ...move },
    },
    move,
  };
}

export function withRichList(
  state: GameState,
  rules: RichListRules,
): { state: GameState; move: RankingMove | undefined } {
  if (rules.moguls.length === 0) return { state, move: undefined };
  const day = Math.floor(state.clock.simulationMs / rules.dayMs);
  if (state.richList.status === 'none')
    return { state: { ...state, richList: started(state, rules, day) }, move: undefined };
  const { list, move } = advanced(state.richList, { state, rules, day });
  return { state: list === state.richList ? state : { ...state, richList: list }, move };
}

export type DismissRichListNews = { readonly type: 'DismissRichListNews' };

export function applyDismissRichListNews(state: GameState): CommandResult {
  const richList =
    state.richList.status === 'none'
      ? state.richList
      : { ...state.richList, news: { status: 'none' } as const };
  return { ok: true, cashChangeCents: moneyCents(0), state: { ...state, richList } };
}

export function mogulFortunes(
  richList: RichList,
  rules: RichListRules,
): readonly { readonly mogul: Mogul; readonly fortuneCents: MoneyCents }[] {
  const fortunes = richList.status === 'active' ? richList.fortunes : {};
  return rules.moguls.map((mogul) => ({ mogul, fortuneCents: fortuneOf(fortunes, mogul) }));
}
