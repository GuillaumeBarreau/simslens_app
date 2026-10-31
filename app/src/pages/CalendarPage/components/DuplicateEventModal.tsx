import { Button, Checkbox, Group, Modal, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDuplicateEvent } from 'hooks/queries';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RaidEvent } from '../../../services/event.service';

interface DuplicateEventModalProps {
  opened: boolean;
  onClose: () => void;
  event: RaidEvent;
  realmId: number;
}

export default function DuplicateEventModal({
  opened,
  onClose,
  event,
  realmId,
}: DuplicateEventModalProps) {
  const { t } = useTranslation('calendar');
  const duplicateEvent = useDuplicateEvent();
  const [newTitle, setNewTitle] = useState(`${event.title} (2)`);
  const [copySignups, setCopySignups] = useState(true);

  const handleDuplicate = async () => {
    try {
      const created = await duplicateEvent.mutateAsync({
        id: event.id,
        realmId,
        options: { title: newTitle.trim() || undefined, copySignups },
      });
      notifications.show({
        title: t('duplicate.success'),
        message: t('duplicate.successMessage', { title: created.title }),
        color: 'violet',
      });
      onClose();
    } catch (error) {
      notifications.show({
        title: t('messages.error'),
        message: String(error),
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('duplicate.modalTitle')} size="sm" centered>
      <Stack gap="md">
        <TextInput
          label={t('duplicate.newTitle')}
          value={newTitle}
          onChange={(e) => setNewTitle(e.currentTarget.value)}
          data-autofocus
        />
        <Checkbox
          label={t('duplicate.copySignups')}
          checked={copySignups}
          onChange={(e) => setCopySignups(e.currentTarget.checked)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            color="violet"
            onClick={handleDuplicate}
            loading={duplicateEvent.isPending}
            disabled={!newTitle.trim()}
          >
            {t('duplicate.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
