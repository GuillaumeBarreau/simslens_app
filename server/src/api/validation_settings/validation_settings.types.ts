/** Buffs de raid suivis par la validation des rapports de simulation. */
export interface RaidBuffsConfig {
  [buffKey: string]: boolean;
}

export interface ValidationSettings {
  allowedFightStyles: string[];
  fightLength: number;
  enemyCount: number;
  raidBuffsConfig: RaidBuffsConfig;
  /** Âge en jours au-delà duquel un sim est périmé (SIMS-199, réglable : SIMS-228). */
  simStaleAfterDays: number;
}

export interface StoredValidationSettings extends ValidationSettings {
  realmId: number;
  /** true quand aucun réglage n'est enregistré et que les défauts servent. */
  isDefault: boolean;
}

export type ValidationSettingsUpdate = Partial<ValidationSettings>;

/** Royaume demandé dans l'URL et royaume vérifié par checkPermission. */
export interface RealmScope {
  realmId: number;
  checkedRealmId: number | undefined;
}

export interface UpdateValidationSettingsInput extends RealmScope {
  settings: ValidationSettingsUpdate;
  requesterId: string;
}
