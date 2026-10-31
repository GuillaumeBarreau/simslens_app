/**
 * Repli historique pour /raids/:raidId/bosses.
 *
 * Avant que l'extension et la saison ne soient passées en query, le raid 1
 * était le seul exposé ; on conserve ce défaut pour ne pas casser les
 * anciens liens qui appellent la route sans paramètres.
 */
export const LEGACY_RAID_ID = 1;

export const LEGACY_RAID_DEFAULTS = {
  extension: 'The-War-Within',
  season: 'season-03',
};

export interface SeasonScope {
  extension?: string;
  season?: string;
}

export function applyLegacyRaidDefaults(
  raidId: number | string | undefined,
  { extension, season }: SeasonScope = {},
): SeasonScope {
  if (extension && season) return { extension, season };

  const id = typeof raidId === 'string' ? parseInt(raidId, 10) : raidId;
  if (id === LEGACY_RAID_ID) return { ...LEGACY_RAID_DEFAULTS };

  return { extension, season };
}
