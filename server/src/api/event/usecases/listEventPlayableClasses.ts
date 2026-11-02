/**
 * Classes jouables du jeu de la guilde d'un événement (SIMS-026).
 *
 * Le bot Discord en construit le menu « classe » de l'invitation d'un invité : les
 * 13 classes pour Retail, les 9 classes vanilla pour WoW Forever. La liste vient du
 * registre des jeux (`shared/game/games.ts`), pas d'une constante du bot.
 */

import { GAMES } from '../../../shared/game/games';
import { EventNotAccessibleError } from '../event.errors';
import eventRepository from '../event.repository';
import type { EventPlayableClasses } from '../event.types';

export async function listEventPlayableClasses(eventId: number): Promise<EventPlayableClasses> {
  const game = await eventRepository.findGame(eventId);
  if (!game) throw new EventNotAccessibleError();
  return { game, classes: [...GAMES[game].playableClasses] };
}
