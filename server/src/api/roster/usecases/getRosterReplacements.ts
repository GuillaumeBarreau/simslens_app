/**
 * Places libérées par un titulaire qui s'est désisté, avec leurs remplaçants
 * classés. Ce fichier ne fait que rassembler les données ; la détection et le
 * classement vivent dans roster.replacements, et sont testés à part.
 */

import { prisma } from '../../../data';
import {
  getClassRoles,
  RAID_ROLES,
  resolveRole,
  resolveRoleWithoutSpec,
} from '../../../shared/constants/roles';
import compositionRepo from '../../composition/composition.repository';
import { resolveBuffs } from '../../composition/composition.selection';
import upgradeService from '../../item_upgrade/item_upgrade.service';
import { EventNotAccessibleError } from '../roster.errors';
import type {
  BossNeed,
  Holder,
  RaidRole,
  ReplacementCandidate,
  Vacancy,
} from '../roster.replacements';
import { findVacancies, isWithdrawn, needByBossOf } from '../roster.replacements';
import rosterRepository from '../roster.repository';
import { getAvailablePool } from './getAvailablePool';

export async function getRosterReplacements(eventId: number, realmId: number): Promise<Vacancy[]> {
  const event = await compositionRepo.getEventContext(eventId, realmId);
  if (!event) throw new EventNotAccessibleError();

  const [assignments, signups] = await Promise.all([
    rosterRepository.findByEvent(eventId),
    prisma.raid_signups.findMany({
      where: { eventId },
      select: { characterId: true, status: true, character: { select: { userId: true } } },
    }),
  ]);

  const holders: Holder[] = assignments
    .filter((a) => a.bossId != null && RAID_ROLES.includes(a.role))
    .map((a) => ({
      bossId: a.bossId as number,
      characterId: a.characterId,
      name: a.character?.name ?? '',
      class: a.character?.class ?? null,
      spec: a.character?.specialization?.name ?? null,
      userId: a.character?.userId ?? null,
      role: a.role as RaidRole,
    }));

  // Un membre se désiste pour tous ses personnages : ses statuts sont lus par
  // membre, et par personnage pour ceux qui n'ont pas de compte lié.
  const statusesByOwner = new Map<string, string[]>();
  for (const signup of signups) {
    const owner = signup.character?.userId ?? `character:${signup.characterId}`;
    statusesByOwner.set(owner, [...(statusesByOwner.get(owner) ?? []), signup.status]);
  }
  const statusesByCharacterId = new Map<number, string[]>();
  for (const holder of holders) {
    const owner = holder.userId ?? `character:${holder.characterId}`;
    statusesByCharacterId.set(holder.characterId, statusesByOwner.get(owner) ?? []);
  }

  const vacantRoles = new Set(
    holders
      .filter((h) => isWithdrawn(statusesByCharacterId.get(h.characterId) ?? []))
      .map((h) => h.role),
  );
  if (vacantRoles.size === 0) return [];

  const [pool, validationSettings] = await Promise.all([
    getAvailablePool(eventId, realmId),
    compositionRepo.getValidationSettings(realmId),
  ]);

  // Un personnage sans spécialisation reste candidat (SIMS-209) : son rôle
  // principal est celui de son inscription, à défaut il ne tient la place
  // qu'en off-spec, d'après sa classe.
  const candidates = pool
    .filter((c) => c.class)
    .map((c) => {
      const missingSpecialization = !c.specialization?.name;
      const role = (
        missingSpecialization
          ? resolveRoleWithoutSpec(c.signupRole, c.class)
          : resolveRole(c.class, c.specialization?.name, c.specialization?.role)
      ) as RaidRole | null;
      const playableRoles = [
        ...new Set([...(role ? [role] : []), ...getClassRoles(c.class)]),
      ] as RaidRole[];
      return { character: c, role, playableRoles, missingSpecialization };
    })
    .filter(({ playableRoles }) => playableRoles.some((r) => vacantRoles.has(r)));

  const raid = event.raid_difficulty?.raid;
  const difficulty = event.raid_difficulty?.difficulty;
  const needs = await Promise.all(
    candidates.map(({ character }) =>
      fetchNeedByBoss(character.id, {
        difficulty,
        extension: raid?.extension,
        season: raid?.season,
      }),
    ),
  );

  const replacementCandidates: ReplacementCandidate[] = candidates.map(
    ({ character, role, playableRoles, missingSpecialization }, i) => ({
      characterId: character.id,
      name: character.name,
      class: character.class as string,
      spec: character.specialization?.name ?? null,
      missingSpecialization,
      userId: character.userId,
      role,
      playableRoles,
      needByBoss: needs[i],
    }),
  );

  const activeBuffs = resolveBuffs(
    validationSettings?.raidBuffsConfig as Record<string, boolean> | null | undefined,
  ).filter((b) => b.enabled);

  return findVacancies({
    holders,
    statusesByCharacterId,
    candidates: replacementCandidates,
    activeBuffs,
  });
}

/**
 * Besoin BiS par boss d'un personnage. Une erreur de calcul ne doit pas
 * priver l'officier des remplaçants : le personnage est alors classé sans
 * besoin connu, comme dans la composition automatique.
 */
async function fetchNeedByBoss(
  characterId: number,
  {
    difficulty,
    extension,
    season,
  }: { difficulty?: string | null; extension?: string | null; season?: string | null },
): Promise<Map<number, BossNeed>> {
  if (!difficulty || !extension || !season) return new Map();
  try {
    const entries = await upgradeService.getCharacterBossUpgrades({
      characterId,
      difficulty,
      extension,
      season,
      specializationId: undefined,
    });
    return needByBossOf(entries);
  } catch (err) {
    console.warn(
      `[Roster] upgrades fetch failed for char ${characterId}:`,
      (err as Error)?.message,
    );
    return new Map();
  }
}
