/**
 * Mise à l'échelle des gains simulés par grandeur (SIMS-202).
 *
 * Un gain brut de soigneur importé de QE Live est en HPS, celui d'un rapport
 * Raidbots en DPS : les deux ne se comparent pas tels quels. Pour départager
 * des candidats, chaque gain est ramené à [0, 1] (min-max) **parmi les gains de
 * la même grandeur** : le meilleur soigneur et le meilleur DPS valent tous deux
 * 1, sans qu'un écart d'unité n'écrase l'un des groupes.
 *
 * Pur, sans dépendance : partagé par la composition automatique et les
 * remplaçants du roster.
 */

/** Grandeur d'un gain ; `dps` pour toute valeur absente ou inconnue. */
function gainMetricOf(metric) {
  return metric === 'hps' ? 'hps' : 'dps';
}

/**
 * Min-max d'une liste de nombres dans [0, 1] ; 0 partout si elle est constante.
 * @param {number[]} values
 * @returns {number[]}
 */
function normalize(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max === min) return values.map(() => 0);
  return values.map((v) => (v - min) / (max - min));
}

/**
 * @param {number[]} values - gains bruts
 * @param {Array<string | null | undefined>} metrics - grandeur de chaque gain (même ordre)
 * @returns {number[]} valeurs dans [0, 1], dans l'ordre d'entrée
 */
function normalizeWithinMetric(values, metrics) {
  const out = new Array(values.length).fill(0);
  const indexesByMetric = new Map();
  values.forEach((_, i) => {
    const metric = gainMetricOf(metrics[i]);
    const list = indexesByMetric.get(metric) ?? [];
    list.push(i);
    indexesByMetric.set(metric, list);
  });
  for (const indexes of indexesByMetric.values()) {
    const scaled = normalize(indexes.map((i) => values[i]));
    indexes.forEach((i, k) => {
      out[i] = scaled[k];
    });
  }
  return out;
}

module.exports = { gainMetricOf, normalize, normalizeWithinMetric };
