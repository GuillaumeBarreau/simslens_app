import { Button, Divider, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandDiscord, IconCheck, IconX } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateCharacter } from 'hooks/queries';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character } from 'types/character.types';

import { API_BASE_URL } from '../../../config/apiConstants';

interface RosterDiscordModalProps {
  character: Character | null;
  currentUserId: string | number | undefined;
  realmId?: number;
  onClose: () => void;
}

export function RosterDiscordModal({
  character,
  currentUserId,
  realmId,
  onClose,
}: RosterDiscordModalProps) {
  const { t } = useTranslation(['roster', 'common']);
  const queryClient = useQueryClient();
  const updateCharacter = useUpdateCharacter();
  const [value, setValue] = useState('');
  const [oauthPending, setOauthPending] = useState<Character | null>(null);
  const [editedId, setEditedId] = useState<number | null>(null);

  if (character && character.id !== editedId) {
    setEditedId(character.id);
    setValue(character.discordTag || '');
  }

  useEffect(() => {
    if (!oauthPending) return;
    const bc = new BroadcastChannel('discord_oauth');
    bc.onmessage = (event) => {
      bc.close();
      setOauthPending(null);
      if (event.data?.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['characters'] });
        notifications.show({
          position: 'bottom-center',
          title: t('notifications.success_title'),
          message: t('drawer.notifications.discord_success', { name: oauthPending.name }),
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        onClose();
      } else {
        notifications.show({
          position: 'bottom-center',
          title: t('notifications.error_title'),
          message: t('drawer.notifications.update_error'),
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    };
    return () => bc.close();
  }, [oauthPending, queryClient, t, onClose]);

  const close = () => {
    setEditedId(null);
    onClose();
  };

  const handleOAuth = () => {
    if (!character) return;
    window.open(
      `${API_BASE_URL}/auth/discord?characterId=${character.id}`,
      'discord_oauth',
      'width=500,height=700,scrollbars=yes',
    );
    setOauthPending(character);
  };

  const handleSave = () => {
    if (!character) return;
    updateCharacter.mutate(
      { id: character.id, payload: { discordTag: value, realmId } },
      {
        onSuccess: () => {
          notifications.show({
            position: 'bottom-center',
            title: t('notifications.success_title'),
            message: t('drawer.notifications.discord_success', { name: character.name }),
            color: 'green',
            icon: <IconCheck size={16} />,
          });
          close();
        },
        onError: () => {
          notifications.show({
            position: 'bottom-center',
            title: t('notifications.error_title'),
            message: t('drawer.notifications.update_error'),
            color: 'red',
            icon: <IconX size={16} />,
          });
        },
      },
    );
  };

  const isOwnCharacter =
    currentUserId != null &&
    character?.userId != null &&
    String(character.userId) === String(currentUserId);

  return (
    <Modal
      opened={character !== null}
      onClose={close}
      title={t('page.discord_modal.title', { name: character?.name ?? '' })}
      size="sm"
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t('drawer.fields.discord_tag.label')}
          placeholder={t('drawer.fields.discord_tag.placeholder')}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          data-autofocus
        />
        {isOwnCharacter && (
          <>
            <Divider label={t('common:or')} labelPosition="center" />
            <Button
              variant="light"
              color="indigo"
              leftSection={<IconBrandDiscord size={16} />}
              onClick={handleOAuth}
              fullWidth
            >
              {t('table.connect_discord')}
            </Button>
          </>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            {t('common:cancel')}
          </Button>
          <Button color="brand.5" loading={updateCharacter.isPending} onClick={handleSave}>
            {t('drawer.buttons.update')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
