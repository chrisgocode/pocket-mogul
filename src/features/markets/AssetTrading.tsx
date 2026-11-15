import type { ListedAsset } from './AssetOverview';
import { TradeActions } from './TradeActions';
import { TradeSheet } from './TradeSheet';
import type { TradeUnits } from './tradeUnits';
import { useTradeSheet } from './useTradeSheet';

export function AssetTrading({ detail, units }: { detail: ListedAsset; units: TradeUnits }) {
  const sheet = useTradeSheet({ assetId: detail.asset.id, units });
  return (
    <>
      <TradeActions detail={detail} onTrade={sheet.start} />
      <TradeSheet name={detail.asset.name} sheet={sheet} />
    </>
  );
}
