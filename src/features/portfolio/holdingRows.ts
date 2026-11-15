import type { Holdings } from '@/application/holdingsView';
import { formatMoneyExact, formatQuantity, type MoneyCents } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import type { MoneyFormat } from '@/features/game/useMoneyFormat';

type Money = (value: MoneyCents) => string;

type Figures = { readonly value: string; readonly detail: string };

type HoldingBase = {
  readonly id: string;
  readonly kind: 'business' | 'property' | 'asset';
  readonly title: string;
  readonly subtitle: string;
};

type HeldFigures = { readonly valueCents: MoneyCents; readonly saleCents: MoneyCents };

function saleFigures(held: HeldFigures, money: Money): Figures {
  return { value: money(held.valueCents), detail: `Sells for ${money(held.saleCents)}` };
}

function holdingRow(base: HoldingBase, figures: { shown: Figures; exact: Figures }) {
  const { shown, exact } = figures;
  return {
    id: base.id,
    kind: base.kind,
    title: base.title,
    subtitle: base.subtitle,
    value: shown.value,
    detail: shown.detail,
    accessibilityLabel: [base.title, base.subtitle, exact.value, exact.detail].join(', '),
  };
}

function soldRow(base: HoldingBase, held: HeldFigures, format: MoneyFormat) {
  return holdingRow(base, {
    shown: saleFigures(held, format.short),
    exact: saleFigures(held, formatMoneyExact),
  });
}

function positionRow(held: Holdings['positions'][number], format: MoneyFormat) {
  return holdingRow(
    {
      id: held.id,
      kind: 'asset',
      title: held.name,
      subtitle: `${formatQuantity(held.quantity)} ${held.ticker}`,
    },
    {
      shown: {
        value: format.short(held.valueCents),
        detail: `Unrealized ${format.shortGain(held.unrealizedCents)}`,
      },
      exact: {
        value: formatMoneyExact(held.valueCents),
        detail: `Unrealized ${formatCashChange(held.unrealizedCents)}`,
      },
    },
  );
}

export function holdingRows(holdings: Holdings, format: MoneyFormat) {
  return [
    ...holdings.businesses.map((held) =>
      soldRow(
        { id: held.id, kind: 'business', title: held.name, subtitle: 'Business' },
        held,
        format,
      ),
    ),
    ...holdings.properties.map((held) =>
      soldRow(
        {
          id: held.id,
          kind: 'property',
          title: held.name,
          subtitle: held.rented ? 'Property · rented' : 'Property · vacant',
        },
        held,
        format,
      ),
    ),
    ...holdings.positions.map((held) => positionRow(held, format)),
  ];
}
