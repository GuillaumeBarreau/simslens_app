import { Alert, Flex, Loader, ScrollArea, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import React from 'react';

import { useInstances, useUserRealm } from 'hooks/queries';
import { useAuth } from 'contexts/AuthContext';
import { InstanceCard } from '../InstanceCard';
import { Instance, Raid } from '../types';

interface SelectInstanceModeProps {
  onSelect: (raid: Raid) => void;
}

export function SelectInstanceMode({ onSelect }: SelectInstanceModeProps): React.ReactElement {
  const { user } = useAuth();
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const { data: instances, isLoading, isError } = useInstances(realmData?.id);

  if (isLoading) {
    return (
      <Flex justify="center" align="center" py="xl">
        <Loader size="sm" />
      </Flex>
    );
  }

  if (isError) {
    return (
      <Alert icon={<IconAlertCircle />} color="red" title="Erreur">
        Erreur lors du chargement des sessions
      </Alert>
    );
  }

  const instanceList = (instances as Instance[]) || [];

  if (instanceList.length === 0) {
    return (
      <Alert icon={<IconAlertCircle />} color="blue" title="Aucune session">
        Aucune session disponible. Créez-en une en mode "Créer".
      </Alert>
    );
  }

  return (
    <ScrollArea>
      <Stack gap="xs" pb="md">
        {instanceList.map((instance) => (
          <InstanceCard key={instance.id} instance={instance} onSelect={onSelect} />
        ))}
      </Stack>
    </ScrollArea>
  );
}
