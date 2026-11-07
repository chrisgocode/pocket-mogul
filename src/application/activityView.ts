import type { Content } from '@/content';
import type { ActivityEntry, ActivityEvent, ActivityKind } from '@/domain/activity';
import { formatMoneyExact, formatQuantity, moneyCents, type MoneyCents } from '@/domain/money';

import { durationText, gameClockText } from './clockText';

export type ActivityRow = {
  readonly key: string;
  readonly title: string;
  readonly detail: string;
  readonly cashChangeCents: MoneyCents | undefined;
};

type Described = Omit<ActivityRow, 'key' | 'detail'> & { readonly detail?: string };

type EventOf<Kind extends ActivityKind> = Extract<ActivityEvent, { kind: Kind }>;

type Describers = {
  readonly [Kind in ActivityKind]: (event: EventOf<Kind>, content: Content) => Described;
};

const TRACK_NAMES: Readonly<Record<string, string>> = {
  quality: 'Quality',
  efficiency: 'Efficiency',
  renovation: 'Renovation',
  furnishings: 'Furnishings',
  systems: 'Building Systems',
  expansion: 'Expansion',
};

function assetName(content: Content, assetId: string): string {
  const named = [...content.businesses, ...content.properties, ...content.stocks, ...content.coins];
  return named.find((listed) => listed.id === assetId)?.name ?? assetId;
}

function tickerOf(content: Content, assetId: string): string {
  const listed = [...content.stocks, ...content.coins].find((asset) => asset.id === assetId);
  return listed?.ticker ?? assetId;
}

const amountParts = (parts: readonly { label: string; cents: bigint }[]) =>
  parts
    .filter((part) => part.cents > 0n)
    .map((part) => `${part.label} ${formatMoneyExact(moneyCents(part.cents))}`);

function upgradeTitle(event: EventOf<'upgrade'>, content: Content): string {
  if (event.target === 'wallet') return `Wallet upgraded to level ${event.level}`;
  const name = assetName(content, event.assetId);
  return `${name} ${TRACK_NAMES[event.track] ?? event.track} to level ${event.level}`;
}

function improvementTitle(event: EventOf<'improvement'>, content: Content): string {
  const name = assetName(content, event.assetId);
  if (event.track === 'units') return `${name} grew to ${event.level} units`;
  return `${name} ${TRACK_NAMES[event.track] ?? event.track} to level ${event.level}`;
}

const fromTreasury = (cents: MoneyCents) =>
  `Paid ${formatMoneyExact(moneyCents(0n - cents))} from its treasury`;

const DESCRIBERS: Describers = {
  earnings: (event) => {
    const taps = event.taps === 1 ? '1 tap' : `${event.taps} taps`;
    const parts = amountParts([
      { label: 'Businesses', cents: event.businessCents },
      { label: 'Rent', cents: event.rentCents },
    ]);
    return {
      title: 'Earnings',
      detail: [
        ...(event.taps > 0 ? [`${taps} ${formatMoneyExact(event.tapCents)}`] : []),
        ...parts,
      ].join(' · '),
      cashChangeCents: moneyCents(event.tapCents + event.businessCents + event.rentCents),
    };
  },
  purchase: (event, content) => ({
    title: `Bought ${assetName(content, event.assetId)}`,
    cashChangeCents: event.cashChangeCents,
  }),
  sale: (event, content) => ({
    title: `Sold ${assetName(content, event.assetId)}`,
    cashChangeCents: event.cashChangeCents,
  }),
  upgrade: (event, content) => ({
    title: upgradeTitle(event, content),
    cashChangeCents: event.cashChangeCents,
  }),
  improvement: (event, content) => ({
    title: improvementTitle(event, content),
    detail: fromTreasury(event.treasuryChangeCents),
    cashChangeCents: undefined,
  }),
  treasury: (event, content) => ({
    title: `${event.cashChangeCents < 0n ? 'Deposited into' : 'Withdrew from'} ${assetName(content, event.assetId)}`,
    cashChangeCents: event.cashChangeCents,
  }),
  closure: (event, content) => ({
    title: `${assetName(content, event.assetId)} closed`,
    detail: 'Its treasury ran out. Deposit cash to reopen it.',
    cashChangeCents: undefined,
  }),
  rental: (event, content) => ({
    title: `${event.rented ? 'Rented out' : 'Stopped renting'} ${assetName(content, event.assetId)}`,
    cashChangeCents: undefined,
  }),
  trade: (event, content) => ({
    title: `${event.side === 'buy' ? 'Bought' : 'Sold'} ${formatQuantity(event.quantity)} ${tickerOf(content, event.assetId)}`,
    ...(event.side === 'sell'
      ? { detail: `Realized ${formatMoneyExact(event.realizedProfitCents)}` }
      : {}),
    cashChangeCents: event.cashChangeCents,
  }),
  dividend: (event) => ({ title: 'Dividends paid', cashChangeCents: event.cashChangeCents }),
  offline: (event, content) => ({
    title: 'Offline earnings',
    detail: [
      `${durationText(event.creditedMs)} credited`,
      ...amountParts([
        { label: 'Businesses', cents: event.earnings.businesses },
        { label: 'Rent', cents: event.earnings.rent },
        { label: 'Dividends', cents: event.earnings.dividends },
      ]),
      ...event.closures.map((assetId) => `${assetName(content, assetId)} closed`),
    ].join(' · '),
    cashChangeCents: moneyCents(
      event.earnings.businesses + event.earnings.rent + event.earnings.dividends,
    ),
  }),
};

function describe<Kind extends ActivityKind>(event: EventOf<Kind>, content: Content): Described {
  const describer: (event: EventOf<Kind>, content: Content) => Described = DESCRIBERS[event.kind];
  return describer(event, content);
}

export function activityRow(entry: ActivityEntry, content: Content): ActivityRow {
  const described = describe(entry, content);
  const when = gameClockText(entry.simulationMs);
  return {
    key: String(entry.sequence),
    title: described.title,
    detail: described.detail === undefined ? when : `${when} · ${described.detail}`,
    cashChangeCents: described.cashChangeCents,
  };
}
