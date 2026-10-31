import {
  compareGains,
  computeBoundaries,
  computeBoundariesByMetric,
  computeDpsGain,
  computeGain,
  computePercentGain,
  type UpgradeDataMinimal,
  valueToColor,
} from '.';

const upgrade = (dps: number, baseDps: number): UpgradeDataMinimal => ({ dps, baseDps });

describe('computePercentGain', () => {
  it('returns the gain as a percentage of the base', () => {
    expect(computePercentGain(1200, 1000)).toBe(20);
  });

  it('returns 0 when the upgrade changes nothing', () => {
    expect(computePercentGain(1000, 1000)).toBe(0);
  });

  it('returns a negative percentage for a downgrade', () => {
    expect(computePercentGain(900, 1000)).toBe(-10);
  });

  it('does not divide by zero when the base is missing', () => {
    expect(computePercentGain(1, 0)).toBe(0);
    expect(Number.isFinite(computePercentGain(500, 0))).toBe(true);
  });
});

describe('computeDpsGain', () => {
  it('returns the raw dps difference', () => {
    expect(computeDpsGain(1200, 1000)).toBe(200);
    expect(computeDpsGain(900, 1000)).toBe(-100);
  });
});

describe('computeGain', () => {
  it('switches unit based on isPercent', () => {
    expect(computeGain(upgrade(1200, 1000), false)).toBe(200);
    expect(computeGain(upgrade(1200, 1000), true)).toBe(20);
  });
});

describe('computeBoundaries', () => {
  const upgrades = [upgrade(1200, 1000), upgrade(900, 1000), upgrade(1100, 1000)];

  it('returns the highest and lowest raw gain', () => {
    expect(computeBoundaries(upgrades, false)).toEqual([200, -100]);
  });

  it('returns the highest and lowest percent gain', () => {
    expect(computeBoundaries(upgrades, true)).toEqual([20, -10]);
  });

  it('collapses to a single value for a one-entry list', () => {
    expect(computeBoundaries([upgrade(1200, 1000)], false)).toEqual([200, 200]);
  });

  it('returns [0, 0] for an empty list', () => {
    expect(computeBoundaries([], false)).toEqual([0, 0]);
  });

  it('returns [0, 0] when every upgrade is neutral', () => {
    expect(computeBoundaries([upgrade(1000, 1000), upgrade(1000, 1000)], true)).toEqual([0, 0]);
  });
});

// SIMS-202 : gains HPS (QE Live) et DPS (Raidbots).
describe('computeBoundariesByMetric', () => {
  const dps = (d: number, b: number) => ({ dps: d, baseDps: b, metric: 'dps' });
  const hps = (d: number, b: number) => ({ dps: d, baseDps: b, metric: 'hps' });
  const mixed = [dps(15000, 10000), dps(9000, 10000), hps(1100, 1000), hps(1050, 1000)];

  it('donne à chaque grandeur sa propre échelle de gains bruts', () => {
    expect(computeBoundariesByMetric(mixed, false)).toEqual({
      dps: [5000, -1000],
      hps: [100, 50],
    });
  });

  it('partage l’échelle en pourcentage', () => {
    expect(computeBoundariesByMetric(mixed, true)).toEqual({
      dps: [50, -10],
      hps: [50, -10],
    });
  });

  it('compte une sim sans grandeur comme DPS', () => {
    expect(computeBoundariesByMetric([upgrade(1200, 1000)], false)).toEqual({
      dps: [200, 200],
      hps: [0, 0],
    });
  });
});

describe('compareGains', () => {
  const bigDps = { dps: 15000, baseDps: 10000, metric: 'dps' };
  const smallHps = { dps: 1100, baseDps: 1000, metric: 'hps' };

  it('ne compare pas des gains bruts de grandeurs différentes : les DPS d’abord', () => {
    // Un gain HPS brut plus petit n'est pas « moins bon » : il est rangé à part.
    expect(compareGains(bigDps, smallHps, false)).toBeGreaterThan(0);
    expect(compareGains(smallHps, bigDps, false)).toBeLessThan(0);
    expect(compareGains({ ...smallHps, dps: 999999 }, bigDps, false)).toBeLessThan(0);
  });

  it('compare les pourcentages quelle que soit la grandeur', () => {
    // +50 % (DPS) contre +10 % (HPS).
    expect(compareGains(bigDps, smallHps, true)).toBeCloseTo(40);
  });

  it('compare normalement deux gains de même grandeur', () => {
    expect(compareGains(upgrade(1200, 1000), upgrade(1100, 1000), false)).toBe(100);
  });
});

describe('valueToColor', () => {
  const hueOf = (color: string) => Number(color.match(/^hsl\((\d+),/)?.[1]);

  it('paints the best gain of the list full green', () => {
    expect(valueToColor(200, 200, -100)).toBe('hsl(150, 68%, 62%)');
  });

  it('paints the worst loss of the list full red', () => {
    expect(valueToColor(-100, 200, -100)).toBe('hsl(8, 68%, 62%)');
  });

  it('paints a neutral gain at the orange pivot', () => {
    expect(valueToColor(0, 200, -100)).toBe('hsl(35, 68%, 62%)');
  });

  it('scales a mid gain between the lime and green ends', () => {
    const hue = hueOf(valueToColor(100, 200, -100));

    expect(hue).toBeGreaterThan(85);
    expect(hue).toBeLessThan(150);
  });

  it('scales a mid loss between the orange and red ends', () => {
    const hue = hueOf(valueToColor(-50, 200, -100));

    expect(hue).toBeGreaterThan(8);
    expect(hue).toBeLessThan(35);
  });

  it('ranks a bigger gain greener than a smaller one', () => {
    expect(hueOf(valueToColor(180, 200, -100))).toBeGreaterThan(hueOf(valueToColor(20, 200, -100)));
  });

  it('ranks a bigger loss redder than a smaller one', () => {
    expect(hueOf(valueToColor(-90, 200, -100))).toBeLessThan(hueOf(valueToColor(-10, 200, -100)));
  });

  it('clamps a gain that overshoots the boundary', () => {
    expect(valueToColor(500, 200, -100)).toBe('hsl(150, 68%, 62%)');
  });

  it('clamps a loss that overshoots the boundary', () => {
    expect(valueToColor(-500, 200, -100)).toBe('hsl(8, 68%, 62%)');
  });

  it('stays on the ramp when no upgrade in the list is positive', () => {
    expect(valueToColor(50, 0, -100)).toBe('hsl(150, 68%, 62%)');
  });

  it('stays on the ramp when no upgrade in the list is negative', () => {
    expect(valueToColor(-2, 200, 0)).toBe('hsl(8, 68%, 62%)');
  });
});
