/**
 * Pose une absence jour par jour sur la période demandée : une entrée par
 * journée, ce qui permet d'en lever une seule sans casser les autres. Les
 * journées déjà couvertes sont ignorées.
 */

import absenceRepo from '../absence.repository';
import { getUserCharactersInRealm, markCharactersAbsent } from '../absence.signupSync';
import type { AbsenceEntity, CreateAbsenceInput } from '../absence.types';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * @returns la première absence créée, ou null si la période était déjà couverte
 */
export async function createAbsence(input: CreateAbsenceInput): Promise<AbsenceEntity | null> {
  const startDate = startOfDay(input.startDate);
  const endDate = startOfDay(input.endDate);
  const reason = input.reason || null;

  const characters = await getUserCharactersInRealm(input.userId, input.realmId);
  console.log(
    `[Absence Service] User has ${characters.length} characters in realm ${input.realmId}`,
  );

  const created: AbsenceEntity[] = [];

  for (
    const currentDate = new Date(startDate);
    currentDate <= endDate;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);
    const day = dayStart.toISOString().split('T')[0];

    const existing = await absenceRepo.findByUserAndDate(input.userId, input.realmId, dayStart);
    if (existing) {
      console.log(`[Absence Service] Absence already exists for ${day}, skipping`);
      continue;
    }

    created.push(
      await absenceRepo.create({
        userId: input.userId,
        realmId: input.realmId,
        startDate: dayStart,
        endDate: dayEnd,
        reason,
      }),
    );
    console.log(`[Absence Service] Created absence for ${day}`);

    await markCharactersAbsent(
      { realmId: input.realmId, startDate: dayStart, endDate: dayEnd, characters },
      reason,
    );
  }

  return created[0] ?? null;
}
