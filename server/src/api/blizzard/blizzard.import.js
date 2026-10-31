/**
 * Règle d'import d'un membre du roster de guilde Blizzard (SIMS-126).
 *
 * Un import ne retire jamais un personnage à une autre guilde. Avant, le
 * contrôleur comparait `existing.realmId` alors que la recherche ne renvoyait que
 * l'id : tout personnage existant était réaffecté, quelle que soit sa guilde.
 *
 * @param {{ id: number, realmId?: number|null } | null} existing  personnage connu, ou null
 * @param {number} realmId  royaume vérifié par checkPermission(EDIT_ROSTER)
 * @returns {'create'|'attach'|'already_in_guild'|'ignored_other_guild'}
 */
function decideMemberImport(existing, realmId) {
  if (!existing) return 'create';
  // Garde-fou : sans le royaume actuel du personnage, on ne peut pas décider
  // sans risquer de le retirer à une autre guilde.
  if (!('realmId' in existing)) {
    throw new Error('decideMemberImport: realmId du personnage existant inconnu');
  }
  if (existing.realmId === null) return 'attach';
  if (Number(existing.realmId) === Number(realmId)) return 'already_in_guild';
  return 'ignored_other_guild';
}

module.exports = { decideMemberImport };
