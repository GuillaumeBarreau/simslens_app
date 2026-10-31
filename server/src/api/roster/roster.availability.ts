import type { EnrichedPoolCharacter, PoolCharacter, SignupInfo } from './roster.types';

/**
 * Statuts qui rendent un membre plaçable sur l'événement. Source unique pour
 * le vivier (getAvailablePool) et la détection des désistements
 * (roster.replacements).
 */
export const AVAILABLE_SIGNUP_STATUSES = ['PRESENT', 'LATE', 'TENTATIVE'] as const;

/** Statut porté par un reroll dont le membre s'est inscrit avec un autre personnage. */
export const INHERITED_SIGNUP_STATUS = 'INHERITED';

export interface EnrichmentContext {
  /** Ce que chaque personnage a déclaré, par identifiant de personnage. */
  signupsByCharacterId: Map<number, SignupInfo>;
  /** Nom du personnage déjà placé, par couple membre:royaume. */
  assignedNameByUserKey: Map<string, string>;
  /** Personnages déjà placés sur un raid qui chevauche celui-ci. */
  charactersInConcurrentEvents: Set<number>;
}

/**
 * Le royaume entre dans la clé parce qu'un même compte Battle.net peut
 * avoir des personnages sur plusieurs royaumes.
 */
export function userKeyOf(character: PoolCharacter): string | null {
  return character.userId ? `${character.userId}:${character.realmId}` : null;
}

export function enrichCharacter(
  character: PoolCharacter,
  { signupsByCharacterId, assignedNameByUserKey, charactersInConcurrentEvents }: EnrichmentContext,
): EnrichedPoolCharacter {
  const signupInfo = signupsByCharacterId.get(character.id);
  const key = userKeyOf(character);
  const assignedCharacterName = key ? (assignedNameByUserKey.get(key) ?? null) : null;

  return {
    ...character,
    signupStatus: signupInfo?.status || INHERITED_SIGNUP_STATUS,
    signupRole: signupInfo?.role || null,
    lateTime: signupInfo?.lateTime || null,
    isDirectSignup: Boolean(signupInfo),
    disabled: Boolean(assignedCharacterName),
    disabledReason: assignedCharacterName ? 'SAME_USER_ALREADY_ASSIGNED' : null,
    inConcurrentEvent: charactersInConcurrentEvents.has(character.id),
    assignedCharacterName,
  };
}

interface UserGroup {
  main: EnrichedPoolCharacter | null;
  mainName: string;
  alts: EnrichedPoolCharacter[];
}

function byNameAsc(a: { name: string }, b: { name: string }): number {
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

/**
 * Chaque membre a un personnage principal — celui qui porte son inscription,
 * et le premier par ordre alphabétique s'il en a inscrit plusieurs — suivi de
 * ses rerolls. Les groupes sont eux-mêmes classés par nom du principal, pour
 * que la liste reste stable d'un affichage à l'autre.
 */
export function groupAndSortByUser(characters: EnrichedPoolCharacter[]): EnrichedPoolCharacter[] {
  const groups = new Map<string, UserGroup>();

  for (const character of characters) {
    const key = character.userId || `no-user-${character.id}`;
    if (!groups.has(key)) {
      groups.set(key, { main: null, mainName: '', alts: [] });
    }

    const group = groups.get(key) as UserGroup;

    if (!character.isDirectSignup) {
      group.alts.push(character);
      continue;
    }

    if (!group.main) {
      group.main = character;
      group.mainName = character.name;
      continue;
    }

    // Deux personnages inscrits pour le même membre : le premier
    // alphabétiquement devient le principal, l'autre rejoint les rerolls.
    if (byNameAsc(character, group.main) < 0) {
      group.alts.push(group.main);
      group.main = character;
      group.mainName = character.name;
    } else {
      group.alts.push(character);
    }
  }

  for (const group of groups.values()) {
    group.alts.sort(byNameAsc);
  }

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const nameA = a.mainName || a.alts[0]?.name || '';
    const nameB = b.mainName || b.alts[0]?.name || '';
    return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
  });

  return sortedGroups.flatMap((group) => (group.main ? [group.main, ...group.alts] : group.alts));
}
