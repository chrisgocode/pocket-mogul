import type { Content, Stock } from '@/content';
import type { BusinessEconomy } from '@/domain/businesses';
import type { DividendRates } from '@/domain/dividends';
import type { MarketEconomy, MarketInstrument } from '@/domain/market';
import type { PassiveEconomy } from '@/domain/passiveIncome';
import type { ProgressRules } from '@/domain/progression';
import type { PropertyEconomy } from '@/domain/properties';
import type { TradeEconomy } from '@/domain/trades';

export function businessEconomy(content: Content): BusinessEconomy {
  return { catalog: content.businesses, rules: content.economy.businessRules };
}

export function propertyEconomy(content: Content): PropertyEconomy {
  return { catalog: content.properties, rules: content.economy.propertyRules };
}

function dividendRates(content: Content): DividendRates {
  return Object.fromEntries(
    content.stocks.map((stock) => [stock.id, stock.dividendCentsPerSharePerHour]),
  );
}

export function passiveEconomy(content: Content): PassiveEconomy {
  return {
    businesses: businessEconomy(content),
    properties: propertyEconomy(content),
    dividendRates: dividendRates(content),
  };
}

export function progressRules(content: Content): ProgressRules {
  return {
    tierUnlocks: content.economy.tierUnlocks,
    properties: propertyEconomy(content),
    instruments: instruments(content),
  };
}

export type EconomyVersions = {
  readonly content: Content;
  readonly pastContent?: readonly Content[];
};

const bundled = (versions: EconomyVersions) => [versions.content, ...(versions.pastContent ?? [])];

export function contentAt(versions: EconomyVersions, economyVersion: number): Content {
  return (
    bundled(versions).find((content) => content.economyVersion === economyVersion) ??
    versions.content
  );
}

export function supportsEconomy(versions: EconomyVersions) {
  const supported = new Set(bundled(versions).map((content) => content.economyVersion));
  return (economyVersion: number) => supported.has(economyVersion);
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

export function tradeEconomy(content: Content): TradeEconomy {
  const { market } = content.economy;
  return {
    instruments: instruments(content),
    feeBps: { stocks: market.stocks.feeBps, crypto: market.crypto.feeBps },
    minTradeNotionalCents: market.minBuyNotional,
  };
}
