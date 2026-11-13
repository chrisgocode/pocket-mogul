import type { GameState } from '@/domain/gameState';
import { listingInstruments } from '@/domain/business/listings';
import { getPastContent, businessDefinition, type Content, type Stock } from '@/content';
import type { BusinessEconomy } from '@/domain/business/definition';
import type { CollectionEconomy } from '@/domain/collection/rules';
import type { DividendRates } from '@/domain/dividends';
import type { MarketEconomy, MarketInstrument } from '@/domain/market';
import type { PassiveEconomy } from '@/domain/passiveIncome';
import type { BriefingRules } from '@/domain/briefing';
import type { GoalRules } from '@/domain/goals';
import type { ProgressRules } from '@/domain/progression';
import type { PropertyEconomy } from '@/domain/properties';
import type { TradeEconomy } from '@/domain/trades';

export function businessEconomy(content: Content): BusinessEconomy {
  const rules = content.economy.businessRules;
  return {
    listedSaleFeeBps: content.economy.market.stocks.feeBps,
    catalog: content.businesses.map((business) => businessDefinition(business, content)),
    rules,
  };
}

export function propertyEconomy(content: Content): PropertyEconomy {
  return { catalog: content.properties, rules: content.economy.propertyRules };
}

export function collectionEconomy(content: Content): CollectionEconomy {
  const { pieces, sets, ...rules } = content.collection;
  return { pieces, sets, rules: { ...rules, dayMs: content.economy.businessRules.dayMs } };
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
    collection: collectionEconomy(content),
    instruments: instruments(content),
  };
}

export function briefingRules(content: Content): BriefingRules {
  return { ...content.briefing, walletMaxLevel: content.economy.tap.maxLevel };
}

export function goalRules(content: Content): GoalRules {
  return {
    goals: content.goals,
    instruments: instruments(content),
    collection: collectionEconomy(content),
  };
}

export type EconomyVersions = {
  readonly content: Content;
  readonly pastContent?: readonly Content[];
};

const bundled = (versions: EconomyVersions) => [
  versions.content,
  ...(versions.pastContent ?? getPastContent()),
];

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

function instruments(content: Content, state?: GameState): MarketInstrument[] {
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
  return [
    ...stocks,
    ...coins,
    ...(state === undefined ? [] : listingInstruments(state, businessEconomy(content))),
  ];
}

export function marketEconomy(content: Content, state?: GameState): MarketEconomy {
  return { instruments: instruments(content, state), rules: content.economy.market };
}

export function tradeEconomy(content: Content, state?: GameState): TradeEconomy {
  const { market } = content.economy;
  return {
    instruments: instruments(content, state),
    feeBps: { stocks: market.stocks.feeBps, crypto: market.crypto.feeBps },
    minTradeNotionalCents: market.minBuyNotional,
  };
}
