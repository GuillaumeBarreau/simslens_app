import { ID_TO_CLASS } from '../../../shared/constants/wow';
import characterRepo from '../../character/character.repository';
import { decideMemberImport } from '../blizzard.import';
import blizzardService from '../blizzard.service';
import type { BnetSession, GuildMember, ImportGuildMembersResult } from '../blizzard.types';

const CLASS_BY_ID: Record<number, string> = ID_TO_CLASS;

export async function getGuildRoster(
  session: BnetSession,
  realm: string,
  guild: string,
  region = 'eu',
) {
  return blizzardService.getGuildRoster(session.token, realm, guild, region);
}

/**
 * Importe les membres dans le royaume `realmId` (vérifié par checkPermission,
 * jamais lu dans le corps). Un personnage d'une autre guilde n'est jamais
 * déplacé : voir decideMemberImport. Un échec sur un membre n'interrompt pas
 * l'import des autres.
 */
export async function importGuildMembers(
  members: GuildMember[],
  realmId: number,
  region = 'EU',
): Promise<ImportGuildMembersResult> {
  const results: ImportGuildMembersResult = { imported: 0, ignored: 0, failed: 0, details: [] };

  for (const member of members) {
    try {
      const realmSlug = typeof member.realm === 'string' ? member.realm : member.realm.slug;
      // Sans slug, la recherche ignorerait le filtre de royaume : échec explicite.
      if (!realmSlug) throw new Error('realm slug missing');
      const className = member.classId === undefined ? undefined : CLASS_BY_ID[member.classId];

      const existing = await characterRepo.findCharacterIdByNameAndRealm(member.name, realmSlug);
      const decision = decideMemberImport(existing, realmId);

      if (decision === 'create' && !className) {
        // Classe inconnue : la créer violerait la clé étrangère classes.name.
        results.ignored++;
        results.details.push({
          name: member.name,
          status: 'ignored_unknown_class',
          error: `classe inconnue (classId ${member.classId ?? 'absent'})`,
        });
      } else if (decision === 'create') {
        // Le roster Blizzard ne donne pas la spé : créé sans (null, jamais
        // 'dps'), elle sera posée par la prochaine synchronisation (SIMS-208).
        await characterRepo.createCharacter({
          name: member.name,
          realm: realmSlug,
          class: className,
          spec: null,
          region,
          realmId,
          lastModified: new Date(),
        });
        results.imported++;
        results.details.push({ name: member.name, status: 'created' });
      } else if (decision === 'attach' && existing) {
        // personnage connu mais sans guilde : rattaché à celle-ci
        await characterRepo.updateCharacterById(existing.id, { realmId });
        results.details.push({ name: member.name, status: 'attached' });
      } else if (decision === 'already_in_guild') {
        results.details.push({ name: member.name, status: 'skipped' });
      } else {
        // appartient à une autre guilde : jamais déplacé
        results.ignored++;
        results.details.push({ name: member.name, status: 'ignored_other_guild' });
      }
    } catch (err) {
      console.error(`Failed to import ${member.name}:`, err);
      results.failed++;
      results.details.push({ name: member.name, status: 'error', error: (err as Error).message });
    }
  }

  return results;
}
