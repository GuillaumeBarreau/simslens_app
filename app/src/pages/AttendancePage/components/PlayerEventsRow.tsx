import { Badge, Group, Loader, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconStar, IconSwords } from '@tabler/icons-react';
import { useCharacterAttendance } from 'hooks/queries';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type {
  AttendanceEventDetail,
  AttendanceFilters,
  SignupStatus,
} from '../../../services/attendance.service';

interface Props {
  characterId: number;
  filters: AttendanceFilters | null;
  colSpan: number;
}

const STATUS_COLOR: Record<string, string> = {
  PRESENT: 'teal',
  LATE: 'yellow',
  ABSENT: 'red',
  TENTATIVE: 'gray',
  BENCH: 'blue',
  NONE: 'dark',
};

function statusLabel(t: ReturnType<typeof useTranslation>['t'], status: SignupStatus | null) {
  if (!status) return t('status.no_signup', 'Not signed up');
  const map: Record<SignupStatus, string> = {
    PRESENT: t('status.present', 'Present'),
    LATE: t('status.late', 'Late'),
    ABSENT: t('status.absent', 'Absent'),
    TENTATIVE: t('status.tentative', 'Tentative'),
    BENCH: t('status.bench', 'Bench'),
  };
  return map[status];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export const PlayerEventsRow: React.FC<Props> = ({ characterId, filters, colSpan }) => {
  const { t } = useTranslation('attendance');
  const { data: events, isLoading, error } = useCharacterAttendance(characterId, filters);

  return (
    <Table.Tr>
      <Table.Td colSpan={colSpan} style={{ background: 'var(--mantine-color-dark-7)' }}>
        {isLoading && (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        )}

        {error && (
          <Text c="red" size="sm">
            {(error as Error).message}
          </Text>
        )}

        {!isLoading && !error && events && events.length === 0 && (
          <Text c="dimmed" size="sm" ta="center" py="md">
            {t('detail.empty', 'No raids in this period.')}
          </Text>
        )}

        {!isLoading && !error && events && events.length > 0 && (
          <Stack gap={4} py="xs" px="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">
              {t('detail.title', 'Raid history')}
            </Text>
            <Table verticalSpacing={4} highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('detail.date', 'Date')}</Table.Th>
                  <Table.Th>{t('detail.raid', 'Raid')}</Table.Th>
                  <Table.Th>{t('detail.status', 'Status')}</Table.Th>
                  <Table.Th>{t('detail.notes', 'Notes')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {events.map((e: AttendanceEventDetail) => {
                  const color = STATUS_COLOR[e.signupStatus ?? 'NONE'];
                  return (
                    <Table.Tr key={e.eventId}>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text size="sm">{formatDate(e.startTime)}</Text>
                          <Text size="xs" c="dimmed">
                            {formatTime(e.startTime)}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm">{e.title}</Text>
                          {e.isOptional && (
                            <Tooltip label={t('detail.optional', 'Optional raid')}>
                              <Badge size="xs" variant="light" color="gray">
                                {t('detail.opt', 'OPT')}
                              </Badge>
                            </Tooltip>
                          )}
                          {e.hasBossAssignment && (
                            <Tooltip label={t('detail.has_boss', 'Assigned to a boss')}>
                              <IconSwords size={14} color="var(--mantine-color-grape-4)" />
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={color} variant="light">
                          {statusLabel(t, e.signupStatus)}
                          {e.signupStatus === 'LATE' && e.lateTime ? ` · ${e.lateTime}` : ''}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {e.absenceReason ? (
                          <Text size="xs" c="dimmed">
                            {e.absenceReason}
                          </Text>
                        ) : (
                          <IconStar size={12} style={{ opacity: 0.2 }} />
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
      </Table.Td>
    </Table.Tr>
  );
};
