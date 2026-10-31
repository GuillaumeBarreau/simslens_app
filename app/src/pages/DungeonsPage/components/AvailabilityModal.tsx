import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { TimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useAuth } from 'contexts';
import dayjs from 'dayjs';
import {
  useCharacters,
  useCreateDungeonAvailability,
  useDeleteDungeonAvailability,
  useUpdateDungeonAvailability,
} from 'hooks/queries';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Character } from 'types/character.types';

import type { DungeonAvailability } from '../../../services/dungeonAvailability.service';

type ApiErrorLike = { response?: { data?: { error?: string } }; message?: string };

function getErrorMessage(error: unknown): string {
  const e = error as ApiErrorLike;
  return e?.response?.data?.error || e?.message || String(error);
}

interface AvailabilityModalProps {
  opened: boolean;
  onClose: () => void;
  realmId: number;
  dayAvailabilities: DungeonAvailability[];
  selectedDate: Date | null;
}

function getCharacterRole(character: Character): string | null {
  if (character.role && ['TANK', 'HEALER', 'DPS'].includes(character.role.toUpperCase())) {
    return character.role.toUpperCase();
  }

  // Rôle de la spé, servi par l'API avec le personnage (SIMS-212) ; mêlée et
  // distance comptent comme DPS.
  const specRole = character.specialization?.role?.toUpperCase();
  if (specRole === 'TANK') return 'TANK';
  if (specRole === 'HEALER') return 'HEALER';

  return 'DPS';
}

function SlotCard({
  avail,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  t,
}: {
  avail: DungeonAvailability;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  t: any;
}) {
  const roles: string[] = (() => {
    try {
      return JSON.parse(avail.roles);
    } catch {
      return [];
    }
  })();

  const [editing, setEditing] = React.useState(false);
  const [type, setType] = React.useState(avail.type);
  const [startTime, setStartTime] = React.useState(avail.startTime);
  const [endTime, setEndTime] = React.useState(avail.endTime);
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>(roles);
  const [note, setNote] = React.useState(avail.note || '');
  const [startDropdownOpened, setStartDropdownOpened] = React.useState(false);
  const [endDropdownOpened, setEndDropdownOpened] = React.useState(false);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.length > 1 ? prev.filter((r) => r !== role) : prev;
      }
      return [...prev, role];
    });
  };

  const handleSave = () => {
    onUpdate(avail.id, {
      date: dayjs(avail.date).startOf('day').toISOString(),
      startTime,
      endTime,
      type,
      roles: selectedRoles,
      note: note || undefined,
    });
    setEditing(false);
  };

  if (!editing) {
    return (
      <Card withBorder padding="xs" radius="sm">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Badge color={avail.type === 'M+' ? 'orange' : 'blue'} size="sm">
              {avail.type}
            </Badge>
            <Text size="sm" fw={500}>
              {avail.startTime} - {avail.endTime}
            </Text>
            <Group gap={4}>
              {roles.map((role) => (
                <Badge key={role} size="xs" variant="light" color="gray">
                  {role}
                </Badge>
              ))}
            </Group>
          </Group>
          <Group gap="xs">
            <Button size="xs" variant="subtle" onClick={() => setEditing(true)}>
              {t('actions.edit')}
            </Button>
            <ActionIcon
              size="sm"
              color="red"
              variant="subtle"
              onClick={() => onDelete(avail.id)}
              loading={isDeleting}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>
        {avail.note && (
          <Text size="xs" c="dimmed" mt={4}>
            {avail.note}
          </Text>
        )}
      </Card>
    );
  }

  return (
    <Card withBorder padding="sm" radius="sm">
      <Stack gap="sm">
        <SegmentedControl
          fullWidth
          size="xs"
          data={[
            { label: t('availability.typeM0'), value: 'M0' },
            { label: t('availability.typeMPlus'), value: 'M+' },
          ]}
          value={type}
          onChange={(v) => setType(v as 'M0' | 'M+')}
        />
        <Group grow>
          <TimePicker
            size="xs"
            label={t('availability.startTime')}
            withDropdown
            value={startTime}
            onChange={(val) => {
              setStartTime(val);
              if (startTime === '') setStartDropdownOpened(false);
            }}
            onClick={() => setStartDropdownOpened(true)}
            popoverProps={{
              opened: startDropdownOpened,
              onChange: (_opened) => !_opened && setStartDropdownOpened(false),
            }}
          />
          <TimePicker
            size="xs"
            label={t('availability.endTime')}
            withDropdown
            value={endTime}
            onChange={(val) => {
              setEndTime(val);
              if (endTime === '') setEndDropdownOpened(false);
            }}
            onClick={() => setEndDropdownOpened(true)}
            popoverProps={{
              opened: endDropdownOpened,
              onChange: (_opened) => !_opened && setEndDropdownOpened(false),
            }}
          />
        </Group>
        <Group gap="md">
          <Checkbox
            size="xs"
            label="Tank"
            checked={selectedRoles.includes('TANK')}
            onChange={() => toggleRole('TANK')}
          />
          <Checkbox
            size="xs"
            label="Heal"
            checked={selectedRoles.includes('HEALER')}
            onChange={() => toggleRole('HEALER')}
          />
          <Checkbox
            size="xs"
            label="DPS"
            checked={selectedRoles.includes('DPS')}
            onChange={() => toggleRole('DPS')}
          />
        </Group>
        <Textarea
          size="xs"
          placeholder={t('availability.notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          minRows={1}
        />
        <Group justify="flex-end" gap="xs">
          <Button size="xs" variant="subtle" onClick={() => setEditing(false)}>
            {t('actions.cancel')}
          </Button>
          <Button size="xs" onClick={handleSave} loading={isUpdating}>
            {t('actions.update')}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

export default function AvailabilityModal({
  opened,
  onClose,
  realmId,
  dayAvailabilities,
  selectedDate,
}: AvailabilityModalProps) {
  const { t } = useTranslation('dungeons');
  const { selectedCharacterId } = useAuth();
  const { data: characters = [] } = useCharacters(realmId);

  const createAvailability = useCreateDungeonAvailability();
  const updateAvailability = useUpdateDungeonAvailability();
  const deleteAvailability = useDeleteDungeonAvailability();
  const [startDropdownOpened, setStartDropdownOpened] = React.useState(false);
  const [endDropdownOpened, setEndDropdownOpened] = React.useState(false);

  const myCharacter = characters.find((c) => c.id === selectedCharacterId);
  const defaultRole = myCharacter ? getCharacterRole(myCharacter) : 'DPS';

  const form = useForm({
    initialValues: {
      type: 'M+' as 'M0' | 'M+',
      startTime: '20:00',
      endTime: '23:00',
      roles: [defaultRole || 'DPS'] as string[],
      note: '',
    },
  });

  React.useEffect(() => {
    if (opened && selectedDate) {
      form.setValues({
        type: 'M+',
        startTime: '20:00',
        endTime: '23:00',
        roles: [defaultRole || 'DPS'],
        note: '',
      });
    }
    // Mantine's setValues is stable (useCallback); depending on the whole form
    // object would re-run every render and wipe user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, selectedDate, defaultRole, form.setValues]);

  const toggleRole = (role: string) => {
    const current = form.values.roles;
    if (current.includes(role)) {
      if (current.length > 1) {
        form.setFieldValue(
          'roles',
          current.filter((r) => r !== role),
        );
      }
    } else {
      form.setFieldValue('roles', [...current, role]);
    }
  };

  const handleAddSlot = async () => {
    if (!selectedDate) return;

    try {
      await createAvailability.mutateAsync({
        realmId,
        date: dayjs(selectedDate).startOf('day').toISOString(),
        startTime: form.values.startTime,
        endTime: form.values.endTime,
        type: form.values.type,
        roles: form.values.roles,
        note: form.values.note || undefined,
      });
      notifications.show({
        title: t('availability.created'),
        message: t('availability.createdSuccess'),
        color: 'green',
      });
      form.setValues({
        type: 'M+',
        startTime: '20:00',
        endTime: '23:00',
        roles: [defaultRole || 'DPS'],
        note: '',
      });
    } catch (error) {
      console.error('Error creating availability:', error);
      notifications.show({
        title: t('messages.error'),
        message: getErrorMessage(error),
        color: 'red',
      });
    }
  };

  const handleUpdateSlot = async (id: number, data: any) => {
    try {
      await updateAvailability.mutateAsync({
        id,
        realmId,
        payload: data,
      });
      notifications.show({
        title: t('availability.updated'),
        message: t('availability.updatedSuccess'),
        color: 'green',
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      notifications.show({
        title: t('messages.error'),
        message: getErrorMessage(error),
        color: 'red',
      });
    }
  };

  const handleDeleteSlot = async (id: number) => {
    try {
      await deleteAvailability.mutateAsync({ id, realmId });
      notifications.show({
        title: t('availability.deleted'),
        message: t('availability.deletedSuccess'),
        color: 'green',
      });
    } catch (error) {
      console.error('Error deleting availability:', error);
      notifications.show({
        title: t('messages.error'),
        message: getErrorMessage(error),
        color: 'red',
      });
    }
  };

  const dateLabel = selectedDate ? dayjs(selectedDate).format('dddd D MMMM YYYY') : '';

  return (
    <Modal opened={opened} onClose={onClose} title={dateLabel} size="lg">
      <Stack gap="md">
        {dayAvailabilities.length > 0 && (
          <>
            <Text size="sm" fw={600}>
              {t('availability.existingSlots', {
                defaultValue: 'Créneaux existants ({{count}})',
                count: dayAvailabilities.length,
              })}
            </Text>
            <Stack gap="xs">
              {dayAvailabilities.map((avail) => (
                <SlotCard
                  key={avail.id}
                  avail={avail}
                  onUpdate={handleUpdateSlot}
                  onDelete={handleDeleteSlot}
                  isUpdating={updateAvailability.isPending}
                  isDeleting={deleteAvailability.isPending}
                  t={t}
                />
              ))}
            </Stack>
            <Divider />
          </>
        )}

        <Text size="sm" fw={600}>
          {t('availability.addSlot', { defaultValue: 'Ajouter un créneau' })}
        </Text>

        <SegmentedControl
          fullWidth
          data={[
            { label: t('availability.typeM0'), value: 'M0' },
            { label: t('availability.typeMPlus'), value: 'M+' },
          ]}
          value={form.values.type}
          onChange={(value) => form.setFieldValue('type', value as 'M0' | 'M+')}
        />

        <Group grow>
          <TimePicker
            label={t('availability.startTime')}
            withDropdown
            value={form.values.startTime}
            onChange={(val) => {
              form.setFieldValue('startTime', val);
              if (form.values.startTime === '') setStartDropdownOpened(false);
            }}
            error={form.errors.startTime}
            onClick={() => setStartDropdownOpened(true)}
            popoverProps={{
              opened: startDropdownOpened,
              onChange: (_opened) => !_opened && setStartDropdownOpened(false),
            }}
          />
          <TimePicker
            label={t('availability.endTime')}
            withDropdown
            value={form.values.endTime}
            onChange={(val) => {
              form.setFieldValue('endTime', val);
              if (form.values.endTime === '') setEndDropdownOpened(false);
            }}
            error={form.errors.endTime}
            onClick={() => setEndDropdownOpened(true)}
            popoverProps={{
              opened: endDropdownOpened,
              onChange: (_opened) => !_opened && setEndDropdownOpened(false),
            }}
          />
        </Group>

        <div>
          <Text size="sm" fw={500} mb={4}>
            {t('availability.roles', { defaultValue: 'Rôles disponibles' })}
          </Text>
          <Group gap="md">
            <Checkbox
              label="Tank"
              checked={form.values.roles.includes('TANK')}
              onChange={() => toggleRole('TANK')}
            />
            <Checkbox
              label="Heal"
              checked={form.values.roles.includes('HEALER')}
              onChange={() => toggleRole('HEALER')}
            />
            <Checkbox
              label="DPS"
              checked={form.values.roles.includes('DPS')}
              onChange={() => toggleRole('DPS')}
            />
          </Group>
          {myCharacter && (
            <Text size="xs" c="dimmed" mt={4}>
              {t('availability.defaultRole', {
                defaultValue: 'Par défaut depuis votre spé : {{role}}',
                role: defaultRole,
              })}
            </Text>
          )}
        </div>

        <Textarea
          label={t('availability.note')}
          placeholder={t('availability.notePlaceholder')}
          {...form.getInputProps('note')}
          minRows={2}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose}>
            {t('actions.close')}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleAddSlot}
            loading={createAvailability.isPending}
          >
            {t('availability.addSlot', { defaultValue: 'Ajouter un créneau' })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
