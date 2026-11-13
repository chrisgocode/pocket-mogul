export const SYNERGY_EFFECTS = ['demand', 'capacity', 'cost'] as const;
export type SynergyEffect = (typeof SYNERGY_EFFECTS)[number];

export type Synergy = {
  readonly id: string;
  readonly partnerId: string;
  readonly effect: SynergyEffect;
  readonly percent: number;
};

export const NO_SYNERGIES: readonly string[] = [];
