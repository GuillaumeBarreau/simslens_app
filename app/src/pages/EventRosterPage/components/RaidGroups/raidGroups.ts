/**
 * Raid à taille fixe (SIMS-028) : WoW Forever organise ses raids de 10, 20 ou 40
 * joueurs en groupes de 5. Logique pure, sans React.
 */

import type { RaidGuest, RaidGuestAssignment } from 'services/event.service';
import type { RosterAssignment } from 'services/roster.service';

export const GROUP_SIZE = 5;

export const RAID_ROLES = ['TANK', 'HEALER', 'MELEE', 'RANGED'] as const;

export type RaidRole = (typeof RAID_ROLES)[number];

export interface RaidMember {
  /** Unique dans le raid : `c<id>` pour un personnage, `g<id>` pour un invité. */
  key: string;
  name: string;
  className: string | null;
  role: RaidRole;
  isGuest: boolean;
}

export interface RaidSlot {
  member: RaidMember | null;
  /** Place au-delà de la taille du raid. */
  overCapacity: boolean;
}

export interface RaidGroup {
  /** Numéro affiché, à partir de 1. */
  number: number;
  slots: RaidSlot[];
}

export interface RaidCapacity {
  count: number;
  size: number;
  /** Joueurs en trop (0 si le raid n'est pas plein). */
  over: number;
  isOver: boolean;
}

const roleRank = (role: RaidRole) => RAID_ROLES.indexOf(role);

/**
 * Membres placés sur un boss : personnages puis invités, triés par rôle
 * (tank, soin, mêlée, distance) puis dans l'ordre du roster.
 */
export function bossMembers(
  bossId: number,
  assignments: readonly RosterAssignment[],
  guests: readonly RaidGuest[],
  guestAssignments: readonly RaidGuestAssignment[],
): RaidMember[] {
  const characters = assignments
    .filter((a) => a.bossId === bossId && RAID_ROLES.includes(a.role))
    .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.position - b.position)
    .map<RaidMember>((a) => ({
      key: `c${a.characterId}`,
      name: a.character.name,
      className: a.character.class ?? null,
      role: a.role,
      isGuest: false,
    }));

  const guestsById = new Map(guests.map((g) => [g.id, g]));
  const invited = guestAssignments
    .filter((ga) => ga.bossId === bossId && RAID_ROLES.includes(ga.role))
    .flatMap<RaidMember>((ga) => {
      const guest = guestsById.get(ga.guestId);
      if (!guest) return [];
      return [
        {
          key: `g${guest.id}`,
          name: guest.name,
          className: guest.class ?? null,
          role: ga.role,
          isGuest: true,
        },
      ];
    });

  // Un même membre ne compte qu'une fois, même placé deux fois par erreur.
  const unique = new Map<string, RaidMember>();
  [...characters, ...invited].forEach((member) => {
    if (!unique.has(member.key)) unique.set(member.key, member);
  });
  // Tri stable : à rôle égal, les personnages (ordre du roster) puis les invités.
  return [...unique.values()].sort((a, b) => roleRank(a.role) - roleRank(b.role));
}

export function countByRole(
  members: readonly Pick<RaidMember, 'role'>[],
): Record<RaidRole, number> {
  const counts: Record<RaidRole, number> = { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0 };
  members.forEach((member) => {
    counts[member.role] += 1;
  });
  return counts;
}

export function raidCapacity(count: number, size: number): RaidCapacity {
  const over = Math.max(0, count - size);
  return { count, size, over, isOver: over > 0 };
}

/**
 * Découpe le raid en groupes de 5 : autant de groupes que la taille du raid en
 * demande (places vides comprises), plus ceux qu'exigent les joueurs en trop,
 * dont les places sont marquées `overCapacity`.
 */
export function splitIntoGroups(members: readonly RaidMember[], raidSize: number): RaidGroup[] {
  const slotCount = Math.ceil(Math.max(raidSize, members.length) / GROUP_SIZE) * GROUP_SIZE;
  const groups: RaidGroup[] = [];
  for (let index = 0; index < slotCount; index += 1) {
    if (index % GROUP_SIZE === 0) {
      groups.push({ number: groups.length + 1, slots: [] });
    }
    groups[groups.length - 1].slots.push({
      member: members[index] ?? null,
      overCapacity: index >= raidSize,
    });
  }
  return groups;
}

/** Boss dont le nombre de membres placés dépasse la taille du raid. */
export function bossesOverCapacity<T extends { id: number }>(
  bosses: readonly T[],
  membersByBoss: ReadonlyMap<number, readonly RaidMember[]>,
  raidSize: number,
): Array<{ boss: T; capacity: RaidCapacity }> {
  return bosses
    .map((boss) => ({
      boss,
      capacity: raidCapacity(membersByBoss.get(boss.id)?.length ?? 0, raidSize),
    }))
    .filter(({ capacity }) => capacity.isOver);
}
