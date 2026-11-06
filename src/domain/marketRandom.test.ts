import { drawInt, hashKey, tickDraws } from './marketRandom';

const key = (tick: number, scope: string, stream: string) => ({
  seed: 'seed-1',
  tick,
  scope,
  stream,
});

describe('market randomness', () => {
  it('pins the FNV-1a + fmix32 hash with golden fixtures', () => {
    expect(hashKey('')).toBe(2_872_998_923);
    expect(hashKey('a')).toBe(444_641_715);
    expect(hashKey('seed-1:1:stocks:common')).toBe(2_082_093_866);
    expect(hashKey('seed-1:1:prism:asset')).toBe(1_129_503_458);
  });

  it('pins draws from stable keys of seed, tick, scope and stream', () => {
    const common = [1, 2, 3].map((tick) => drawInt(key(tick, 'stocks', 'common'), [-20, 20]));
    expect(common).toEqual([-11, 20, 19]);
    expect(drawInt(key(1, 'prism', 'asset'), [-20, 20])).toBe(14);
    expect(drawInt(key(0, 'market', 'regime'), [0, 99])).toBe(47);
  });

  it('draws the same values when one tick shares its seed and tick prefix', () => {
    const draw = tickDraws('seed-1', 1);
    expect(draw({ scope: 'stocks', stream: 'common' }, [-20, 20])).toBe(-11);
    expect(draw({ scope: 'prism', stream: 'asset' }, [-20, 20])).toBe(14);
  });

  it('gives the same draw for the same key, whatever was drawn before', () => {
    const first = drawInt(key(7, 'kilobyte', 'asset'), [-40, 40]);
    drawInt(key(8, 'kilobyte', 'asset'), [-40, 40]);
    expect(drawInt(key(7, 'kilobyte', 'asset'), [-40, 40])).toBe(first);
  });
});
