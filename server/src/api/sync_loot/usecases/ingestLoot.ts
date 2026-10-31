/**
 * Reçoit un lot d'attributions poussé par le compagnon de bureau.
 *
 * Les entrées arrivent déjà structurées, contrairement à l'import CSV, mais
 * empruntent la même persistance — un parent `imports` et ses
 * `imported_loots`, dont la clé unique (player, date, time, itemID) assure
 * l'idempotence — pour que l'interface existante les affiche sans rien
 * savoir de leur provenance.
 *
 * Chaque objet attribué à un personnage y reçoit son gain figé (SIMS-229),
 * lu dans le sim courant : un sim ultérieur ne le modifiera plus.
 */

import createError from 'http-errors';

import { prisma } from '../../../data';
import {
  characterKey as buildCharacterKey,
  parseNameRealm,
} from '../../../shared/utils/importUtils';
import { ADMIN_ROLES } from '../../device_auth/device_auth.constants';
import importRepo from '../../item_import/item_import.repository';
import realmRepo from '../../realm/realm.repository';
import type { FreezeContext, FreezeLoot } from '../sync_loot.frozenGain';
import { freezeGain, isFreezable } from '../sync_loot.frozenGain';
import type {
  ImportableLootRow,
  IngestLootInput,
  IngestLootResult,
  SyncEntry,
} from '../sync_loot.types';

function emptyResult(unmatched: string[] = []): IngestLootResult {
  return { importId: null, inserted: 0, duplicates: 0, unmatched };
}

function characterKey(player: string): string {
  const { name, realm } = parseNameRealm(player);

  return buildCharacterKey(name, realm);
}

function isComplete(entry: SyncEntry | null | undefined): entry is SyncEntry {
  return Boolean(entry?.player && entry?.date && entry?.time && entry?.itemId);
}

const EMPTY_CONTEXT: FreezeContext = { characters: new Map(), sims: [], tokenRewards: [] };

/**
 * Données nécessaires au gain figé, pour les seuls loots qui en reçoivent
 * un : personnages (rattachés au royaume vérifié), jetons de ces objets et
 * sims courants des objets ou des pièces qu'ils donnent.
 */
async function loadFreezeContext(loots: FreezeLoot[], realmId: number): Promise<FreezeContext> {
  const freezable = loots.filter(isFreezable);
  if (freezable.length === 0) return EMPTY_CONTEXT;

  const characterIds = [...new Set(freezable.map((l) => l.characterID))];
  const itemIds = [...new Set(freezable.map((l) => l.itemID))];

  const [characterRows, tokenRewards] = await Promise.all([
    prisma.characters.findMany({
      where: { id: { in: characterIds }, realmId },
      select: {
        id: true,
        class: true,
        specializationId: true,
        specialization: { select: { name: true } },
      },
    }),
    prisma.item_tokens.findMany({
      where: { tokenItemId: { in: itemIds } },
      select: { tokenItemId: true, rewardItemId: true, class: true },
    }),
  ]);
  if (characterRows.length === 0) return EMPTY_CONTEXT;

  const simItemIds = [...new Set([...itemIds, ...tokenRewards.map((t) => t.rewardItemId)])];
  const sims = await prisma.upgrades.findMany({
    where: { characterID: { in: characterRows.map((c) => c.id) }, itemID: { in: simItemIds } },
    select: {
      characterID: true,
      itemID: true,
      dps: true,
      baseDps: true,
      timeStamp: true,
      difficulty: true,
      spec: true,
      specializationId: true,
      metric: true,
    },
  });

  return {
    characters: new Map(
      characterRows.map((c) => [
        c.id,
        {
          id: c.id,
          class: c.class,
          specializationId: c.specializationId,
          specName: c.specialization?.name ?? null,
        },
      ]),
    ),
    tokenRewards,
    sims: sims.map((s) => ({
      characterId: s.characterID,
      itemId: s.itemID,
      dps: s.dps,
      baseDps: s.baseDps,
      timeStamp: s.timeStamp,
      difficulty: s.difficulty,
      spec: s.spec,
      specializationId: s.specializationId,
      metric: s.metric,
    })),
  };
}

export async function ingestLoot({
  realmId,
  source,
  entries,
  tokenScopes,
  userId,
}: IngestLootInput): Promise<IngestLootResult> {
  if (!Number.isFinite(realmId)) throw createError(400, 'realmId_required');
  if (!Array.isArray(entries)) throw createError(400, 'entries_must_be_array');

  // La portée du jeton est vérifiée royaume par royaume : un appareil
  // appairé sur une guilde ne pousse pas de butin dans une autre.
  if (!tokenScopes.includes(`realm:${realmId}`)) {
    throw createError(403, `missing_scope_for_realm_${realmId}`);
  }

  // La portée date de l'appairage : un responsable retiré de la guilde, ou
  // rétrogradé depuis, garderait sinon un appareil qui écrit dans son butin.
  // Même règle qu'à l'appairage (approveDeviceCode).
  const role = await realmRepo.getRealmUserRole(realmId, userId);
  if (!role || !ADMIN_ROLES.has(role)) {
    throw createError(403, `not_authorized_on_realm_${realmId}`);
  }

  if (entries.length === 0) return emptyResult();

  const lookupByKey = await importRepo.resolveCharactersByKeys(
    [...new Set(entries.filter((e) => e?.player).map((e) => characterKey(e.player)))],
    realmId,
  );

  const unmatched = new Set<string>();
  const loots: Array<FreezeLoot & { player: string }> = [];

  for (const entry of entries) {
    if (!isComplete(entry)) continue;

    const characterID = lookupByKey[characterKey(entry.player)] || null;
    if (!characterID) unmatched.add(entry.player);

    loots.push({
      player: entry.player,
      characterID,
      itemID: Number(entry.itemId),
      date: entry.date,
      time: entry.time,
      response: entry.response || null,
      instance: entry.instance || null,
      // Champ libre du compagnon, non validé : seul un libellé est exploitable.
      difficulty: typeof entry.difficulty === 'string' ? entry.difficulty : null,
    });
  }

  if (loots.length === 0) return emptyResult([...unmatched]);

  // Gain figé (SIMS-229) : lu avant l'insertion, pour que les doublons —
  // ignorés par createMany — gardent la valeur figée à leur premier import.
  const context = await loadFreezeContext(loots, realmId);
  const rows: ImportableLootRow[] = loots.map((loot) => {
    const frozen = freezeGain(loot, context);
    return {
      player: loot.player,
      date: loot.date,
      time: loot.time,
      itemID: loot.itemID,
      response: loot.response,
      instance: loot.instance,
      characterID: loot.characterID,
      upgradePercent: frozen?.upgradePercent ?? null,
      upgradeSimAt: frozen?.upgradeSimAt ?? null,
      upgradeSpecializationId: frozen?.upgradeSpecializationId ?? null,
      upgradeMetric: frozen?.upgradeMetric ?? null,
    };
  });

  const importedAt = Math.floor(Date.now() / 1000);
  const filename = `${source || 'live'}-${new Date(importedAt * 1000).toISOString()}`;
  const importId = await importRepo.createImportRecord(filename, importedAt, rows.length);

  const { count: inserted } = await prisma.imported_loots.createMany({
    data: rows.map((row) => ({ importID: importId, ...row })),
    skipDuplicates: true,
  });

  const duplicates = rows.length - inserted;

  // Un lot entièrement composé de doublons ne laisse pas d'import vide
  // derrière lui.
  if (inserted === 0) {
    await prisma.imports.delete({ where: { id: importId } }).catch(() => null);

    return { importId: null, inserted: 0, duplicates, unmatched: [...unmatched] };
  }

  return { importId, inserted, duplicates, unmatched: [...unmatched] };
}
