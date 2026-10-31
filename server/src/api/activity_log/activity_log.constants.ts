/**
 * Bornes de pagination de l'historique d'activité.
 *
 * L'historique n'est pas tronqué selon un palier d'abonnement : toutes les
 * guildes voient l'intégralité du leur. Ces bornes ne servent qu'à éviter
 * qu'un client ne demande tout d'un coup.
 */

export const DEFAULT_LOG_LIMIT = 100;

export const MAX_LOG_LIMIT = 200;

export function resolveLimit(limit?: number | null): number {
  if (!Number.isFinite(limit) || (limit as number) <= 0) return DEFAULT_LOG_LIMIT;
  return Math.min(limit as number, MAX_LOG_LIMIT);
}
