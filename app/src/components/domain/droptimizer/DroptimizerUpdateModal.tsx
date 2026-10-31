import {
  Alert,
  Anchor,
  Button,
  Group,
  List,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconExternalLink, IconReportAnalytics } from '@tabler/icons-react';
import { isFeatureEnabled } from 'config/featureFlags';
import { useAuth } from 'contexts/AuthContext';
import { useUserRealm, useValidationSettings } from 'hooks/queries';
import { useReportImport } from 'hooks/useReportImport';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ValidationSettings } from 'services/validationSettings.service';
import { RAIDBOTS_DROPTIMIZER_URL } from 'utils/droptimizer';

interface DroptimizerUpdateModalProps {
  opened: boolean;
  onClose: () => void;
  characterName: string;
}

function RequiredSettings({ settings }: { settings: ValidationSettings }) {
  const { t } = useTranslation(['tracking', 'validationSettings']);
  const buffs = Object.entries(settings.raidBuffsConfig)
    .filter(([, enabled]) => enabled)
    .map(([key]) => t(`validationSettings:raid_buffs.${key}`));

  return (
    <List size="sm" spacing={4}>
      <List.Item>
        {t('droptimizer_update.settings.difficulty')} —{' '}
        <b>{t('droptimizer_update.settings.mythic')}</b>
      </List.Item>
      <List.Item>
        {t('validationSettings:fight_styles.label')} —{' '}
        <b>{settings.allowedFightStyles.join(', ')}</b>
      </List.Item>
      <List.Item>
        {t('validationSettings:fight_length.label')} — <b>{settings.fightLength} s</b>
      </List.Item>
      <List.Item>
        {t('validationSettings:enemy_count.label')} — <b>{settings.enemyCount}</b>
      </List.Item>
      <List.Item>
        {t('validationSettings:raid_buffs.title')} —{' '}
        <b>{buffs.length > 0 ? buffs.join(', ') : t('droptimizer_update.settings.none')}</b>
      </List.Item>
    </List>
  );
}

/**
 * Réglages exigés par le royaume, puis collage du lien du rapport. L'import et son
 * suivi sont ceux de la page Tracking (useReportImport).
 */
export function DroptimizerUpdateModal({
  opened,
  onClose,
  characterName,
}: DroptimizerUpdateModalProps) {
  const { t } = useTranslation('tracking');
  const { user } = useAuth();
  const { data: realm } = useUserRealm(user?.id ? String(user.id) : null);
  const settings = useValidationSettings(realm?.id, opened);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setValue('');
    setError(null);
    onClose();
  };

  const { startImport, isSubmitting } = useReportImport({
    onSuccess: close,
    // Message du validateur affiché tel quel (réglages non conformes, mauvais personnage…).
    onError: setError,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const result = await startImport(value);
    if (!result.ok) setError(result.error);
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={t('droptimizer_update.modal_title', { name: characterName })}
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm">{t('droptimizer_update.instructions')}</Text>
        <Anchor href={RAIDBOTS_DROPTIMIZER_URL} target="_blank" rel="noopener noreferrer" size="sm">
          <Group gap={4} component="span">
            {t('droptimizer_update.open_raidbots')}
            <IconExternalLink size={14} />
          </Group>
        </Anchor>

        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {t('droptimizer_update.settings.title')}
          </Text>
          {settings.isLoading && <Loader size="sm" />}
          {settings.isError && (
            <Text size="sm" c="dimmed">
              {t('droptimizer_update.settings.unavailable')}
            </Text>
          )}
          {settings.data && <RequiredSettings settings={settings.data} />}
        </Stack>

        <Text size="xs" c="dimmed">
          {t('droptimizer_update.healer_note')}
          {/* Limite de QE Live et gains HPS (SIMS-202), masqués tant que la fonctionnalité est en développement. */}
          {isFeatureEnabled('hps-sims') && ` ${t('droptimizer_update.healer_qe_limit')}`}
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              data-autofocus
              placeholder={t('import.placeholder')}
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
              leftSection={<IconReportAnalytics size={16} />}
            />
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                {t('droptimizer_update.cancel')}
              </Button>
              <Button type="submit" loading={isSubmitting} disabled={!value.trim()}>
                {t('import.button_default')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
