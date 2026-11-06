import type { Content, Stock } from '@/content';
import type { BusinessEconomy } from '@/domain/businesses';
import type { MarketEconomy, MarketInstrument } from '@/domain/market';
import type { PassiveEconomy } from '@/domain/passiveIncome';
import type { ProgressRules } from '@/domain/progression';
import type { PropertyEconomy } from '@/domain/properties';

export function businessEconomy(content: Content): BusinessEconomy {
  return { catalog: content.businesses, rules: content.economy.businessRules };
}

export function propertyEconomy(content: Content): PropertyEconomy {
  return { catalog: content.properties, rules: content.economy.propertyRules };
}

export function passiveEconomy(content: Content): PassiveEconomy {
  return { businesses: businessEconomy(content), properties: propertyEconomy(content) };
}

export function progressRules(content: Content): ProgressRules {
  return { tierUnlocks: content.economy.tierUnlocks, properties: propertyEconomy(content) };
}

function stockShockBps(stock: Stock, content: Content): number {
  const { market } = content.economy;
  return stock.volatilityClass === 'penny'
    ? market.pennyAssetShockBps
    : market.stocks.assetShockBps;
}

function instruments(content: Content): MarketInstrument[] {
  const stocks = content.stocks.map((stock) => ({
    id: stock.id,
    market: 'stocks' as const,
    sector: stock.sector,
    initialPrice: stock.initialPrice,
    assetShockBps: stockShockBps(stock, content),
  }));
  const coins = content.coins.map((coin) => ({
    id: coin.id,
    market: 'crypto' as const,
    sector: undefined,
    initialPrice: coin.initialPrice,
    assetShockBps: content.economy.market.crypto.assetShockBps,
  }));
  return [...stocks, ...coins];
}

export function marketEconomy(content: Content): MarketEconomy {
  return { instruments: instruments(content), rules: content.economy.market };
}
