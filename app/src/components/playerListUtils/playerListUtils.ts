import { type SimMetric, simMetricOf } from 'utils/droptimizer';

export interface UpgradeDataMinimal {
  dps: number;
  baseDps: number;
  /** Grandeur de la sim (SIMS-202) : `hps` pour QE Live ; absente = `dps`. */
  metric?: string | null;
}

/** Every colour shares the same saturation/lightness, so only the hue carries meaning. */
const SATURATION = 68;
const LIGHTNESS = 62;

/** Losses ramp orange -> red, gains ramp lime -> green. */
const LOSS_HUE = { best: 35, worst: 8 };
const GAIN_HUE = { worst: 85, best: 150 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const hsl = (hue: number) => `hsl(${Math.round(hue)}, ${SATURATION}%, ${LIGHTNESS}%)`;

/** A base of 0 would make the percentage divide by zero. */
const safeBase = (baseDps: number) => baseDps || 1;

export const computePercentGain = (dps: number, baseDps: number) =>
  ((dps - safeBase(baseDps)) / safeBase(baseDps)) * 100;

export const computeDpsGain = (dps: number, baseDps: number) => dps - baseDps;

/**
 * The single metric the list is ranked and coloured by, in raw DPS or in percent.
 * Boundaries and row values must both come from this, so they stay in the same unit.
 */
export const computeGain = ({ dps, baseDps }: UpgradeDataMinimal, isPercent: boolean) =>
  isPercent ? computePercentGain(dps, baseDps) : computeDpsGain(dps, baseDps);

/** Highest and lowest gain across the list, in the unit selected by `isPercent`. */
export const computeBoundaries = (
  upgrades: UpgradeDataMinimal[],
  isPercent: boolean,
): [high: number, low: number] => {
  if (!upgrades?.length) return [0, 0];

  const gains = upgrades.map((upgrade) => computeGain(upgrade, isPercent));

  return [Math.max(...gains), Math.min(...gains)];
};

/**
 * Boundaries for each metric (SIMS-202). A percentage is relative to the
 * player's own output, so DPS and HPS rows share one scale in percent mode.
 * Raw gains are not comparable across metrics: in raw mode each metric gets
 * its own scale, so HPS rows are never coloured against DPS ones.
 */
export const computeBoundariesByMetric = (
  upgrades: UpgradeDataMinimal[],
  isPercent: boolean,
): Record<SimMetric, [high: number, low: number]> => {
  if (isPercent) {
    const shared = computeBoundaries(upgrades, true);
    return { dps: shared, hps: shared };
  }
  return {
    dps: computeBoundaries(
      upgrades.filter((u) => simMetricOf(u.metric) === 'dps'),
      false,
    ),
    hps: computeBoundaries(
      upgrades.filter((u) => simMetricOf(u.metric) === 'hps'),
      false,
    ),
  };
};

/**
 * Compares two gains in the unit selected by `isPercent` (SIMS-202). In raw
 * mode, gains of different metrics are not compared: DPS rows rank above HPS
 * rows, each group in its own order.
 */
export const compareGains = (
  a: UpgradeDataMinimal,
  b: UpgradeDataMinimal,
  isPercent: boolean,
): number => {
  const metricA = simMetricOf(a.metric);
  const metricB = simMetricOf(b.metric);
  if (!isPercent && metricA !== metricB) return metricA === 'dps' ? 1 : -1;
  return computeGain(a, isPercent) - computeGain(b, isPercent);
};

/**
 * Colours a gain by how it ranks against the rest of the list.
 * `gain`, `boundaryHigh` and `boundaryLow` must share the same unit — mixing raw
 * DPS with percentages pins every row to one end of the ramp.
 */
export const valueToColor = (gain: number, boundaryHigh: number, boundaryLow: number) => {
  if (gain > 0) {
    const best = boundaryHigh > 0 ? boundaryHigh : 1;
    const ratio = clamp01(gain / best);

    return hsl(GAIN_HUE.worst + ratio * (GAIN_HUE.best - GAIN_HUE.worst));
  }

  const worst = boundaryLow < 0 ? Math.abs(boundaryLow) : 1;
  const ratio = clamp01(Math.abs(gain) / worst);

  return hsl(LOSS_HUE.best - ratio * (LOSS_HUE.best - LOSS_HUE.worst));
};
