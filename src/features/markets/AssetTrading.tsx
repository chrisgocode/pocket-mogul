import { useGame } from '@/features/game/GameContext';

import type { ListedAsset } from './AssetOverview';
import { TradeActions } from './TradeActions';
import { TradeSheet } from './TradeSheet';
import { useTradeSheet } from './useTradeSheet';

export function AssetTrading({ detail }: { detail: ListedAsset }) {
  const game = useGame();
  const sheet = useTradeSheet({ assetId: detail.asset.id, kind: detail.kind });
  const watch = (watched: boolean) =>
    void game.dispatch({
      id: game.createCommandId(),
      command: { type: 'SetWatchlist', assetId: detail.asset.id, watched },
    });
  return (
    <>
      <TradeActions detail={detail} onTrade={sheet.start} onWatch={watch} />
      <TradeSheet name={detail.asset.name} sheet={sheet} />
    </>
  );
}
