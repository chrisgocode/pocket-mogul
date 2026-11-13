import type { SynergyView } from '@/application/synergyView';
import type { SynergyEffect } from '@/domain/business/synergyRules';

const EFFECT_TEXT: Readonly<Record<SynergyEffect, (percent: number) => string>> = {
  demand: (percent) => `+${percent}% customers`,
  capacity: (percent) => `+${percent}% capacity`,
  cost: (percent) => `-${percent}% cost per customer`,
};

export function synergyEffect(synergy: SynergyView): string {
  return EFFECT_TEXT[synergy.effect](synergy.percent);
}

export function synergySubtitle(synergy: SynergyView): string {
  const { status, partnerName, note } = synergy;
  if (status === 'locked') return `Own a ${partnerName} to unlock`;
  if (status === 'starting') return `${note} Starts next day.`;
  if (status === 'ending') return `You no longer own a ${partnerName}. Ends next day.`;
  return note;
}

export function synergiesNote(synergies: readonly SynergyView[]): string {
  const running = synergies.filter((synergy) => synergy.status === 'active').length;
  return `${running} of ${synergies.length} active · owning related businesses helps both`;
}
