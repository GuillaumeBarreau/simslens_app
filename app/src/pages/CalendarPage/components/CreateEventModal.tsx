import {
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { TimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { isFeatureEnabled } from 'config/featureFlags';
import dayjs from 'dayjs';
import {
  useCreateEvent,
  useCreateEventSeries,
  useDeleteEvent,
  useDeleteEventSeries,
  useEvents,
  useUpdateEvent,
  useUpdateEventSeries,
} from 'hooks/queries';
import { useRaids } from 'hooks/queries';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RaidEvent } from 'services/event.service';
import type { RaidWithDifficulties } from 'types/raid';

import {
  buildSeriesPayload,
  buildSeriesUpdatePayload,
  DEFAULT_WEEKS_AHEAD,
  isSeriesOccurrence,
  MAX_WEEKS_AHEAD,
  occurrenceDateOf,
  type SeriesScope,
} from '../eventSeries';

interface CreateEventModalProps {
  opened: boolean;
  onClose: () => void;
  realmId: number;
  selectedDate?: Date | null;
  event?: RaidEvent | null;
}

import { useRouteParams } from 'hooks/useRouteParams';

export default function CreateEventModal({
  opened,
  onClose,
  realmId,
  selectedDate,
  event,
}: CreateEventModalProps) {
  const { t } = useTranslation('calendar');
  const { extension } = useRouteParams();
  const { data: raids = [] } = useRaids(extension);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const createSeries = useCreateEventSeries();
  const updateSeries = useUpdateEventSeries();
  const deleteSeries = useDeleteEventSeries();
  // Raids récurrents générés par le serveur (SIMS-200) ; sinon, l'ancienne
  // répétition sur le mois en cours, créée depuis le navigateur.
  const seriesEnabled = isFeatureEnabled('event-series');
  const editsSeries = seriesEnabled && isSeriesOccurrence(event);
  const [scope, setScope] = useState<SeriesScope>('occurrence');
  const [selectedRaidId, setSelectedRaidId] = useState<number | null>(null);
  const [startDropdownOpened, setStartDropdownOpened] = useState(false);
  const [endDropdownOpened, setEndDropdownOpened] = useState(false);

  const getDefaultDate = () => {
    return selectedDate ? dayjs(selectedDate) : dayjs();
  };

  const eventDate = getDefaultDate();
  const eventFilters = useMemo(() => {
    const startDate = eventDate.startOf('day').toISOString();
    const endDate = eventDate.endOf('day').toISOString();

    return {
      realmId: realmId || 0,
      startDate,
      endDate,
      status: 'SCHEDULED' as const,
    };
  }, [realmId, eventDate]);

  const { data: existingEvents = [] } = useEvents(eventFilters);

  const form = useForm({
    initialValues: {
      title: event?.title || '',
      description: event?.description || '',
      startTime: event ? dayjs(event.startTime).format('HH:mm') : '20:00',
      endTime: event ? dayjs(event.endTime).format('HH:mm') : '23:59',
      raidDifficultyId: event?.raidDifficultyId?.toString() || '',
      repeatWeekly: false,
      weeksAhead: DEFAULT_WEEKS_AHEAD,
      isOptional: event?.isOptional || false,
      defaultPresent: false,
      signupLockDisabled: event?.signupLockDisabled || false,
    },
    validate: {
      title: (value) => (!value ? t('form.required') : null),
      startTime: (value) => (!value ? t('form.required') : null),
      endTime: (value, values) => {
        if (!value) return t('form.required');
        if (value === '00:00') return t('form.endTimeMidnight');
        if (value <= values.startTime) return t('form.endTimeAfterStart');
        return null;
      },
    },
  });

  React.useEffect(() => {
    if (opened) {
      setScope('occurrence');
      if (event) {
        form.setValues({
          title: event.title,
          description: event.description || '',
          startTime: dayjs(event.startTime).format('HH:mm'),
          endTime: dayjs(event.endTime).format('HH:mm'),
          raidDifficultyId: event.raidDifficultyId?.toString() || '',
          repeatWeekly: false,
          weeksAhead: DEFAULT_WEEKS_AHEAD,
          isOptional: event.isOptional || false,
          signupLockDisabled: event.signupLockDisabled || false,
        });

        if (event.raid_difficulty?.raid?.id) {
          setSelectedRaidId(event.raid_difficulty.raid.id);
        }
      } else {
        form.reset();
        setSelectedRaidId(null);
        form.setValues({
          title: '',
          description: '',
          startTime: '20:00',
          endTime: '23:59',
          raidDifficultyId: '',
          repeatWeekly: false,
          weeksAhead: DEFAULT_WEEKS_AHEAD,
          isOptional: false,
          defaultPresent: false,
          signupLockDisabled: false,
        });
      }
    }
    // Mantine's setValues/reset are stable (useCallback); depending on the whole
    // form object would re-run every render and wipe user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, event, form.setValues, form.reset]);

  const selectedRaidDifficulty = useMemo(() => {
    if (!selectedRaidId || !raids || !form.values.raidDifficultyId) return null;
    const raid = raids.find((r: RaidWithDifficulties) => r.id === selectedRaidId);
    if (!raid) return null;

    const difficulty = raid.raid_difficulties?.find(
      (d) => d.id === parseInt(form.values.raidDifficultyId, 10),
    );

    return difficulty ? { ...difficulty, raidName: raid.name } : null;
  }, [selectedRaidId, form.values.raidDifficultyId, raids]);

  React.useEffect(() => {
    if (selectedRaidDifficulty?.raidName) {
      const difficultyName =
        selectedRaidDifficulty.difficulty_rel?.name || selectedRaidDifficulty.difficulty || '';

      const formattedDifficulty =
        difficultyName.charAt(0).toUpperCase() + difficultyName.slice(1).toLowerCase();

      let baseTitle = `${selectedRaidDifficulty.raidName} - ${formattedDifficulty}`;

      const similarEvents = existingEvents.filter((event) => {
        const eventBaseTitle = event.title.replace(/ #\d+$/, '');
        return eventBaseTitle === baseTitle;
      });

      if (similarEvents.length > 0) {
        const nextNumber = similarEvents.length + 1;
        baseTitle = `${baseTitle} #${nextNumber}`;
      }

      if (form.values.title !== baseTitle) {
        form.setFieldValue('title', baseTitle);
      }
    } else if (!form.values.raidDifficultyId && form.values.title !== '') {
      form.setFieldValue('title', '');
    }
  }, [selectedRaidDifficulty, existingEvents]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRaid = raids?.find((r: RaidWithDifficulties) => r.id === selectedRaidId);
  const difficulties = selectedRaid?.raid_difficulties || [];

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (event?.seriesId && editsSeries && scope === 'following') {
        const result = await updateSeries.mutateAsync({
          seriesId: event.seriesId,
          realmId,
          payload: buildSeriesUpdatePayload(event, values),
        });
        notifications.show({
          title: t('series.updated'),
          message: t('series.updatedMessage', { count: result.events }),
          color: 'green',
        });
        form.reset();
        onClose();
        return;
      }

      if (!event && values.repeatWeekly && seriesEnabled) {
        const result = await createSeries.mutateAsync(
          buildSeriesPayload(values, getDefaultDate(), realmId),
        );
        notifications.show({
          title: t('series.created'),
          message: t('series.createdMessage', { count: result.events }),
          color: 'green',
        });
        form.reset();
        onClose();
        return;
      }

      const eventDate = getDefaultDate();
      const [startHour, startMinute] = values.startTime.split(':');
      const [endHour, endMinute] = values.endTime.split(':');

      const startDateTime = eventDate
        .hour(parseInt(startHour))
        .minute(parseInt(startMinute))
        .second(0);

      const endDateTime = eventDate.hour(parseInt(endHour)).minute(parseInt(endMinute)).second(0);

      const eventsToCreate = [];

      if (values.repeatWeekly) {
        const weekday = eventDate.day();
        const monthStart = eventDate.startOf('month');
        const monthEnd = eventDate.endOf('month');

        const firstOccurrence =
          monthStart.day() <= weekday
            ? monthStart.day(weekday)
            : monthStart.add(1, 'week').day(weekday);

        const weeksInMonth = Math.floor(monthEnd.diff(firstOccurrence, 'day') / 7) + 1;

        Array.from({ length: weeksInMonth }, (_, weekIndex) => {
          const currentDate = firstOccurrence.add(weekIndex, 'week');

          if (currentDate.isSame(monthEnd, 'month')) {
            const eventStart = currentDate
              .hour(parseInt(startHour))
              .minute(parseInt(startMinute))
              .second(0);

            const eventEnd = currentDate
              .hour(parseInt(endHour))
              .minute(parseInt(endMinute))
              .second(0);

            eventsToCreate.push({
              title: values.title,
              description: values.description || undefined,
              startTime: eventStart.toISOString(),
              endTime: eventEnd.toISOString(),
              raidDifficultyId: values.raidDifficultyId
                ? parseInt(values.raidDifficultyId)
                : undefined,
              realmId,
              isOptional: values.isOptional,
              defaultPresent: values.defaultPresent,
              signupLockDisabled: values.signupLockDisabled,
            });
          }
        });
      } else {
        eventsToCreate.push({
          title: values.title,
          description: values.description || undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          raidDifficultyId: values.raidDifficultyId ? parseInt(values.raidDifficultyId) : undefined,
          realmId,
          isOptional: values.isOptional,
          defaultPresent: values.defaultPresent,
          signupLockDisabled: values.signupLockDisabled,
        });
      }

      if (event) {
        const eventStart = dayjs(event.startTime)
          .hour(parseInt(startHour))
          .minute(parseInt(startMinute))
          .second(0);

        const eventEnd = dayjs(event.startTime)
          .hour(parseInt(endHour))
          .minute(parseInt(endMinute))
          .second(0);

        await updateEvent.mutateAsync({
          id: event.id,
          realmId,
          payload: {
            title: values.title,
            description: values.description || undefined,
            startTime: eventStart.toISOString(),
            endTime: eventEnd.toISOString(),
            raidDifficultyId: values.raidDifficultyId
              ? parseInt(values.raidDifficultyId)
              : undefined,
            isOptional: values.isOptional,
            signupLockDisabled: values.signupLockDisabled,
          },
        });

        notifications.show({
          title: t('messages.eventUpdated'),
          message: t('messages.eventUpdatedSuccess'),
          color: 'green',
        });
      } else {
        for (const eventData of eventsToCreate) {
          await createEvent.mutateAsync(eventData);
        }

        notifications.show({
          title: t('messages.eventCreated'),
          message: values.repeatWeekly
            ? `${eventsToCreate.length} ${t('messages.eventsCreated')}`
            : values.title,
          color: 'green',
        });
      }

      form.reset();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      const failure = error as { response?: { data?: { message?: string } }; message?: string };
      notifications.show({
        title: t('messages.error'),
        message: failure?.response?.data?.message || failure?.message || String(error),
        color: 'red',
      });
    }
  };
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={event ? t('editEvent') : t('createEvent')}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {selectedDate && (
            <Box>
              <Text size="sm" fw={500} mb={4}>
                {t('eventDate')}
              </Text>
              <Text size="lg" fw={600} c="brand.5">
                {dayjs(selectedDate).format('dddd, MMMM D, YYYY')}
              </Text>
            </Box>
          )}

          <TextInput
            label={t('eventTitle')}
            placeholder={t('form.titlePlaceholder')}
            required
            readOnly
            description={t('form.titleAuto')}
            {...form.getInputProps('title')}
          />

          <Textarea
            label={t('eventDescription')}
            placeholder={t('form.descriptionPlaceholder')}
            minRows={3}
            {...form.getInputProps('description')}
          />

          <Group grow>
            <TimePicker
              label={t('startTime')}
              withDropdown
              required
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
              label={t('endTime')}
              withDropdown
              required
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

          <Select
            label={t('raid')}
            placeholder={t('form.selectRaid')}
            data={
              raids?.map((raid: RaidWithDifficulties) => ({
                value: raid.id.toString(),
                label: raid.name,
              })) || []
            }
            searchable
            value={selectedRaidId ? selectedRaidId.toString() : null}
            onChange={(value) => {
              setSelectedRaidId(value ? parseInt(value) : null);
              form.setFieldValue('raidDifficultyId', '');
            }}
          />

          {selectedRaidId && difficulties.length > 0 && (
            <Select
              label={t('difficulty')}
              placeholder={t('form.selectDifficulty')}
              data={difficulties.map((diff) => ({
                value: diff.id.toString(),
                label: diff.difficulty,
              }))}
              {...form.getInputProps('raidDifficultyId')}
              searchable
            />
          )}

          {editsSeries && (
            <Box>
              <Text size="sm" fw={500} mb={4}>
                {t('series.scope')}
              </Text>
              <SegmentedControl
                fullWidth
                value={scope}
                onChange={(value) => setScope(value as SeriesScope)}
                data={[
                  { value: 'occurrence', label: t('series.scopeOccurrence') },
                  { value: 'following', label: t('series.scopeFollowing') },
                ]}
              />
            </Box>
          )}

          {!event && (
            <Checkbox
              label={seriesEnabled ? t('series.repeat') : t('form.repeatWeekday')}
              description={seriesEnabled ? t('series.repeatHelp') : t('form.repeatWeekdayHelp')}
              {...form.getInputProps('repeatWeekly', { type: 'checkbox' })}
            />
          )}

          {!event && seriesEnabled && form.values.repeatWeekly && (
            <NumberInput
              label={t('series.weeksAhead')}
              description={t('series.weeksAheadHelp')}
              min={1}
              max={MAX_WEEKS_AHEAD}
              clampBehavior="strict"
              allowDecimal={false}
              {...form.getInputProps('weeksAhead')}
            />
          )}

          <Checkbox
            label={t('form.isOptional')}
            description={t('form.isOptionalHelp')}
            {...form.getInputProps('isOptional', { type: 'checkbox' })}
          />

          <Checkbox
            label={t('form.signupLockDisabled')}
            description={t('form.signupLockDisabledHelp')}
            {...form.getInputProps('signupLockDisabled', { type: 'checkbox' })}
          />

          {!event && (
            <Checkbox
              label={t('form.defaultPresent', { defaultValue: 'Tous présents par défaut' })}
              description={t('form.defaultPresentHelp', {
                defaultValue: "Tous les membres du roster sont automatiquement en statut 'Présent.",
              })}
              {...form.getInputProps('defaultPresent', { type: 'checkbox' })}
            />
          )}

          <Group justify="space-between" mt="md">
            {event ? (
              <Button
                variant="subtle"
                color="red"
                onClick={() => {
                  if (event.seriesId && editsSeries && scope === 'following') {
                    if (!window.confirm(t('series.confirmDelete'))) return;
                    deleteSeries.mutate(
                      { seriesId: event.seriesId, realmId, fromDate: occurrenceDateOf(event) },
                      {
                        onSuccess: (result) => {
                          notifications.show({
                            title: t('series.deleted'),
                            message: t('series.deletedMessage', { count: result.events }),
                            color: 'blue',
                          });
                          onClose();
                        },
                        onError: (error) => {
                          notifications.show({
                            title: t('messages.error'),
                            message: String(error),
                            color: 'red',
                          });
                        },
                      },
                    );
                    return;
                  }
                  if (
                    window.confirm(
                      t('messages.confirmDelete', {
                        defaultValue: 'Are you sure you want to delete this event?',
                      }),
                    )
                  ) {
                    deleteEvent.mutate(
                      { id: event.id, realmId },
                      {
                        onSuccess: () => {
                          notifications.show({
                            title: t('messages.eventDeleted', { defaultValue: 'Event Deleted' }),
                            message: t('messages.eventDeletedSuccess', {
                              defaultValue: 'The event has been successfully deleted.',
                            }),
                            color: 'blue',
                          });
                          onClose();
                        },
                        onError: (error) => {
                          notifications.show({
                            title: t('messages.error'),
                            message: String(error),
                            color: 'red',
                          });
                        },
                      },
                    );
                  }
                }}
                loading={deleteEvent.isPending || deleteSeries.isPending}
              >
                {t('actions.delete', { defaultValue: 'Delete' })}
              </Button>
            ) : (
              <div />
            )}
            <Group>
              <Button variant="subtle" onClick={onClose}>
                {t('actions.cancel')}
              </Button>
              <Button
                type="submit"
                loading={
                  event
                    ? updateEvent.isPending || updateSeries.isPending
                    : createEvent.isPending || createSeries.isPending
                }
              >
                {event ? t('actions.update') : t('actions.save')}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
