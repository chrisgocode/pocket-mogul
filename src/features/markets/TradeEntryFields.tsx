import type { TradeEntryMode } from '@/application/tradeTicket';
import type { TradeSide } from '@/domain/trading';
import { SegmentedControl, type SegmentOption } from '@/ui/SegmentedControl';
import { TextField } from '@/ui/TextField';

import { TradePresets } from './TradePresets';
import type { TradeSheetControls } from './useTradeSheet';

const SIDE_OPTIONS: readonly SegmentOption<TradeSide>[] = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
];

const MODE_OPTIONS: readonly SegmentOption<TradeEntryMode>[] = [
  { value: 'shares', label: 'Shares' },
  { value: 'dollars', label: 'Dollars' },
];

const FIELD_LABELS: Record<TradeEntryMode, Record<TradeSide, string>> = {
  shares: { buy: 'Shares to buy', sell: 'Shares to sell' },
  dollars: { buy: 'Dollars to spend, fee included', sell: 'Dollars to receive after the fee' },
};

export function TradeEntryFields({ sheet }: { sheet: TradeSheetControls }) {
  const { draft } = sheet;
  return (
    <>
      <SegmentedControl options={SIDE_OPTIONS} selected={draft.side} onSelect={sheet.selectSide} />
      <SegmentedControl options={MODE_OPTIONS} selected={draft.mode} onSelect={sheet.selectMode} />
      <TextField
        label={FIELD_LABELS[draft.mode][draft.side]}
        value={draft.text}
        onChangeText={sheet.enter}
        placeholder={draft.mode === 'shares' ? '0' : '$0.00'}
      />
      <TradePresets
        basis={draft.side === 'buy' ? 'your cash' : 'your shares'}
        onPreset={sheet.preset}
      />
    </>
  );
}
