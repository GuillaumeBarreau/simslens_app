import type { event_roster_assignments } from '@prisma/client';

export type RosterAssignmentEntity = event_roster_assignments;

export interface CharacterSpecialization {
  id: number;
  name: string;
  role: string | null;
}

/** Personnage du royaume, tel que le calcul du vivier le manipule. */
export interface PoolCharacter {
  id: number;
  name: string;
  class: string | null;
  specialization: CharacterSpecialization | null;
  userId: string | null;
  realmId: number | null;
}

/** Ce que le membre a déclaré sur l'événement. */
export interface SignupInfo {
  status: string;
  role: string | null;
  lateTime: string | null;
}

/**
 * Motif pour lequel un personnage ne peut pas être placé.
 * Un seul motif existe aujourd'hui : un autre personnage du même membre est
 * déjà placé sur ce boss.
 */
export type DisabledReason = 'SAME_USER_ALREADY_ASSIGNED';

export interface EnrichedPoolCharacter extends PoolCharacter {
  /** Statut déclaré, ou INHERITED pour un reroll non inscrit lui-même. */
  signupStatus: string;
  signupRole: string | null;
  lateTime: string | null;
  /** true si ce personnage précis porte l'inscription du membre. */
  isDirectSignup: boolean;
  disabled: boolean;
  disabledReason: DisabledReason | null;
  /** true si le personnage est déjà placé sur un raid qui chevauche. */
  inConcurrentEvent: boolean;
  assignedCharacterName: string | null;
}

export interface AssignToRosterInput {
  characterId: number;
  role: string;
  bossId?: number | null;
  position?: number;
}
