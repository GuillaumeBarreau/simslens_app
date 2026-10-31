/**
 * Seuls les champs explicitement fournis sont repris ; les autres gardent
 * leur valeur enregistrée.
 */

import createError from 'http-errors';

import realmRepo from '../../realm/realm.repository';
import { assertCheckedRealm } from '../validation_settings.access';
import {
  MAX_SIM_STALE_AFTER_DAYS,
  MIN_SIM_STALE_AFTER_DAYS,
} from '../validation_settings.constants';
import validationRepo from '../validation_settings.repository';
import type {
  RaidBuffsConfig,
  UpdateValidationSettingsInput,
  ValidationSettings,
  ValidationSettingsUpdate,
} from '../validation_settings.types';

/** Rôles autorisés à changer les réglages — le modérateur en est exclu. */
const SETTINGS_ROLES = ['admin', 'owner'];

function readPositiveInteger(value: unknown, field: string): number {
  const parsed = parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw createError(400, `${field} must be a positive integer`);
  }

  return parsed;
}

export function validateSettings(settings: ValidationSettingsUpdate): ValidationSettingsUpdate {
  const validated: ValidationSettingsUpdate = {};

  if (settings.allowedFightStyles !== undefined) {
    if (!Array.isArray(settings.allowedFightStyles)) {
      throw createError(400, 'allowedFightStyles must be an array');
    }
    if (settings.allowedFightStyles.length === 0) {
      throw createError(400, 'allowedFightStyles must contain at least one style');
    }
    validated.allowedFightStyles = settings.allowedFightStyles;
  }

  if (settings.fightLength !== undefined) {
    validated.fightLength = readPositiveInteger(settings.fightLength, 'fightLength');
  }

  if (settings.enemyCount !== undefined) {
    validated.enemyCount = readPositiveInteger(settings.enemyCount, 'enemyCount');
  }

  if (settings.raidBuffsConfig !== undefined) {
    if (typeof settings.raidBuffsConfig !== 'object' || settings.raidBuffsConfig === null) {
      throw createError(400, 'raidBuffsConfig must be an object');
    }
    validated.raidBuffsConfig = settings.raidBuffsConfig as RaidBuffsConfig;
  }

  // Déjà borné par le schéma Joi de la route ; revérifié ici pour tout appel
  // direct du usecase (SIMS-228).
  if (settings.simStaleAfterDays !== undefined) {
    const days = settings.simStaleAfterDays;
    if (
      !Number.isInteger(days) ||
      days < MIN_SIM_STALE_AFTER_DAYS ||
      days > MAX_SIM_STALE_AFTER_DAYS
    ) {
      throw createError(
        400,
        `simStaleAfterDays must be an integer between ${MIN_SIM_STALE_AFTER_DAYS} and ${MAX_SIM_STALE_AFTER_DAYS}`,
      );
    }
    validated.simStaleAfterDays = days;
  }

  return validated;
}

export async function updateValidationSettings({
  realmId,
  checkedRealmId,
  settings,
  requesterId,
}: UpdateValidationSettingsInput): Promise<ValidationSettings> {
  assertCheckedRealm(realmId, checkedRealmId);

  const realm = await realmRepo.getRealmById(realmId);
  if (!realm) {
    throw createError(404, 'Realm not found');
  }

  const requesterOwner = await realmRepo.getRealmOwner(realmId, requesterId);
  if (!requesterOwner || !SETTINGS_ROLES.includes(requesterOwner.role)) {
    throw createError(403, 'Only realm admins and owners can modify validation settings');
  }

  return validationRepo.upsertValidationSettings(realmId, validateSettings(settings));
}
