import { selectTradeTicket, presetQuantity, type TradeEntryMode } from '@/application/tradeTicket';
import { getContent } from '@/content';
import { formatQuantity, type QuantityMicrounits } from '@/domain/money';
import type { TradeSide } from '@/domain/trading';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { gameErrorMessage } from '@/features/game/gameErrorMessage';
import { useConfirmation } from '@/ui/state/useConfirmation';
import { useTradeDraft } from '@/ui/state/useTradeDraft';

const BLANK = { side: 'buy', mode: 'shares', text: '', reviewedTick: 0 } as const;

function useTradeSubmit(assetId: string) {
  const game = useGame();
  const { confirmation, open, close, submit } = useConfirmation<TradeSide>();
  const send = (order: { side: TradeSide; quantity: QuantityMicrounits; quotedTick: number }) =>
    submit(async ({ attemptId }) => {
      const outcome = await game.dispatch({
        id: attemptId,
        command: { type: 'ExecuteTrade', assetId, ...order },
      });
      if (outcome.ok) return undefined;
      if (outcome.error === 'STALE_QUOTE') await game.checkpoint();
      return gameErrorMessage(outcome.error);
    });
  return {
    confirmation,
    close,
    send,
    open: (side: TradeSide) => open(game.createCommandId(), side),
  };
}

function useTradeEntry(assetId: string) {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const { draft, change, reset } = useTradeDraft<TradeSide, TradeEntryMode>(BLANK);
  const ticket = selectTradeTicket(snapshot, { assetId, entry: draft, content });
  const preset = (percent: number) => {
    const quantity = presetQuantity(snapshot, { assetId, side: draft.side, percent, content });
    change({ mode: 'shares', text: formatQuantity(quantity) });
  };
  return {
    draft,
    ticket,
    change,
    restart: (side: TradeSide) =>
      reset({ ...BLANK, side, reviewedTick: snapshot.state.market.tick }),
    selectSide: (side: TradeSide) => change({ side }),
    selectMode: (mode: TradeEntryMode) => change({ mode, text: '' }),
    enter: (text: string) => change({ text }),
    preset,
  };
}

export function useTradeSheet(assetId: string) {
  const { change, restart, ...entry } = useTradeEntry(assetId);
  const { confirmation, close, send, open } = useTradeSubmit(assetId);
  const { draft, ticket } = entry;
  const stale = ticket.tick !== draft.reviewedTick;
  const confirm = () => {
    if (stale || ticket.status !== 'ready') return;
    void send({ side: draft.side, quantity: ticket.quote.quantity, quotedTick: ticket.tick });
  };
  return {
    ...entry,
    stale,
    confirmation,
    close,
    confirm,
    start: (side: TradeSide) => {
      restart(side);
      open(side);
    },
    refresh: () => {
      change({ reviewedTick: ticket.tick });
      open(draft.side);
    },
  };
}

export type TradeSheetControls = ReturnType<typeof useTradeSheet>;
