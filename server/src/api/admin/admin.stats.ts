/**
 * Statistiques du back-office, calculées sans base : testées à part.
 */

export interface StatsCharacter {
  archived: number | null;
  status: string;
  class: string | null;
  ilvl: number | null;
  specialization?: { role: string | null } | null;
}

export interface ServerStats {
  totalRealms: number;
  totalCharacters: number;
  active: number;
  pending: number;
  archived: number;
  byRole: Record<string, number>;
  byClass: Record<string, number>;
  avgIlvl: number;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * Un personnage actif est approuvé et non archivé ; la répartition par rôle,
 * par classe et l'ilvl moyen ne portent que sur eux.
 */
export function summarizeCharacters(
  totalRealms: number,
  characters: StatsCharacter[],
): ServerStats {
  const active = characters.filter((c) => !c.archived && c.status === 'approved');

  return {
    totalRealms,
    totalCharacters: characters.length,
    active: active.length,
    pending: characters.filter((c) => c.status === 'pending').length,
    archived: characters.filter((c) => !!c.archived).length,
    byRole: countBy(active, (c) => c.specialization?.role ?? 'dps'),
    byClass: countBy(active, (c) => c.class ?? 'Unknown'),
    avgIlvl:
      active.length > 0
        ? Math.round(active.reduce((sum, c) => sum + (c.ilvl ?? 0), 0) / active.length)
        : 0,
  };
}
