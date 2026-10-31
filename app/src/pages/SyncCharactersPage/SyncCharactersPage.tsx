import { Alert, Button, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRefresh, IconUserPlus } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBlizzardCharacters, useUserRealm } from 'hooks/queries';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { claimBnetCharacter } from 'services/api';

import { useAuth } from '../../contexts/AuthContext';
import { AvailableCharactersList } from './components/AvailableCharactersList';
import { LinkedRealmsList } from './components/LinkedRealmsList';
import { NoGuildAlert } from './components/NoGuildAlert';
import { SyncLoading } from './components/SyncLoading';
const SyncCharactersPage: React.FC = () => {
  const { user, refetchUser, setSelectedCharacter } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation('sync');

  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['blizzard', 'characters'] });
    refetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: bnetCharacters, isLoading, error, refetch } = useBlizzardCharacters();
  const { data: realm } = useUserRealm(user?.id ? String(user.id) : null);

  const linkMutation = useMutation({
    mutationFn: (character: any) => {
      const region = character.realm?.region?.toUpperCase() || 'EU';
      return claimBnetCharacter(character.name, character.realm.slug, region);
    },
    onSuccess: async (data) => {
      notifications.show({
        title: 'Success',
        message: 'Character linked successfully!',
        color: 'green',
      });

      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.invalidateQueries({ queryKey: ['blizzard', 'characters'] });
      queryClient.invalidateQueries({ queryKey: ['realm'] });

      await refetchUser();

      if (data?.characterId) {
        setSelectedCharacter(data.characterId);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      notifications.show({
        title: 'Error',
        message: err?.message || 'Failed to link character.',
        color: 'red',
      });
    },
  });

  if (isLoading) {
    return <SyncLoading />;
  }

  const charsArray = Array.isArray(bnetCharacters) ? bnetCharacters : [];

  const toSlug = (str: string) =>
    str ? str.trim().toLowerCase().replace(/\s+/g, '-').replace(/'/g, '') : '';
  const myLinkedChars = user?.linkedCharacters || [];

  const processedChars = charsArray.map((char) => {
    const dbMatch = myLinkedChars.find((lc) => {
      const dbRealmSlug = toSlug(lc.realm);
      const bnetRealmSlug = toSlug(char.realm.slug);

      const nameMatch = lc.name.toLowerCase() === char.name.toLowerCase();
      const realmMatch = dbRealmSlug === bnetRealmSlug;

      const charGuildName = char.guild?.name || null;

      const guildMatch =
        lc.guildName && charGuildName && lc.guildName.toLowerCase() === charGuildName.toLowerCase();

      return nameMatch && (realmMatch || guildMatch);
    });

    const guildName = char.guild?.name || null;

    const isLinked = !!dbMatch && !!dbMatch.guildName;

    return {
      ...char,
      isLinked,
      guildName: isLinked && dbMatch ? dbMatch.guildName : guildName, // Use DB guildName if linked, else Bnet
      existsInDb: char.existsInDb || !!dbMatch, // Keep server flag or local match
    };
  });

  const linkedChars = processedChars.filter((c) => c.isLinked);
  const availableChars = processedChars.filter((c) => !c.isLinked);

  const isGuestUser = (user?.guestRealms?.length ?? 0) > 0 && linkedChars.length === 0;

  const sortedAvailable = [...availableChars]
    // Filter out characters that are neither In DB nor Guild Verified (Strict Filter per user request)
    // Exception: guests bypass the guild filter since their character isn't in the guild
    .filter(
      (c) =>
        isGuestUser ||
        c.existsInDb ||
        c.matchRealm ||
        (realm?.guildName && c.guildName?.toLowerCase() === realm.guildName.toLowerCase()),
    )
    .sort((a, b) => {
      if (realm?.guildName) {
        const realmGuild = realm.guildName.toLowerCase();
        const aGuild = a.guildName?.toLowerCase();
        const bGuild = b.guildName?.toLowerCase();

        const aMatch = aGuild === realmGuild;
        const bMatch = bGuild === realmGuild;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }

      return b.level - a.level;
    });

  const showNoGuildAlert =
    linkedChars.length === 0 && sortedAvailable.length === 0 && charsArray.length > 0;

  return (
    <Container size="lg" py="xl" h={showNoGuildAlert ? '80vh' : 'auto'}>
      <Stack gap="xl" h="100%" justify={showNoGuildAlert ? 'center' : 'flex-start'}>
        {!showNoGuildAlert && linkedChars.length === 0 && (
          <Alert
            color={isGuestUser ? 'teal' : 'blue'}
            title={isGuestUser ? 'Lier un personnage en tant que guest' : t('page.welcome_title')}
            icon={<IconUserPlus size={20} />}
          >
            {isGuestUser
              ? 'Tu es invité(e) sur ce realm. Sélectionne le personnage que tu souhaites utiliser pour les raids et les événements.'
              : t('page.welcome_message')}
          </Alert>
        )}

        {!showNoGuildAlert && (
          <Group justify="space-between">
            <div>
              <Title order={2}>{t('page.title')}</Title>
              <Text c="dimmed">{t('page.subtitle')}</Text>
            </div>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="default"
              onClick={() => refetch()}
              loading={isLoading}
            >
              {t('page.refresh')}
            </Button>
          </Group>
        )}

        {error ? (
          <Alert color="red" title={t('page.error_title')}>
            {error.message || t('page.error_fetch_failed')}
          </Alert>
        ) : (
          <>
            {showNoGuildAlert ? (
              <NoGuildAlert />
            ) : (
              <>
                <LinkedRealmsList linkedChars={linkedChars} />

                {linkedChars.length > 0 && <Divider my="sm" />}

                <AvailableCharactersList
                  characters={sortedAvailable}
                  realm={realm}
                  onLink={(char) => linkMutation.mutate(char)}
                  isLinking={linkMutation.isPending}
                />
              </>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
};

export default SyncCharactersPage;
