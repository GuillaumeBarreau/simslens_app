/**
 * Fonctionnalités masquées parce qu'elles sont en cours de développement.
 *
 * Rien à voir avec un quelconque abonnement : toutes les fonctionnalités livrées
 * sont accessibles à toutes les guildes. Cette liste ne sert qu'à cacher ce qui
 * n'est pas encore prêt à être montré.
 *
 * Pour masquer une page, ajoutez son nom ici puis enveloppez-la dans
 * <FeatureGuard feature="...">. Pour l'ouvrir, retirez-la de la liste.
 */
export const FEATURES_IN_DEVELOPMENT = [
  // Bouton « Mettre à jour le Droptimizer » (SIMS-137), en attente de validation.
  'droptimizer-update',
  // Alerte des places vacantes et remplaçants suggérés du roster (SIMS-142).
  'roster-replacements',
  // Second rappel de raid et annonce de la composition sur Discord (SIMS-143).
  'raid-confirm-reminder',
  // Notes et assignations par boss sur le roster d'un événement (SIMS-206).
  'boss-notes',
  // Raids récurrents générés par le serveur (SIMS-200), en attente de validation.
  'event-series',
  // Flux iCal privé du joueur, dans « Mon activité » (SIMS-204).
  'calendar-feed',
  // Choix du fuseau des messages Discord dans les réglages du royaume (SIMS-204).
  'realm-timezone',
  // Tableau d'équité du loot réservé aux officiers (SIMS-201), en attente de validation.
  'loot-equity',
  // Date du dernier sim et badge « Sim périmé » (suivi, optimiseur) (SIMS-199).
  'sim-freshness',
  // « Mes spécialisations » (spé principale, off-specs) dans « Mon activité » et
  // signalement des wishlists d'autres spés dans la vue roster (SIMS-212).
  'character-specializations',
  // Spé simulée et sélecteur de spé des upgrades par boss, « Mon activité » (SIMS-211).
  'boss-upgrades-spec',
  // Wishlist enrichie : priorité des vœux, vœu obsolète, alternatives de raid (SIMS-205).
  'wishlist-insights',
  // Gains HPS des sims QE Live des soigneurs : badge « HPS », limite 1/6 et 6/6,
  // gains bruts jamais comparés aux DPS dans l'optimiseur (SIMS-202).
  'hps-sims',
  'talent-tree',
] as const satisfies readonly string[];

export type FeatureName = string;

export function isFeatureInDevelopment(feature: FeatureName): boolean {
  return (FEATURES_IN_DEVELOPMENT as readonly string[]).includes(feature);
}

/**
 * Pour un élément ponctuel (bouton, colonne) plutôt qu'une page : visible en local
 * (`npm run dev`) pour permettre la validation, masqué dans les builds tant que la
 * fonctionnalité est listée ci-dessus.
 */
export function isFeatureEnabled(feature: FeatureName): boolean {
  return import.meta.env.DEV || !isFeatureInDevelopment(feature);
}
