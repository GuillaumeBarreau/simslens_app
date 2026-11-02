/**
 * Détail d'un événement, tel que l'affichent la page d'inscription et la
 * composition (GET /events/:id).
 *
 * L'événement porte la taille de son raid (SIMS-028) : un raid Forever a une
 * taille fixe (10, 20 ou 40) lue dans le registre des jeux via le raid de
 * l'événement ; un raid Retail est flexible (`raidSize: null`).
 */

import { gameFromExtension, raidSize } from '../../../shared/game/games';
import { EventNotAccessibleError } from '../event.errors';
import eventRepository from '../event.repository';

/** Ce que la taille du raid lit de l'événement (relations incluses par le repository). */
export interface EventRaidRef {
  raid_difficulty?: {
    raid?: { name?: string | null; extension?: string | null } | null;
  } | null;
}

/** Taille fixe du raid de l'événement, ou `null` (Retail, raid inconnu, pas de raid). */
export function eventRaidSize(event: EventRaidRef): number | null {
  const raid = event.raid_difficulty?.raid;
  if (!raid?.name) return null;
  return raidSize(gameFromExtension(raid.extension), raid.name);
}

export async function getEventDetails(id: number, realmId: number) {
  if (!(await eventRepository.belongsToRealm(id, realmId))) {
    throw new EventNotAccessibleError();
  }

  const event = await eventRepository.findWithRoster(id);
  if (!event) throw new EventNotAccessibleError();

  return { ...event, raidSize: eventRaidSize(event as EventRaidRef) };
}
