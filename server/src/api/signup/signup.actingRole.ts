/**
 * Rôle de l'auteur d'une inscription, pour les contrôles de droits (verrou
 * des inscriptions).
 */

import type { Request } from 'express';

import characterRepo from '../character/character.repository';
import realmRepo from '../realm/realm.repository';

export interface SignupActor {
  /**
   * Tag Discord transmis par le bot (`x-acting-discord-tag`) quand il agit
   * pour le compte d'un joueur.
   */
  discordTag?: string;
  /** Rôle posé sur la requête par checkPermission. */
  realmRole?: string;
}

/**
 * Auteur d'une requête : rôle posé par checkPermission et, pour un appel du
 * bot seulement, le tag Discord du joueur pour lequel il agit.
 *
 * Hors appel interne, l'en-tête x-acting-discord-tag est fourni par le client
 * lui-même : l'honorer laisserait emprunter le rôle d'un autre joueur, par
 * exemple pour passer outre le verrou des inscriptions (SIMS-166).
 */
export function actorFromRequest(req: Request): SignupActor {
  return {
    discordTag: req.isInternalCall ? req.get('x-acting-discord-tag') : undefined,
    realmRole: req.realmRole,
  };
}

/**
 * Pour un appel du bot, le rôle est celui du joueur Discord sur le royaume ;
 * sans tag Discord, c'est le rôle posé par checkPermission.
 */
export async function resolveActingRole(
  actor: SignupActor,
  realmId: number,
): Promise<string | undefined> {
  if (!actor.discordTag) return actor.realmRole;

  const character = await characterRepo.findCharacterByDiscordTag(actor.discordTag);
  if (!character?.userId) return 'member';

  // Un membre sans rôle sur le royaume est traité comme un rôle absent.
  return (await realmRepo.getRealmUserRole(realmId, character.userId)) ?? undefined;
}
