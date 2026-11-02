import type { ReferenceBisList } from './bis.types';

/**
 * Listes BiS de référence de WoW Forever, maintenues par SimsLens (SIMS-030).
 *
 * Vide au 2 novembre 2026 : les tables de loot des raids du palier 1 ne sont pas
 * publiées (ouverture le 9 décembre) et ~40 % des objets n'ont pas encore de
 * statistiques visibles. On n'invente aucun objet : chaque liste ajoutée cite ses
 * sources. En attendant, chaque guilde définit ses propres listes.
 */
export const REFERENCE_BIS: readonly ReferenceBisList[] = [];
