import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from 'services/api';
import { parseReportLink, reportImportErrorKey } from 'utils/droptimizer';

import { API_VERSION } from '../config/apiConstants';

const API_UPDATE = `${API_VERSION}/update/report/`;
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 60;

export interface ReportImportCallbacks {
  onSuccess?: (result: { characterId?: number; characterName?: string }) => void;
  /** Message d'échec, tel que renvoyé par le validateur quand il y en a un. */
  onError?: (message: string) => void;
}

export type StartImportResult = { ok: true } | { ok: false; error: string };

/**
 * Import d'un rapport Raidbots / QuestionablyEpic et suivi de son traitement
 * (notifications, rafraîchissement des personnages). Partagé par la page Tracking
 * et le bouton « Mettre à jour le Droptimizer » (SIMS-137).
 */
export function useReportImport(callbacks: ReportImportCallbacks = {}) {
  const { t } = useTranslation('tracking');
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { onSuccess, onError } = callbacks;

  const httpErrorMessage = useCallback(
    (error: unknown) => {
      const axiosErr = error as { response?: { status?: number }; message?: string };
      const status = axiosErr?.response?.status;
      if (status === 400) return t('error.invalid_request');
      if (status === 401) return t('error.unauthorized');
      if (status === 403) return t('error.forbidden');
      if (status === 404) return t('error.not_found');
      if (status === 429) return t('error.too_many_requests');
      if (status && status >= 500 && status < 600) return t('error.server_error', { status });
      return t('error.unknown', { message: axiosErr?.message ?? 'unknown' });
    },
    [t],
  );

  const pollStatus = useCallback(
    (reportID: string) => {
      const id = `import-${reportID}`;
      let attempts = 0;

      const checkStatus = async () => {
        if (attempts >= MAX_ATTEMPTS) {
          notifications.update({
            id,
            color: 'orange',
            title: 'Timeout',
            message: t('import.timeout'),
            autoClose: 5000,
            loading: false,
          });
          setIsSubmitting(false);
          return;
        }

        try {
          const { data } = await api.get(`${API_UPDATE}status/${reportID}`);

          if (data.status === 'completed') {
            const characterId: number | undefined = data.characterId;
            queryClient.invalidateQueries({ queryKey: ['characters'] });
            if (characterId) {
              queryClient.invalidateQueries({ queryKey: ['character', characterId] });
            }
            queryClient.invalidateQueries({ queryKey: ['bosses'] });
            queryClient.invalidateQueries({ queryKey: ['imported_loots'] });

            setIsSubmitting(false);
            notifications.update({
              id,
              color: 'teal',
              title: t('import.success_title'),
              message: t('import.success_message', { name: data.characterName }),
              icon: <IconCheck size="1rem" />,
              loading: false,
              autoClose: 5000,
            });
            onSuccess?.({ characterId, characterName: data.characterName });
          } else if (data.status === 'error') {
            // Refus typé (SIMS-202 : rapport QE Live sans spé de soin) : message traduit.
            const refusedKey = reportImportErrorKey(data.code);
            throw new Error(refusedKey ? t(refusedKey) : data.message);
          } else {
            attempts++;
            notifications.update({
              id,
              loading: true,
              title: t('import.status_processing'),
              message: t('import.message_processing', { progress: data.progress || '...' }),
              autoClose: false,
            });
            setTimeout(checkStatus, POLL_INTERVAL_MS);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : t('import.error_generic');
          setIsSubmitting(false);
          notifications.update({
            id,
            color: 'red',
            title: t('roster_update.error_title'),
            message,
            autoClose: 5000,
            loading: false,
          });
          onError?.(message);
        }
      };

      checkStatus();
    },
    [onError, onSuccess, queryClient, t],
  );

  /**
   * Valide la saisie puis lance l'import. Une saisie invalide est signalée dans le
   * résultat (à afficher sous le champ) ; la suite est suivie par notifications.
   */
  const startImport = useCallback(
    async (input: string): Promise<StartImportResult> => {
      const parsed = parseReportLink(input);
      if (!parsed.ok) {
        return {
          ok: false,
          error: parsed.reason === 'empty' ? t('import.error_empty') : t('import.error_invalid'),
        };
      }

      setIsSubmitting(true);
      try {
        await api.get(`${API_UPDATE}${parsed.reportID}`, { params: { source: parsed.source } });
      } catch (error: unknown) {
        setIsSubmitting(false);
        const message = httpErrorMessage(error);
        notifications.show({
          position: 'bottom-center',
          title: t('roster_update.error_title'),
          message,
          color: 'red',
          autoClose: 10000,
        });
        onError?.(message);
        return { ok: true };
      }

      notifications.show({
        id: `import-${parsed.reportID}`,
        loading: true,
        title: t('import.status_processing'),
        message: t('import.message_processing', { progress: '0%' }),
        autoClose: false,
        withCloseButton: false,
      });
      pollStatus(parsed.reportID);
      return { ok: true };
    },
    [httpErrorMessage, onError, pollStatus, t],
  );

  return { startImport, isSubmitting };
}
