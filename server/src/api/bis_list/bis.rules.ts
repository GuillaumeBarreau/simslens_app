import type { BisItem, GuildBisEntry, ReferenceBisList, ResolvedBisSlot } from './bis.types';

/**
 * Liste retenue pour chaque emplacement, sans accès à la base.
 *
 * La progression de Forever est cumulative : sans liste au palier courant, on garde
 * celle du palier précédent le plus récent. À palier égal, la liste de la guilde
 * l'emporte sur la référence.
 *
 * @param seasons paliers jusqu'au courant inclus, du plus ancien au plus récent
 */
export function resolveBisSlots(
  slots: readonly string[],
  seasons: readonly string[],
  guildEntries: readonly GuildBisEntry[],
  references: readonly ReferenceBisList[],
): ResolvedBisSlot[] {
  const newestFirst = [...seasons].reverse();

  return slots.map((slot) => {
    for (const season of newestFirst) {
      const guildItems = guildEntries
        .filter((e) => e.season === season && e.slot === slot)
        .sort((a, b) => a.rank - b.rank)
        .map<BisItem>((e) => ({ itemId: e.itemId, note: e.note }));
      if (guildItems.length > 0) return { slot, source: 'guild', season, items: guildItems };

      const curated = references.find((r) => r.season === season)?.slots[slot];
      if (curated && curated.length > 0) {
        return { slot, source: 'curated', season, items: [...curated] };
      }
    }
    return { slot, source: null, season: null, items: [] };
  });
}

/** Rang de chaque objet dans l'ordre donné : 1 = BiS. */
export function rankItems(items: readonly { itemId: number; note?: string | null }[]) {
  return items.map((item, index) => ({
    itemId: item.itemId,
    note: item.note ?? null,
    rank: index + 1,
  }));
}
