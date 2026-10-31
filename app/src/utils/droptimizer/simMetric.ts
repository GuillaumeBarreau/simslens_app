/**
 * Grandeur simulée par une sim (SIMS-202) : `dps` pour un rapport Raidbots,
 * `hps` pour un rapport QE Live (soigneurs). Un gain HPS ne se compare jamais
 * tel quel à un gain DPS.
 */
export type SimMetric = 'dps' | 'hps';

/** Grandeur d'une sim ; `dps` pour toute valeur absente ou inconnue (défaut serveur). */
export function simMetricOf(metric?: string | null): SimMetric {
  return metric === 'hps' ? 'hps' : 'dps';
}
