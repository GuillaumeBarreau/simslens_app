/**
 * Vérifie plusieurs personnages en deux requêtes seulement, là où l'appel
 * unitaire en fait deux par personnage.
 */

import { prisma } from '../../../data';
import { buildEnchantResults, buildGemResults, collectEnchantIds } from '../enchantments.results';
import type { CharacterVerification, EnchantmentMap, GearSnapshot } from '../enchantments.types';

export async function verifyBulkCharacterEnchantments(
  characterIds: number[],
): Promise<Record<number, CharacterVerification | null>> {
  if (!characterIds || characterIds.length === 0) return {};

  const snapshots = (await prisma.character_gear_snapshots.findMany({
    where: { characterId: { in: characterIds } },
    orderBy: { createdAt: 'desc' },
    include: { items: true, character: { select: { class: true } } },
  })) as unknown as GearSnapshot[];

  // Le tri décroissant place l'instantané le plus récent en tête : le
  // premier vu pour un personnage est celui qu'on garde.
  const latestByCharacter = new Map<number, GearSnapshot>();
  for (const snapshot of snapshots) {
    if (!latestByCharacter.has(snapshot.characterId)) {
      latestByCharacter.set(snapshot.characterId, snapshot);
    }
  }

  const enchantIds = [...new Set([...latestByCharacter.values()].flatMap(collectEnchantIds))];

  let enchantmentMap: EnchantmentMap = {};
  if (enchantIds.length > 0) {
    const rows = await prisma.enchantments.findMany({
      where: { id: { in: enchantIds } },
      select: { id: true, spellId: true, displayName: true, craftingQuality: true },
    });
    enchantmentMap = Object.fromEntries(rows.map((e) => [e.id, e]));
  }

  const result: Record<number, CharacterVerification | null> = {};

  for (const characterId of characterIds) {
    const snapshot = latestByCharacter.get(characterId);
    if (!snapshot) {
      result[characterId] = null;
      continue;
    }

    const { slots, hasEpicGem } = buildGemResults(snapshot);
    result[characterId] = {
      results: buildEnchantResults(snapshot, enchantmentMap),
      gems: slots,
      hasEpicGem,
    };
  }

  return result;
}
