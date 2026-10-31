import { showNotification } from '@mantine/notifications';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

import { createInstance } from '../../services/api';
import { Raid } from './components/types';

export async function handleCreateInstanceFromRaid(
  raid: Raid,
  queryClient: any,
  onSelect: (raid: Raid) => void,
): Promise<void> {
  const payload = {
    name: raid.name,
    date: new Date().toISOString(),
    raidDifficultyId: raid.raidDifficultyId || raid.id || null,
  };

  try {
    const instance = await createInstance(payload);

    queryClient.invalidateQueries({ queryKey: ['instances'] });

    showNotification({
      title: 'Session créée',
      message: `${raid.name} (${instance.id})`,
      color: 'green',
      icon: <IconCheck />,
    });

    onSelect({
      id: instance.id,
      name: instance.name || raid.name,
      difficulty: instance.raidDifficultyId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création';
    console.error('Failed to create instance from raid:', error);

    showNotification({
      title: 'Erreur',
      message: errorMessage,
      color: 'red',
      icon: <IconAlertCircle />,
    });
  }
}
