const FNV_OFFSET_BASIS = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;
const FMIX_FIRST_SHIFT = 16;
const FMIX_FIRST_MULTIPLIER = 0x85_eb_ca_6b;
const FMIX_SECOND_SHIFT = 13;
const FMIX_SECOND_MULTIPLIER = 0xc2_b2_ae_35;
const FMIX_LAST_SHIFT = 16;

export type DrawKey = {
  readonly seed: string;
  readonly tick: number;
  readonly scope: string;
  readonly stream: string;
};

export type InclusiveRange = readonly [min: number, max: number];

function fnv1a(text: string, start = FNV_OFFSET_BASIS): number {
  let hash = start;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), FNV_PRIME);
  }
  return hash;
}

function fmix32(value: number): number {
  const first = Math.imul(value ^ (value >>> FMIX_FIRST_SHIFT), FMIX_FIRST_MULTIPLIER);
  const second = Math.imul(first ^ (first >>> FMIX_SECOND_SHIFT), FMIX_SECOND_MULTIPLIER);
  return (second ^ (second >>> FMIX_LAST_SHIFT)) >>> 0;
}

export function hashKey(text: string): number {
  return fmix32(fnv1a(text));
}

function inRange(hash: number, [min, max]: InclusiveRange): number {
  return min + (hash % (max - min + 1));
}

export function drawInt(key: DrawKey, range: InclusiveRange): number {
  return inRange(hashKey(`${key.seed}:${key.tick}:${key.scope}:${key.stream}`), range);
}

export type TickDraw = (key: Pick<DrawKey, 'scope' | 'stream'>, range: InclusiveRange) => number;

export function tickDraws(seed: string, tick: number): TickDraw {
  const prefix = fnv1a(`${seed}:${tick}:`);
  return (key, range) => inRange(fmix32(fnv1a(`${key.scope}:${key.stream}`, prefix)), range);
}
