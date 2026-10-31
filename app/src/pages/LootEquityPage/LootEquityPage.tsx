import {
  Alert,
  Badge,
  Box,
  Container,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Switch,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronRight,
  IconScale,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';
import { SimMetricBadge } from 'components/domain/droptimizer/SimMetricBadge';
import { useAuth, useRealmAccess } from 'contexts';
import { useLootEquity, useUserRealm } from 'hooks/queries';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Permission } from 'types/permissions';

import { PlayerLootItemsRow } from './components/PlayerLootItemsRow';
import type { EquitySortKey, RoleFilter, SortDir } from './lootEquity/lootEquity';
import {
  filterAndSortPlayers,
  formatGain,
  formatPercent,
  itemsPerRaid,
  RAID_ROLES,
  toLocalIsoDate,
} from './lootEquity/lootEquity';

const DEFAULT_RANGE_DAYS = 90;
const COLUMNS = 7;

type DateRangeValue = [string | null, string | null];

function defaultDateRange(): DateRangeValue {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - DEFAULT_RANGE_DAYS);
  return [toLocalIsoDate(start), toLocalIsoDate(end)];
}

/**
 * Tableau d'équité du loot (SIMS-201), réservé aux officiers et en lecture
 * seule : le vote se fait dans l'addon RCLootCouncil.
 */
const LootEquityPage: React.FC = () => {
  const { t } = useTranslation('lootEquity');
  const { user } = useAuth();
  const { hasPermission } = useRealmAccess();
  const { data: realmData, isLoading: realmLoading } = useUserRealm(
    user?.id ? String(user.id) : null,
  );
  const canView = hasPermission(Permission.ASSIGN_LOOT);

  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultDateRange());
  const [includeOptional, setIncludeOptional] = useState(false);
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [sortKey, setSortKey] = useState<EquitySortKey>('itemsReceived');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filters = useMemo(() => {
    if (!realmData?.id || !dateRange[0] || !dateRange[1]) return null;
    return {
      realmId: realmData.id,
      startDate: dateRange[0],
      endDate: dateRange[1],
      includeOptional,
    };
  }, [realmData?.id, dateRange, includeOptional]);

  const { data, isLoading, error } = useLootEquity(filters, canView);

  const players = useMemo(
    () => filterAndSortPlayers(data?.players ?? [], role, sortKey, sortDir),
    [data?.players, role, sortKey, sortDir],
  );
  const itemsCount = players.reduce((sum, p) => sum + p.itemsReceived, 0);

  const handleSort = (key: EquitySortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const SortHeader = ({ label, k, hint }: { label: string; k: EquitySortKey; hint?: string }) => {
    const active = sortKey === k;
    const Icon = !active
      ? IconArrowsSort
      : sortDir === 'asc'
        ? IconSortAscending
        : IconSortDescending;
    const button = (
      <UnstyledButton onClick={() => handleSort(k)} style={{ display: 'inline-flex', gap: 4 }}>
        <Text fw={600} size="sm">
          {label}
        </Text>
        <Icon size={14} />
      </UnstyledButton>
    );
    return hint ? (
      <Tooltip label={hint} multiline w={280}>
        {button}
      </Tooltip>
    ) : (
      button
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

  if (!canView) {
    return (
      <Container py="xl">
        <Alert color="yellow" title={t('access_denied_title')}>
          {t('access_denied')}
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
            gradient={{ from: 'grape', to: 'violet' }}
            radius="md"
          >
            <IconScale size={28} />
          </ThemeIcon>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {t('header.kicker')}
            </Text>
            <Title order={2}>{t('header.title')}</Title>
            <Text size="sm" c="dimmed">
              {t('header.subtitle')}
            </Text>
          </div>
        </Group>

        <Paper p="md" withBorder radius="md">
          <Group align="end" wrap="wrap" gap="md">
            <DatePickerInput
              type="range"
              label={t('filters.date_range')}
              value={dateRange}
              onChange={(v) => setDateRange(v as DateRangeValue)}
              clearable={false}
              w={320}
            />
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                {t('filters.role')}
              </Text>
              <SegmentedControl
                value={role}
                onChange={(v) => setRole(v as RoleFilter)}
                data={(['ALL', ...RAID_ROLES] as RoleFilter[]).map((r) => ({
                  value: r,
                  label: t(`roles.${r}`),
                }))}
              />
            </Stack>
            <Switch
              label={t('filters.include_optional')}
              checked={includeOptional}
              onChange={(e) => setIncludeOptional(e.currentTarget.checked)}
            />
          </Group>
        </Paper>

        {data && (
          <Group gap="xs">
            <Badge variant="light" color="cyan">
              {t('stats.events', { count: data.eventsCount })}
            </Badge>
            <Badge variant="light" color="grape">
              {t('stats.players', { count: players.length })}
            </Badge>
            <Badge variant="light" color="violet">
              {t('stats.items', { count: itemsCount })}
            </Badge>
          </Group>
        )}

        {error && (
          <Alert color="red" title={t('error.title')}>
            {(error as Error).message}
          </Alert>
        )}

        <Paper withBorder radius="md">
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <SortHeader label={t('columns.player')} k="name" />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader label={t('columns.items')} k="itemsReceived" />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader
                      label={t('columns.items_per_raid')}
                      k="itemsPerRaid"
                      hint={t('hints.items_per_raid')}
                    />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader
                      label={t('columns.average_gain')}
                      k="averageGainPercent"
                      hint={t('hints.gain')}
                    />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader
                      label={t('columns.cumulative_gain')}
                      k="cumulativeGainPercent"
                      hint={t('hints.gain')}
                    />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader label={t('columns.bis')} k="bisFillRate" hint={t('hints.bis')} />
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>
                    <SortHeader label={t('columns.presence')} k="presenceRate" />
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading && (
                  <Table.Tr>
                    <Table.Td colSpan={COLUMNS}>
                      <Group justify="center" py="lg">
                        <Loader size="sm" />
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )}
                {!isLoading && players.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={COLUMNS}>
                      <Text ta="center" c="dimmed" py="lg">
                        {t('empty')}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {players.map((p) => {
                  const isExpanded = expandedId === p.characterId;
                  const perRaid = itemsPerRaid(p);
                  return (
                    <React.Fragment key={p.characterId}>
                      <Table.Tr
                        onClick={() =>
                          setExpandedId((cur) => (cur === p.characterId ? null : p.characterId))
                        }
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
                            <Badge size="xs" variant="outline" color="gray">
                              {t(`roles.${p.role}`)}
                            </Badge>
                            {p.spec && (
                              <Text size="xs" c="dimmed">
                                {p.spec}
                              </Text>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>{p.itemsReceived}</Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          {perRaid === null ? '—' : perRaid.toFixed(2)}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Group gap={4} justify="flex-end" wrap="nowrap">
                            <Text size="sm">{formatGain(p.averageGainPercent)}</Text>
                            {/* % de HPS (QE Live), SIMS-202. */}
                            <SimMetricBadge metric={p.gainMetric} />
                          </Group>
                          {p.itemsReceived > 0 && (
                            <Text size="xs" c="dimmed">
                              {t('known_gains', {
                                known: p.knownGainCount,
                                total: p.itemsReceived,
                              })}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          {formatGain(p.cumulativeGainPercent)}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm">{formatPercent(p.bisFillRate)}</Text>
                          {p.bisTotal > 0 && (
                            <Text size="xs" c="dimmed">
                              {t('ratio', { value: p.bisObtained, total: p.bisTotal })}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm">{formatPercent(p.presenceRate)}</Text>
                          {p.totalRaids > 0 && (
                            <Text size="xs" c="dimmed">
                              {t('ratio', { value: p.present, total: p.totalRaids })}
                            </Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                      {isExpanded && <PlayerLootItemsRow items={p.items} colSpan={COLUMNS} />}
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

export default LootEquityPage;
