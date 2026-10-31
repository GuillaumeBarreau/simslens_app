/**
 * Seuls les champs explicitement autorisés sont repris du corps de la
 * requête : le reste est ignoré plutôt que transmis en base.
 */

import createError from 'http-errors';

import { isValidTimeZone } from '../../../shared/utils/timeZone';
import { assertRealmExists } from '../realm.access';
import realmRepo from '../realm.repository';
import type { RealmSettings } from '../realm.types';

/** Bornes des délais exprimés en heures (un mois au plus). */
const MAX_HOURS = 720;

/** Rôles autorisés à changer les réglages — le modérateur en est exclu. */
const SETTINGS_ROLES = ['admin', 'owner'];

function readBoundedHours(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_HOURS) {
    throw createError(400, `${field} must be an integer between 0 and ${MAX_HOURS}`);
  }

  return parsed;
}

export async function updateRealmSettings(
  realmId: number,
  settings: RealmSettings,
  requesterId: string,
): Promise<unknown> {
  const realm = await assertRealmExists(realmId);

  const requesterOwner = await realmRepo.getRealmOwner(realmId, requesterId);
  if (!requesterOwner || !SETTINGS_ROLES.includes(requesterOwner.role)) {
    throw createError(403, 'Only realm admins and owners can modify realm settings');
  }

  const allowed: RealmSettings = {};

  if (settings.discordGuildId !== undefined) {
    allowed.discordGuildId = settings.discordGuildId || null;
  }
  if (settings.discordRaidCategoryId !== undefined) {
    allowed.discordRaidCategoryId = settings.discordRaidCategoryId || null;
  }
  if (settings.signupLockHours !== undefined) {
    allowed.signupLockHours = readBoundedHours(settings.signupLockHours, 'signupLockHours');
  }
  if (settings.signupReminderHours !== undefined) {
    allowed.signupReminderHours = readBoundedHours(
      settings.signupReminderHours,
      'signupReminderHours',
    );
  }
  if (settings.confirmReminderHours !== undefined) {
    allowed.confirmReminderHours = readBoundedHours(
      settings.confirmReminderHours,
      'confirmReminderHours',
    );
  }
  if (settings.timezone !== undefined) {
    // Fuseau des messages Discord (SIMS-204) : un nom inconnu du moteur Intl
    // ferait échouer chaque formatage de date.
    if (!isValidTimeZone(settings.timezone)) {
      throw createError(400, 'timezone must be a valid IANA time zone (e.g. Europe/Paris)');
    }
    allowed.timezone = settings.timezone;
  }

  // Rappeler après le verrouillage n'aurait pas de sens : le membre ne
  // pourrait plus modifier son inscription.
  const lockHours = (allowed.signupLockHours ?? realm.signupLockHours) as number;
  const reminderHours = (allowed.signupReminderHours ?? realm.signupReminderHours) as number;
  if (reminderHours > lockHours) {
    throw createError(400, 'signupReminderHours cannot exceed signupLockHours');
  }

  return realmRepo.updateRealmSettings(realmId, allowed);
}
