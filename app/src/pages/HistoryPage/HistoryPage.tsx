import { Center, Container, Loader, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useRealmAccess } from 'contexts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { characterService } from 'services/character.service';

import { HistoryFeed } from './components/HistoryFeed';
import { HistoryFilters } from './components/HistoryFilters';
import { HistoryHeader } from './components/HistoryHeader';
import { useHistoryLogs } from './hooks/useHistoryLogs';
import type { FilterType } from './types';

export default function HistoryPage() {
  const { t } = useTranslation('history');
  const { user, selectedCharacterId } = useAuth();
  const { canEditAll } = useRealmAccess();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  const realmId: number | null =
    user?.linkedCharacters?.find((c) => c.id === selectedCharacterId)?.realmId ?? null;

  const { data: rosterCharacters = [] } = useQuery({
    queryKey: ['characters', 'roster', realmId],
    queryFn: () => {
      if (realmId === null) {
        return Promise.resolve([]);
      }
      return characterService.getRoster(undefined, realmId);
    },
    enabled: !!realmId,
  });

  const characterOptions = rosterCharacters.map((c) => ({ value: c.name, label: c.name }));

  const { filteredLogs, isLoading } = useHistoryLogs(realmId, filter, selectedCharacter);

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader size="md" />
      </Center>
    );
  }

  if (!canEditAll) {
    return (
      <Container size={860} py={32} px={16}>
        <Stack align="center" py={64} gap="xs" c="dimmed">
          <Text fz="2.5rem">⛔</Text>
          <Text fz="sm">{t('access_denied')}</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <HistoryHeader />

        {!realmId && <Text c="dimmed">{t('no_realm')}</Text>}

        {realmId && (
          <HistoryFilters
            value={filter}
            onChange={setFilter}
            characters={characterOptions}
            selectedCharacter={selectedCharacter}
            onCharacterChange={setSelectedCharacter}
          />
        )}

        {realmId && filteredLogs?.length === 0 && (
          <Stack align="center" py={64} gap="xs" c="dimmed">
            <Text fz="sm">{t('empty')}</Text>
            <img
              src="/src/sad-character.png"
              alt=""
              style={{ maxWidth: 280, width: '280px', height: 'auto', opacity: 0.95 }}
            />
          </Stack>
        )}

        {filteredLogs && filteredLogs.length > 0 && <HistoryFeed logs={filteredLogs} />}
      </Stack>
    </Container>
  );
}
