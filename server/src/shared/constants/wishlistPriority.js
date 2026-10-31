/**
 * Échelle de priorité d'un vœu de wishlist (SIMS-205), stockée dans
 * `character_wishlists.priority`.
 *
 * `0` reste la valeur par défaut historique (« non précisée ») : les vœux
 * existants gardent leur sens et continuent de compter comme des vœux.
 * `NOT_WANTED` marque un objet dont le joueur ne veut pas : il est gardé sur
 * la fiche pour mémoire mais ne compte **jamais** comme un vœu (vue roster,
 * complétion, équité du loot, marqueurs « wishlist » des upgrades).
 *
 * En JavaScript pour être chargé par `require` depuis les modules CommonJS
 * (repositories, services historiques).
 */
const WISHLIST_PRIORITY = Object.freeze({
  UNSET: 0,
  BIS: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  NOT_WANTED: 5,
});

/** @type {readonly number[]} */
const WISHLIST_PRIORITY_VALUES = Object.freeze(Object.values(WISHLIST_PRIORITY));

/**
 * Un vœu compte s'il n'est pas marqué « je n'en veux pas » (null = valeur par défaut).
 * @param {number | null | undefined} priority
 * @returns {boolean}
 */
function isWantedPriority(priority) {
  return priority !== WISHLIST_PRIORITY.NOT_WANTED;
}

/**
 * Filtre Prisma des vœux qui comptent. `priority` est nullable : un simple
 * `{ not: 5 }` écarterait aussi les lignes à `NULL` en SQL.
 */
function wantedWishWhere() {
  return {
    OR: [{ priority: null }, { priority: { not: WISHLIST_PRIORITY.NOT_WANTED } }],
  };
}

module.exports = {
  WISHLIST_PRIORITY,
  WISHLIST_PRIORITY_VALUES,
  isWantedPriority,
  wantedWishWhere,
};
