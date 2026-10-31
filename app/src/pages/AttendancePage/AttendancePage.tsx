import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Progress,
  ScrollArea,
  Stack,
  Switch,
  Table,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconArrowsSort,
  IconCalendarStats,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';
import { useAuth, useRealmAccess } from 'contexts';
import { useAttendance, useUserRealm } from 'hooks/queries';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Permission } from 'types/permissions';

import type { AttendancePlayer } from '../../services/attendance.service';
import { PlayerEventsRow } from './components/PlayerEventsRow';

type SortKey = keyof Pick<
  AttendancePlayer,
  'name' | 'present' | 'absent' | 'totalRaids' | 'presenceRate' | 'bossAssignments'
>;
type SortDir = 'asc' | 'desc';

const DEFAULT_RANGE_DAYS = 30;

type DateRangeValue = [string | null, string | null];

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultDateRange(): DateRangeValue {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - DEFAULT_RANGE_DAYS);
  return [toIsoDate(start), toIsoDate(end)];
}

function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function toCsv(players: AttendancePlayer[]): string {
  const header = [
    'Player',
    'Class',
    'Spec',
    'Total raids',
    'Present',
    'Absent',
    'Pending',
    'Boss assignments',
    'Presence rate',
  ];
  const rows = players.map((p) => [
    p.name,
    p.class ?? '',
    p.spec ?? '',
    p.totalRaids,
    p.present,
    p.absent,
    p.pending,
    p.bossAssignments,
    formatPercent(p.presenceRate),
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const AttendancePage: React.FC = () => {
  const { t } = useTranslation('attendance');
  const { user } = useAuth();
  const { hasPermission } = useRealmAccess();
  const { data: realmData, isLoading: realmLoading } = useUserRealm(
    user?.id ? String(user.id) : null,
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultDateRange());
  const [includeOptional, setIncludeOptional] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('presenceRate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => setExpandedId((cur) => (cur === id ? null : id));

  const filters = useMemo(() => {
    if (!realmData?.id || !dateRange[0] || !dateRange[1]) return null;
    return {
      realmId: realmData.id,
      startDate: dateRange[0],
      endDate: dateRange[1],
      includeOptional,
    };
  }, [realmData?.id, dateRange, includeOptional]);

  const { data, isLoading, error } = useAttendance(filters);

  const sortedPlayers = useMemo<AttendancePlayer[]>(() => {
    if (!data?.players) return [];
    const copy = [...data.players];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return copy;
  }, [data?.players, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const handleExport = () => {
    if (!sortedPlayers.length) return;
    const start = dateRange[0] ?? '';
    const end = dateRange[1] ?? '';
    downloadCsv(`attendance-${start}_${end}.csv`, toCsv(sortedPlayers));
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => {
    const active = sortKey === k;
    const Icon = !active
      ? IconArrowsSort
      : sortDir === 'asc'
        ? IconSortAscending
        : IconSortDescending;
    return (
      <UnstyledButton onClick={() => handleSort(k)} style={{ display: 'inline-flex', gap: 4 }}>
        <Text fw={600} size="sm">
          {label}
        </Text>
        <Icon size={14} />
      </UnstyledButton>
    );
  };

  if (realmLoading) {
    return (
      <Box
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}
      >
        <Loader size="xl" />
      </Box>
    );
  }

  if (!hasPermission(Permission.MANAGE_SIGNUPS)) {
    return (
      <Container py="xl">
        <Alert color="yellow" title={t('access_denied_title', 'Access denied')}>
          {t('access_denied', "You don't have permission to view attendance.")}
        </Alert>
      </Container>
    );
  }

  return (
    <Container mt="xl" mb="xl" size="xl">
      <Stack gap="lg">
        <Group gap="md">
          <ThemeIcon
            size="xl"
            variant="gradient"
            gradient={{ from: 'teal', to: 'cyan' }}
            radius="md"
          >
            <IconCalendarStats size={28} />
          </ThemeIcon>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {t('header.kicker', 'Reports')}
            </Text>
            <Title order={2}>{t('header.title', 'Attendance')}</Title>
          </div>
        </Group>

        <Paper p="md" withBorder radius="md">
          <Group align="end" wrap="wrap" gap="md">
            <DatePickerInput
              type="range"
              label={t('filters.date_range', 'Date range')}
              value={dateRange}
              onChange={(v) => setDateRange(v as DateRangeValue)}
              clearable={false}
              w={320}
            />
            <Switch
              label={t('filters.include_optional', 'Include optional raids')}
              checked={includeOptional}
              onChange={(e) => setIncludeOptional(e.currentTarget.checked)}
            />
            <Box style={{ flex: 1 }} />
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              disabled={!sortedPlayers.length}
              onClick={handleExport}
            >
              {t('actions.export_csv', 'Export CSV')}
            </Button>
          </Group>
        </Paper>

        {data && (
          <Group gap="xs">
            <Badge variant="light" color="cyan">
              {t('stats.events', '{{count}} raid(s)', { count: data.eventsCount })}
            </Badge>
            <Badge variant="light" color="grape">
              {t('stats.players', '{{count}} player(s)', { count: data.players.length })}
            </Badge>
          </Group>
        )}

        {error && (
          <Alert color="red" title={t('error.title', 'Error')}>
            {(error as Error).message}
          </Alert>
        )}

        <Paper withBorder radius="md">
          <ScrollArea>
            <Table striped highlightOnHover withColumnBorders={false} verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <SortHeader label={t('columns.player', 'Player')} k="name" />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader label={t('columns.present', 'Present')} k="present" />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader label={t('columns.absent', 'Absent')} k="absent" />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader label={t('columns.total', 'Total')} k="totalRaids" />
                  </Table.Th>
                  <Table.Th style={{ minWidth: 180 }}>
                    <SortHeader label={t('columns.rate', '%')} k="presenceRate" />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader
                      label={t('columns.boss_assignments', 'Boss assignments')}
                      k="bossAssignments"
                    />
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Group justify="center" py="lg">
                        <Loader size="sm" />
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )}
                {!isLoading && sortedPlayers.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="lg">
                        {t('empty', 'No data for the selected period.')}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {sortedPlayers.map((p) => {
                  const isExpanded = expandedId === p.characterId;
                  return (
                    <React.Fragment key={p.characterId}>
                      <Table.Tr
                        onClick={() => toggleExpand(p.characterId)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            {isExpanded ? (
                              <IconChevronDown size={14} />
                            ) : (
                              <IconChevronRight size={14} />
                            )}
                            <Text fw={500}>{p.name}</Text>
                            {p.spec && (
                              <Text size="xs" c="dimmed">
                                {p.spec} {p.class}
                              </Text>
                            )}
                            {p.firstSeenAt &&
                              dateRange[0] &&
                              new Date(p.firstSeenAt) > new Date(dateRange[0]) && (
                                <Text size="xs" c="dimmed" fs="italic">
                                  {t('member_since', 'since {{date}}', {
                                    date: new Date(p.firstSeenAt).toLocaleDateString(),
                                  })}
                                </Text>
                              )}
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text c="teal">{p.present}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text c="red">{p.absent}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>{p.totalRaids}</Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Progress
                              value={p.presenceRate * 100}
                              color={
                                p.presenceRate >= 0.75
                                  ? 'teal'
                                  : p.presenceRate >= 0.5
                                    ? 'yellow'
                                    : 'red'
                              }
                              style={{ flex: 1 }}
                              size="sm"
                            />
                            <Text size="sm" w={42} ta="right">
                              {formatPercent(p.presenceRate)}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>{p.bossAssignments}</Table.Td>
                      </Table.Tr>
                      {isExpanded && (
                        <PlayerEventsRow
                          characterId={p.characterId}
                          filters={filters}
                          colSpan={6}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      </Stack>
    </Container>
  );
};

export default AttendancePage;
