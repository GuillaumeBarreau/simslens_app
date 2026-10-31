/**
 * Tableau d'équité du loot, réservé aux officiers. Ce fichier ne fait que
 * rassembler les données ; les calculs vivent dans attendance.lootEquity et
 * sont testés à part.
 *
 * Tout part des personnages du royaume vérifié : butin, sims et wishlists ne
 * sont lus que pour leurs identifiants, la présence que pour ce royaume.
 */

import { prisma } from '../../../data';
import { isWantedPriority } from '../../../shared/constants/wishlistPriority';
import { resolveDateRange } from '../attendance.dateRange';
import { MissingIdentifierError } from '../attendance.errors';
import type { EquityLoot, LootEquityPlayer } from '../attendance.lootEquity';
import { buildLootEquity, inclusiveEnd } from '../attendance.lootEquity';
import attendanceRepository from '../attendance.repository';
import type { AttendanceQuery } from '../attendance.types';

export interface LootEquityReport {
  range: { startDate: string; endDate: string };
  includeOptional: boolean;
  eventsCount: number;
  players: LootEquityPlayer[];
}

export async function getLootEquity({
  realmId,
  startDate,
  endDate,
  includeOptional,
}: AttendanceQuery): Promise<LootEquityReport> {
  if (!realmId || Number.isNaN(realmId)) {
    throw new MissingIdentifierError('realmId');
  }

  const resolved = resolveDateRange(startDate, endDate, { enforceMaxSpan: true });
  const range = { startDate: resolved.startDate, endDate: inclusiveEnd(resolved.endDate) };
  const optional = Boolean(includeOptional);

  const report = (eventsCount: number, players: LootEquityPlayer[]): LootEquityReport => ({
    range: { startDate: range.startDate.toISOString(), endDate: range.endDate.toISOString() },
    includeOptional: optional,
    eventsCount,
    players,
  });

  // Soirées de la période, comptées à part : le résumé de présence n'a de
  // ligne que pour les personnages déjà inscrits, et vaudrait 0 sans eux.
  // Mêmes critères que attendanceRepository.getAttendanceSummary.
  const [eventsCount, characterRows] = await Promise.all([
    prisma.raid_events.count({
      where: {
        realmId,
        status: { not: 'CANCELLED' },
        startTime: { gte: range.startDate, lte: range.endDate },
        ...(optional ? {} : { isOptional: false }),
      },
    }),
    prisma.characters.findMany({
      where: { realmId, archived: 0, status: { not: 'pending' } },
      select: {
        id: true,
        name: true,
        class: true,
        thumbnail: true,
        specializationId: true,
        specialization: { select: { name: true, role: true } },
      },
    }),
  ]);
  if (characterRows.length === 0) return report(eventsCount, []);

  const characterIds = characterRows.map((c) => c.id);
  const realmCharacterIds = new Set(characterIds);

  const [lootRows, wishlistRows, attendance] = await Promise.all([
    prisma.imported_loots.findMany({
      where: { characterID: { in: characterIds } },
      select: {
        id: true,
        characterID: true,
        itemID: true,
        date: true,
        time: true,
        response: true,
        instance: true,
        upgradePercent: true,
        upgradeSimAt: true,
        upgradeMetric: true,
      },
    }),
    prisma.character_wishlists.findMany({
      where: { characterId: { in: characterIds }, itemId: { not: null } },
      select: { characterId: true, specializationId: true, itemId: true, priority: true },
    }),
    attendanceRepository.getAttendanceSummary({
      realmId,
      startDate: range.startDate,
      endDate: range.endDate,
      includeOptional: optional,
    }),
  ]);

  const loots: EquityLoot[] = lootRows
    .filter((l) => l.characterID != null)
    .map((l) => ({
      id: l.id,
      characterId: l.characterID as number,
      itemId: l.itemID,
      date: l.date,
      time: l.time,
      response: l.response,
      instance: l.instance,
      // Gain figé à l'import (SIMS-229) : Decimal Prisma, lu en nombre.
      frozenGainPercent: l.upgradePercent == null ? null : Number(l.upgradePercent),
      frozenSimAt: l.upgradeSimAt ?? null,
      frozenMetric: l.upgradeMetric ?? null,
    }));

  const lootItemIds = [...new Set(loots.map((l) => l.itemId).filter((id): id is number => !!id))];

  const [items, tokenRewards] = lootItemIds.length
    ? await Promise.all([
        prisma.items.findMany({
          where: { id: { in: lootItemIds } },
          select: { id: true, name: true, icon: true },
        }),
        prisma.item_tokens.findMany({
          where: { tokenItemId: { in: lootItemIds } },
          select: { tokenItemId: true, rewardItemId: true, class: true },
        }),
      ])
    : [[], []];

  const simItemIds = [...new Set([...lootItemIds, ...tokenRewards.map((t) => t.rewardItemId)])];
  const sims = simItemIds.length
    ? await prisma.upgrades.findMany({
        where: { characterID: { in: characterIds }, itemID: { in: simItemIds } },
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
      })
    : [];

  const players = buildLootEquity({
    range,
    characters: characterRows.map((c) => ({
      id: c.id,
      name: c.name,
      class: c.class,
      thumbnail: c.thumbnail,
      specializationId: c.specializationId,
      specName: c.specialization?.name ?? null,
      specRole: c.specialization?.role ?? null,
    })),
    loots,
    items,
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
    // « Je n'en veux pas » ne compte pas dans le BiS (SIMS-205).
    wishlists: wishlistRows
      .filter((w) => isWantedPriority(w.priority))
      .map((w) => ({
        characterId: w.characterId,
        specializationId: w.specializationId,
        itemId: w.itemId as number,
      })),
    tokenRewards,
    attendance: attendance
      .filter((a) => realmCharacterIds.has(a.characterId))
      .map((a) => ({ characterId: a.characterId, present: a.present, totalRaids: a.totalRaids })),
  });

  return report(eventsCount, players);
}
