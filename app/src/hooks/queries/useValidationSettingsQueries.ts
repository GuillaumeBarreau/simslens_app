import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  validationSettingsService,
  type ValidationSettingsUpdate,
} from 'services/validationSettings.service';

const validationSettingsKey = (realmId?: number | null) => ['validation-settings', realmId];

/**
 * Réglages de sim exigés par le royaume (lecture ouverte aux membres).
 * `retry: false` pour un usage d'appoint (seuil de péremption) : un refus
 * d'accès n'a pas à être retenté.
 */
export function useValidationSettings(
  realmId?: number | null,
  enabled = true,
  options: { retry?: boolean } = {},
) {
  return useQuery({
    queryKey: validationSettingsKey(realmId),
    queryFn: () => validationSettingsService.getSettings(realmId as number),
    enabled: Boolean(realmId) && enabled,
    staleTime: 5 * 60_000,
    ...(options.retry !== undefined ? { retry: options.retry } : {}),
  });
}

/**
 * Enregistre les réglages du royaume, puis rafraîchit leur lecture : le roster
 * et le suivi reprennent aussitôt le nouveau seuil de péremption (SIMS-228).
 */
export function useUpdateValidationSettings(realmId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: ValidationSettingsUpdate) =>
      validationSettingsService.updateSettings(realmId as number, settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: validationSettingsKey(realmId) }),
  });
}
