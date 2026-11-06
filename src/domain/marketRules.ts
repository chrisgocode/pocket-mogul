import type { PriceMicros } from './money';

export type MarketKind = 'stocks' | 'crypto';

export type MarketInstrument = {
  readonly id: string;
  readonly market: MarketKind;
  readonly sector: string | undefined;
  readonly initialPrice: PriceMicros;
  readonly assetShockBps: number;
};

export type MarketClassRules = {
  readonly commonShockBps: number;
  readonly sectorShockBps: number;
  readonly regimeDriftBps: number;
  readonly eventDriftBps: number;
  readonly eventDurationTicks: number;
};

export type MarketRules = {
  readonly tickMs: number;
  readonly regimeEveryTicks: number;
  readonly regimeChancePercent: {
    readonly bear: number;
    readonly neutral: number;
    readonly bull: number;
  };
  readonly eventEveryTicks: number;
  readonly eventChancePercent: {
    readonly asset: number;
    readonly sector: number;
    readonly market: number;
  };
  readonly stocks: MarketClassRules;
  readonly crypto: MarketClassRules;
  readonly anchorPullBps: number;
  readonly anchorClampBps: number;
  readonly totalReturnClampBps: number;
  readonly minuteHistoryLength: number;
  readonly hourlyHistoryLength: number;
};

export type MarketEconomy = {
  readonly instruments: readonly MarketInstrument[];
  readonly rules: MarketRules;
};
