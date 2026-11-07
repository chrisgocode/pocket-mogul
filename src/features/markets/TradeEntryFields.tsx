import type { TradeEntryMode } from '@/application/tradeTicket';
import type { TradeSide } from '@/domain/tradeQuotes';
import { SegmentedControl, type SegmentOption } from '@/ui/SegmentedControl';
import { TextField } from '@/ui/TextField';

import { TradePresets } from './TradePresets';
import { tradeUnits, type TradeUnits } from './tradeUnits';
import type { TradeSheetControls } from './useTradeSheet';

const SIDE_OPTIONS: readonly SegmentOption<TradeSide>[] = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
];

const modeOptions = (units: TradeUnits): readonly SegmentOption<TradeEntryMode>[] => [
  { value: 'quantity', label: units.title },
  { value: 'dollars', label: 'Dollars' },
];

const DOLLAR_LABELS: Record<TradeSide, string> = {
  buy: 'Dollars to spend, fee included',
  sell: 'Dollars to receive after the fee',
};

function fieldLabel(entry: { mode: TradeEntryMode; side: TradeSide; units: TradeUnits }): string {
  if (entry.mode === 'dollars') return DOLLAR_LABELS[entry.side];
  return `${entry.units.title} to ${entry.side}`;
}

export function TradeEntryFields({ sheet }: { sheet: TradeSheetControls }) {
  const { draft } = sheet;
  const units = tradeUnits(sheet.kind);
  return (
    <>
      <SegmentedControl options={SIDE_OPTIONS} selected={draft.side} onSelect={sheet.selectSide} />
      <SegmentedControl
        options={modeOptions(units)}
        selected={draft.mode}
        onSelect={sheet.selectMode}
      />
      <TextField
        label={fieldLabel({ mode: draft.mode, side: draft.side, units })}
        value={draft.text}
        onChangeText={sheet.enter}
        placeholder={draft.mode === 'quantity' ? '0' : '$0.00'}
      />
      <TradePresets
        basis={draft.side === 'buy' ? 'your cash' : `your ${units.plural}`}
        onPreset={sheet.preset}
      />
    </>
  );
}
