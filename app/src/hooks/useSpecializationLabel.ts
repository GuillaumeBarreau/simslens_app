import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { specializationKey } from 'utils/specializations';

/**
 * Libellé traduit d'une spé à partir de son nom anglais (tel qu'en base).
 * Un nom sans traduction s'affiche tel quel.
 */
export function useSpecializationLabel() {
  const { t } = useTranslation('common');
  return useCallback(
    (name: string | null | undefined): string =>
      name ? t(`specializations.${specializationKey(name)}`, { defaultValue: name }) : '',
    [t],
  );
}
