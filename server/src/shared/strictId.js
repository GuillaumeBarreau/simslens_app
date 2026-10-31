/**
 * Lecture stricte d'un identifiant venu de la requête (paramètre de route,
 * query ou corps) : un entier positif, ou une chaîne de chiffres seuls.
 *
 * `parseInt` est trop permissif : il lit `"1e1"` comme 1, alors que Joi
 * (`Joi.number()`) le lit comme 10. Quand checkPermission résout le royaume
 * avec l'un et que le handler agit avec l'autre, le contrôle de royaume porte
 * sur une autre ressource que celle modifiée (SIMS-173). Avec une lecture
 * stricte, toute valeur ambiguë est refusée avant d'arriver au handler.
 *
 * Même règle que `routeId` (shared/validation/routeId.ts) côté Joi.
 *
 * @param {unknown} value
 * @returns {number} l'identifiant, ou NaN si la valeur n'en est pas un
 */
function strictId(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : NaN;
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : NaN;
  }
  return NaN;
}

module.exports = { strictId };
