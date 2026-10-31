import { SegmentedControl, Stack, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useRaids } from 'hooks/queries';
import { createInstance } from 'services/api';
import { CreateRaidMode } from '../CreateRaidMode';
import { MODE, type Mode } from '../InstancePanel/constants';
import { SelectInstanceMode } from '../SelectInstanceMode';
import { RaidChooserProps } from '../types';

export const RaidChooser = ({ onSelect }: RaidChooserProps): React.ReactElement => {
  const { t } = useTranslation('droptimizer');
  const { data: raids, isLoading: raidsLoading, isError: raidsError } = useRaids();
  const [mode, setMode] = useState<Mode>(MODE.SELECT);
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleModeChange = useCallback((value: string) => {
    setMode(value as Mode);
    setCreateError(null);
    setNewSessionName('');
  }, []);

  const handleCreateNewSession = useCallback(async () => {
    if (isCreating) return;

    setCreateError(null);
    setIsCreating(true);

    const sessionName = newSessionName.trim() || `New Session ${Date.now()}`;
    const payload = {
      name: sessionName,
      date: new Date().toISOString(),
    };

    try {
      const instance = await createInstance(payload);

      showNotification({
        title: t('instance_panel.raid_chooser.session_created'),
        message: t('instance_panel.raid_chooser.created_success', { name: instance.name }),
        color: 'green',
        icon: <IconCheck />,
      });

      queryClient.invalidateQueries({ queryKey: ['instances'] });

      onSelect({
        id: instance.id,
        name: instance.name,
        difficulty: instance.raidDifficultyId,
      });

      setNewSessionName('');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('instance_panel.raid_chooser.create_error');
      console.error('Failed to create instance:', error);

      setCreateError(errorMessage);
      showNotification({
        title: t('instance_panel.raid_chooser.error'),
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsCreating(false);
    }
  }, [newSessionName, isCreating, queryClient, onSelect]);

  return (
    <Stack gap="md">
      <Text fw={700} size="lg">
        {t('instance_panel.raid_chooser.title')}
      </Text>

      <SegmentedControl
        fullWidth
        color="brand.5"
        value={mode}
        onChange={handleModeChange}
        data={[
          { label: t('instance_panel.raid_chooser.select'), value: MODE.SELECT },
          { label: t('instance_panel.raid_chooser.create'), value: MODE.CREATE },
        ]}
      />

      {mode === MODE.SELECT && <SelectInstanceMode onSelect={onSelect} />}

      {mode === MODE.CREATE && (
        <CreateRaidMode
          raids={raids}
          raidsLoading={raidsLoading}
          raidsError={raidsError}
          sessionName={newSessionName}
          onSessionNameChange={setNewSessionName}
          onCreateNewSession={handleCreateNewSession}
          isCreating={isCreating}
          createError={createError}
          onSelect={onSelect}
        />
      )}
    </Stack>
  );
};
