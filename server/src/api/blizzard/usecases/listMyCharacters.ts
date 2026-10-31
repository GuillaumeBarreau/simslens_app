import characterRepo from '../../character/character.repository';
import realmRepo from '../../realm/realm.repository';
import blizzardService from '../blizzard.service';
import type { BnetCharacter, BnetSession } from '../blizzard.types';

/** Slug de royaume comparable : minuscules, espaces en tirets, sans apostrophe. */
function toSlug(value: string | undefined): string {
  return value ? value.trim().toLowerCase().replace(/\s+/g, '-').replace(/'/g, '') : '';
}

/**
 * Personnages du compte Battle.net, enrichis de leur état côté Droptimizer :
 * liés à l'utilisateur, connus en base, et guilde enregistrée correspondante.
 */
export async function listMyCharacters(session: BnetSession, region = 'eu') {
  const bnetCharacters: BnetCharacter[] = await blizzardService.listUserCharacters(
    session.token,
    region,
  );
  const linkedCharacters: { name: string; realm: string }[] =
    await characterRepo.listCharactersByUserId(session.userId);

  return Promise.all(
    bnetCharacters.map(async (char) => {
      const dbMatch = linkedCharacters.find(
        (lc) =>
          lc.name.toLowerCase() === char.name.toLowerCase() &&
          toSlug(lc.realm) === toSlug(char.realm.slug),
      );

      const dbChar = await characterRepo.findCharacterIdByNameAndRealm(char.name, char.realm.slug);

      let matchRealm: string | null = null;
      if (char.guild?.name) {
        const realm = await realmRepo.findRealmByNameAndRegion(char.guild.name, region);
        if (realm) matchRealm = realm.guildName;
      }

      return {
        ...char,
        ...(dbMatch ?? {}),
        isLinked: !!dbMatch,
        existsInDb: !!dbChar,
        dbId: dbChar,
        matchRealm,
        realm: char.realm, // l'objet royaume Battle.net, pas la colonne de la base
      };
    }),
  );
}
