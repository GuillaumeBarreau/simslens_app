/**
 * Ces fonctions ne font que rassembler les données ; les verdicts
 * appartiennent à enchantments.results, testés à part.
 */

import { prisma } from '../../../data';
import { buildEnchantResults, buildGemResults, collectEnchantIds } from '../enchantments.results';
import type {
  EnchantmentMap,
  EnchantResult,
  GearSnapshot,
  GemResults,
} from '../enchantments.types';

const ENCHANTMENT_FIELDS = {
  id: true,
  spellId: true,
  displayName: true,
  craftingQuality: true,
} as const;

async function readLatestSnapshot(
  characterId: number,
  withCharacter: boolean,
): Promise<GearSnapshot | null> {
  return prisma.character_gear_snapshots.findFirst({
    where: { characterId },
    orderBy: { createdAt: 'desc' },
    include: withCharacter
      ? { items: true, character: { select: { class: true } } }
      : { items: true },
  }) as Promise<GearSnapshot | null>;
}

async function readEnchantments(ids: number[]): Promise<EnchantmentMap> {
  if (ids.length === 0) return {};

  const rows = await prisma.enchantments.findMany({
    where: { id: { in: ids } },
    select: ENCHANTMENT_FIELDS,
  });

  return Object.fromEntries(rows.map((e) => [e.id, e]));
}

/**
 * @returns null si le personnage n'a aucun instantané d'équipement
 */
export async function verifyCharacterEnchantments(
  characterId: number,
): Promise<EnchantResult[] | null> {
  const snapshot = await readLatestSnapshot(characterId, true);
  if (!snapshot) return null;

  const enchantmentMap = await readEnchantments(collectEnchantIds(snapshot));

  return buildEnchantResults(snapshot, enchantmentMap);
}

/**
 * @returns null si le personnage n'a aucun instantané d'équipement
 */
export async function verifyCharacterGems(characterId: number): Promise<GemResults | null> {
  const snapshot = await readLatestSnapshot(characterId, false);
  if (!snapshot) return null;

  return buildGemResults(snapshot);
}
