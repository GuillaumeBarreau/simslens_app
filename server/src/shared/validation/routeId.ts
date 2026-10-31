import Joi from 'joi';

/**
 * Identifiant numérique lu dans un paramètre de route : chiffres uniquement,
 * converti en nombre.
 *
 * Pourquoi pas `Joi.number()` : il accepte `"1e1"` (→ 10) ou `"1.5e1"` (→ 15),
 * là où `checkPermission` résout le royaume avec `parseInt` sur le paramètre
 * brut (→ 1). Le royaume serait alors vérifié sur un personnage et l'action
 * menée sur un autre (SIMS-171). Avec des chiffres seuls, les deux lectures
 * donnent toujours le même identifiant.
 */
export const routeId = Joi.string()
  .pattern(/^[1-9]\d*$/)
  .custom((value: string) => Number(value))
  .messages({ 'string.pattern.base': '{{#label}} must be a positive integer' });
