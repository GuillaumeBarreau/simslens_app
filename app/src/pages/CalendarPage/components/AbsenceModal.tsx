import { Button, Group, Modal, Stack, Switch, Text, Textarea } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useCreateAbsence, useDeleteAbsence, useUpdateAbsence } from 'hooks/queries';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MemberAbsence } from 'services/absence.service';

interface AbsenceModalProps {
  opened: boolean;
  onClose: () => void;
  realmId: number;
  absence?: MemberAbsence | null;
  selectedDate?: Date | null;
}

export default function AbsenceModal({
  opened,
  onClose,
  realmId,
  absence,
  selectedDate,
}: AbsenceModalProps) {
  const { t } = useTranslation('calendar');
  const createAbsence = useCreateAbsence();
  const updateAbsence = useUpdateAbsence();
  const deleteAbsence = useDeleteAbsence();

  const [isRange, setIsRange] = React.useState(false);

  const form = useForm({
    initialValues: {
      dates: [selectedDate || new Date(), selectedDate || new Date()] as [Date | null, Date | null],
      reason: '',
    },
    validate: {
      dates: (value) => {
        if (!value[0]) return t('form.required');
        if (isRange && !value[1]) return t('form.endDateRequired');
        return null;
      },
    },
  });

  React.useEffect(() => {
    if (absence) {
      const start = new Date(absence.startDate);
      const end = new Date(absence.endDate);
      const isSingleDay = dayjs(start).isSame(end, 'day');

      setIsRange(!isSingleDay);
      form.setValues({
        dates: [start, isSingleDay ? null : end],
        reason: absence.reason || '',
      });
    } else if (selectedDate) {
      form.setValues({
        dates: [selectedDate, null],
        reason: '',
      });
    }
  }, [absence, selectedDate]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const startDate = values.dates[0]!;
      const endDate = isRange && values.dates[1] ? values.dates[1] : startDate;

      if (absence) {
        await updateAbsence.mutateAsync({
          id: absence.id,
          realmId,
          payload: {
            startDate: dayjs(startDate).startOf('day').toISOString(),
            endDate: dayjs(endDate).endOf('day').toISOString(),
            reason: values.reason || undefined,
          },
        });

        notifications.show({
          title: t('absence.updated'),
          message: t('absence.updatedSuccess'),
          color: 'green',
        });
      } else {
        await createAbsence.mutateAsync({
          realmId,
          startDate: dayjs(startDate).startOf('day').toISOString(),
          endDate: dayjs(endDate).endOf('day').toISOString(),
          reason: values.reason || undefined,
        });

        notifications.show({
          title: t('absence.created'),
          message: t('absence.createdSuccess'),
          color: 'green',
        });
      }

      form.reset();
      onClose();
    } catch (error: any) {
      console.error('Error saving absence:', error);
      notifications.show({
        title: t('messages.error'),
        message: error?.response?.data?.message || error?.message || String(error),
        color: 'red',
      });
    }
  };

  const handleDelete = async () => {
    if (!absence) return;

    try {
      await deleteAbsence.mutateAsync({
        id: absence.id,
        realmId,
      });

      notifications.show({
        title: t('absence.deleted'),
        message: t('absence.deletedSuccess'),
        color: 'green',
      });

      form.reset();
      onClose();
    } catch (error: any) {
      console.error('Error deleting absence:', error);
      notifications.show({
        title: t('messages.error'),
        message: error?.response?.data?.message || error?.message || String(error),
        color: 'red',
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={absence ? t('absence.editTitle') : t('absence.createTitle')}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('absence.description')}
          </Text>

          <Switch
            label={t('absence.dateRange')}
            checked={isRange}
            onChange={(e) => setIsRange(e.currentTarget.checked)}
          />

          {isRange ? (
            <DatePickerInput
              type="range"
              label={t('absence.dateRangeLabel')}
              placeholder={t('absence.selectDates')}
              value={form.values.dates}
              onChange={(value) => form.setFieldValue('dates', value as [Date | null, Date | null])}
              minDate={new Date()}
              clearable
              required
            />
          ) : (
            <DatePickerInput
              type="default"
              label={t('absence.dateLabel')}
              placeholder={t('absence.selectDate')}
              value={form.values.dates[0]}
              onChange={(value) => form.setFieldValue('dates', [value as Date | null, null])}
              minDate={new Date()}
              clearable
              required
            />
          )}

          <Textarea
            label={t('absence.reason')}
            placeholder={t('absence.reasonPlaceholder')}
            {...form.getInputProps('reason')}
            minRows={2}
          />

          <Text size="xs" c="dimmed">
            {t('absence.autoAbsentNote')}
          </Text>

          <Group justify="space-between" mt="md">
            {absence ? (
              <Button
                variant="subtle"
                color="red"
                onClick={handleDelete}
                loading={deleteAbsence.isPending}
              >
                {t('actions.delete')}
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
                loading={absence ? updateAbsence.isPending : createAbsence.isPending}
              >
                {absence ? t('actions.update') : t('actions.save')}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
