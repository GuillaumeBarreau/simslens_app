import type { ValidationSettings, ValidationSettingsUpdate } from './validation_settings.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const validationSettingsRepository: {
  getValidationSettings(realmId: number): Promise<ValidationSettings | null>;
  createValidationSettings(realmId: number, settings: ValidationSettingsUpdate): Promise<unknown>;
  updateValidationSettings(realmId: number, settings: ValidationSettingsUpdate): Promise<unknown>;
  upsertValidationSettings(
    realmId: number,
    settings: ValidationSettingsUpdate,
  ): Promise<ValidationSettings>;
};

export default validationSettingsRepository;
