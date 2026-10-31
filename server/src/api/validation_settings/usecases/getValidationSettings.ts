import createError from 'http-errors';

import realmRepo from '../../realm/realm.repository';
import { assertCheckedRealm } from '../validation_settings.access';
import { DEFAULT_SETTINGS, DEFAULT_SIM_STALE_AFTER_DAYS } from '../validation_settings.constants';
import validationRepo from '../validation_settings.repository';
import type { RealmScope, StoredValidationSettings } from '../validation_settings.types';

export async function getValidationSettings({
  realmId,
  checkedRealmId,
}: RealmScope): Promise<StoredValidationSettings> {
  assertCheckedRealm(realmId, checkedRealmId);

  const realm = await realmRepo.getRealmById(realmId);
  if (!realm) {
    throw createError(404, 'Realm not found');
  }

  const settings = await validationRepo.getValidationSettings(realmId);

  // `isDefault` permet au client de distinguer « jamais configuré » de
  // « configuré avec les mêmes valeurs que les défauts ».
  if (!settings) {
    return { realmId, ...DEFAULT_SETTINGS, isDefault: true };
  }

  return {
    ...settings,
    realmId,
    isDefault: false,
    // Repli tant que la colonne n'est pas migrée (SIMS-228).
    simStaleAfterDays: settings.simStaleAfterDays ?? DEFAULT_SIM_STALE_AFTER_DAYS,
  };
}
