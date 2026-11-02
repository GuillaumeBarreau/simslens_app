import { Container, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from 'contexts';
import {
  useAttunementDefinitions,
  useCharacters,
  useRealmAttunements,
  useSaveAttunement,
  useUserRealm,
} from 'hooks/queries';
import { useGame } from 'hooks/useGame';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SaveAttunementPayload } from 'services/attunement.service';

import { MyAttunementCard } from './components/MyAttunementCard';
import { RosterAttunementsTable } from './components/RosterAttunementsTable';

/** Attunements d'une guilde Forever (SIMS-054) : ses personnages, puis le roster. */
export default function AttunementsPage() {
  const { t } = useTranslation('attunements');
  const { user } = useAuth();
  const { definition: game } = useGame();
  const { data: realm } = useUserRealm(user?.id ? String(user.id) : null);
  const realmId = realm?.id;

  const { data: definitions = [], isLoading: definitionsLoading } = useAttunementDefinitions();
  const { data: roster = [], isLoading: rosterLoading } = useRealmAttunements(realmId);
  const { data: characters = [] } = useCharacters(realmId);
  const saveAttunement = useSaveAttunement();

  const myCharacters = useMemo(() => {
    const mine = new Set(
      characters.filter((c) => String(c.userId) === String(user?.id)).map((c) => Number(c.id)),
    );
    return roster.filter((c) => mine.has(c.characterId));
  }, [characters, roster, user?.id]);

  const onSave = (payload: SaveAttunementPayload) =>
    saveAttunement.mutate(payload, {
      onError: () => notifications.show({ color: 'red', message: t('save_error') }),
    });

  if (definitionsLoading || rosterLoading || !realmId) {
    return (
      <Container size="lg" py="xl">
        <Skeleton height={400} radius="md" />
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>{t('title')}</Title>
        {definitions.map((definition) => (
          <Stack key={definition.key} gap="md">
            <Title order={2}>
              {t(`names.${definition.key}`, { defaultValue: definition.key })}
              {` · ${definition.raid}`}
            </Title>

            <Title order={3}>{t('mine.title')}</Title>
            {myCharacters.length === 0 ? (
              <Text c="dimmed">{t('mine.empty')}</Text>
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                {myCharacters.map((character) => (
                  <MyAttunementCard
                    key={character.characterId}
                    character={character}
                    definition={definition}
                    wowheadBaseUrl={game.wowheadBaseUrl}
                    saving={saveAttunement.isPending}
                    onSave={onSave}
                  />
                ))}
              </SimpleGrid>
            )}

            <RosterAttunementsTable characters={roster} definition={definition} />
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}
