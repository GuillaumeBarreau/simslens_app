/**
 * Portée des scripts de données factices.
 *
 * Par défaut ils travaillent sur toutes les guildes. Renseigner SEED_REALM_ID
 * les restreint à une seule — utile pour alimenter une guilde nouvellement créée
 * sans dupliquer les personnages et événements des autres.
 *
 *   SEED_REALM_ID=17 npm run server:init-fake-data
 *
 * Les helpers servent aussi à borner les `deleteMany` : sans ça, cibler une
 * guilde effacerait quand même les données de toutes les autres.
 */

const raw = process.env.SEED_REALM_ID;
const REALM_ID = raw ? Number.parseInt(raw, 10) : null;

if (raw && Number.isNaN(REALM_ID)) {
  throw new Error(`SEED_REALM_ID doit être un entier, reçu : ${JSON.stringify(raw)}`);
}

/** Filtre pour `prisma.realms.findMany({ where: realmWhere() })`. */
function realmWhere() {
  return REALM_ID ? { id: REALM_ID } : {};
}

/** Filtre pour les tables portant directement un `realmId`. */
function byRealm(field = 'realmId') {
  return REALM_ID ? { [field]: REALM_ID } : {};
}

/**
 * Ids des personnages de la portée courante, ou null si aucune restriction.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<number[]|null>}
 */
async function scopedCharacterIds(prisma) {
  if (!REALM_ID) return null;
  const rows = await prisma.characters.findMany({
    where: { realmId: REALM_ID },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Libellé lisible pour les logs. */
function scopeLabel() {
  return REALM_ID ? `realm ${REALM_ID}` : 'toutes les guildes';
}

/**
 * Filtre pour une table reliée aux personnages : `{}` hors portée, sinon une
 * clause `in` sur les personnages du realm ciblé.
 */
async function byCharacters(prisma, field = 'characterId') {
  const ids = await scopedCharacterIds(prisma);
  return ids ? { [field]: { in: ids } } : {};
}

module.exports = {
  REALM_ID,
  realmWhere,
  byRealm,
  byCharacters,
  scopedCharacterIds,
  scopeLabel,
};
