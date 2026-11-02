import { Alert, Box, Button, Container, Group, Stack, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronRight,
  IconHistory,
  IconRefresh,
  IconReportAnalytics,
} from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { TableSkeleton } from 'components/design-system/molecules/Skeleton';
import { GameCapabilityGuard } from 'components/GameCapabilityGuard';
import { isFeatureEnabled } from 'config/featureFlags';
import { useDifficulty } from 'contexts';
import { useAuth } from 'contexts/AuthContext';
import {
  useEnchantChecks,
  useGearSnapshots,
  useImportedLoots,
  useRefreshRoster,
  useTrackingRoster,
  useUserRealm,
} from 'hooks/queries';
import { useGame } from 'hooks/useGame';
import { useReportImport } from 'hooks/useReportImport';
import { useSimStaleAfterDays } from 'hooks/useSimStaleAfterDays';
import React, { useMemo, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import type { ImportedLootRow } from 'services/tracking.service';
import type { GearSnapshot } from 'types/character.types';
import { Permission } from 'types/permissions';
import { Can } from 'utils/auth';

import { formatTimestamp } from '../../utils';
import { TrackingSummary } from './components/TrackingSummary';
import { TrackingTable } from './components/TrackingTable';
import type { Character } from './components/TrackingTableRow';
import { TrackingFilters, TrackingViewSelector } from './components/TrackingToolbar';
import classes from './TrackingPage.module.css';
import { initState, reducer, type SortKey } from './TrackingPage.reducers';
import {
  countAnomalies,
  filterRoster,
  type GearAnomalyLevel,
  gearAnomalyLevel,
  readStoredView,
  SIM_MODES,
  stateSortValue,
  storeView,
  summarizeMode,
  type TrackingView,
} from './trackingStatus';

interface TrackingPageProps {
  onClose: () => void;
}

const EMPTY_ROSTER: Character[] = [];

function sortValue(c: Character, key: SortKey, view: TrackingView, staleAfterDays: number) {
  switch (key) {
    case 'name':
      return (c.name || '').toLowerCase();
    case 'spec':
      return (c.specialization?.name || '').toLowerCase();
    case 'ilvl':
      return Number(c.ilvl) || 0;
    case 'keys':
      return Number(c.currentPeriodKeyCount) || 0;
    case 'score':
      return Number(c.score) || 0;
    case 'report':
      return stateSortValue(c, view, staleAfterDays);
  }
}

const TrackingPage: React.FC<TrackingPageProps> = () => {
  const { t } = useTranslation('tracking');
  const { extension, guild } = useParams();
  const { difficulty } = useDifficulty();
  const { user, refetchUser } = useAuth();
  const { data: currentRealm } = useUserRealm(user?.id ? String(user.id) : null);
  const textReportID = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useReducer(reducer, undefined, () => initState(readStoredView()));
  const staleAfterDays = useSimStaleAfterDays();
  const { startImport, isSubmitting } = useReportImport({
    onSuccess: () => dispatch({ type: 'SET_INPUT_VALUE', payload: '' }),
  });
  const { sortKey, sortDir, inputValue, inputError, showGear } = state;
  // Sans Droptimizer (Forever), pas de vue par mode de sim : vue d'ensemble seulement.
  const hasSims = useGame().has('droptimizer');
  const view: TrackingView = hasSims ? state.view : 'overview';

  const realmId = currentRealm?.id;
  const { data: rosterData, isLoading, error: queryError } = useTrackingRoster(difficulty, realmId);
  const roster = Array.isArray(rosterData) ? (rosterData as unknown as Character[]) : EMPTY_ROSTER;
  const characterIds = useMemo(() => roster.map((c) => c.id), [roster]);

  const { data: lootRows } = useImportedLoots(realmId);
  const { data: gearSnapshots, isSuccess: gearBulkReady } = useGearSnapshots(characterIds);
  const { data: enchantChecks } = useEnchantChecks(characterIds);
  const refreshRoster = useRefreshRoster();

  const lootsByCharacter = useMemo(() => {
    const map: Record<number, ImportedLootRow[]> = {};
    for (const row of lootRows ?? []) {
      const id = Number(row.characterID) || 0;
      (map[id] ??= []).push(row);
    }
    return map;
  }, [lootRows]);

  const gearByCharacter = useMemo(() => {
    if (!gearSnapshots) return {};
    const out: Record<number, { snapshot: GearSnapshot } | null> = {};
    for (const id of characterIds) {
      out[id] = gearSnapshots[id] ? { snapshot: gearSnapshots[id] } : null;
    }
    return out;
  }, [gearSnapshots, characterIds]);

  const anomalyByCharacter = useMemo(() => {
    const out: Record<number, GearAnomalyLevel | null> = {};
    if (!enchantChecks) return out;
    for (const id of characterIds) out[id] = gearAnomalyLevel(enchantChecks[id]);
    return out;
  }, [enchantChecks, characterIds]);

  const anomalyCounts = useMemo(
    () => (enchantChecks ? countAnomalies(roster, anomalyByCharacter) : null),
    [enchantChecks, roster, anomalyByCharacter],
  );

  const summaries = useMemo(() => {
    const now = Date.now();
    return Object.fromEntries(
      SIM_MODES.map((mode) => [mode, summarizeMode(roster, mode, staleAfterDays, now)]),
    ) as Record<(typeof SIM_MODES)[number], ReturnType<typeof summarizeMode>>;
  }, [roster, staleAfterDays]);

  const sortedRoster = useMemo(() => {
    const filtered = filterRoster(
      roster,
      {
        view,
        state: state.stateFilter,
        todoOnly: state.todoOnly,
        search: state.search,
        anomaly: state.anomalyFilter,
      },
      staleAfterDays,
      anomalyByCharacter,
    );
    return filtered.sort((a, b) => {
      const va = sortValue(a, sortKey, view, staleAfterDays);
      const vb = sortValue(b, sortKey, view, staleAfterDays);
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
  }, [
    roster,
    view,
    state.stateFilter,
    state.todoOnly,
    state.search,
    state.anomalyFilter,
    staleAfterDays,
    anomalyByCharacter,
    sortKey,
    sortDir,
  ]);

  const lastGlobalUpdate = useMemo(() => {
    const timestamps = roster
      .map((c) => c.lastModified)
      .filter((value): value is number => typeof value === 'number');
    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  }, [roster]);

  const changeView = (next: TrackingView) => {
    storeView(next);
    dispatch({ type: 'SET_VIEW', payload: next });
  };

  const handleReportSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await startImport(inputValue);
    if (!result.ok) {
      dispatch({ type: 'SET_INPUT_ERROR', payload: result.error });
      textReportID.current?.focus();
      return;
    }
    dispatch({ type: 'SET_INPUT_ERROR', payload: null });
  };

  const handleUpdateRoster = async () => {
    if (!realmId) return;
    try {
      await refreshRoster.mutateAsync(realmId);
      await refetchUser();
      notifications.show({
        title: t('roster_update.success_title'),
        message: t('roster_update.success_message'),
        color: 'teal',
        autoClose: 5000,
      });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      notifications.show({
        position: 'bottom-center',
        title: t('roster_update.error_title'),
        message: axiosErr?.response?.data?.message || t('roster_update.error_default'),
        color: 'red',
        autoClose: 5000,
      });
    }
  };

  if (queryError) {
    return (
      <Box p="md">
        <Alert color="red" title={t('error.loading')}>
          {queryError.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Container my="xl" size="xl" className={classes.page}>
      <Stack gap="lg">
        <Box className={classes.panel} p="lg">
          <Group justify="space-between" align="flex-start" gap="md">
            <Stack gap={4} style={{ minWidth: 0 }}>
              <Text variant="section-label">{t('header.subtitle')}</Text>
              <Title order={2}>{t('header.title')}</Title>
              <Text size="sm" c="dimmed">
                {t('header.description')}
              </Text>
            </Stack>
            <Stack gap={6} align="flex-end">
              <Group gap="xs">
                <GameCapabilityGuard capability="mythicPlus">
                  <Button
                    component={Link}
                    to={`/${guild}/${extension}/keys-history`}
                    variant="subtle"
                    color="gray"
                    leftSection={<IconHistory size={16} stroke={1.5} />}
                    rightSection={<IconChevronRight size={14} />}
                  >
                    {t('header.keys_history')}
                  </Button>
                </GameCapabilityGuard>
                <Can I={Permission.EDIT_ROSTER}>
                  <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleUpdateRoster}
                    color="brand.5"
                    variant="light"
                    loading={refreshRoster.isPending}
                    disabled={!currentRealm}
                  >
                    {t('actions.refresh')}
                  </Button>
                </Can>
              </Group>
              {lastGlobalUpdate && (
                <Text size="xs" c="dimmed">
                  {t('header.last_updated', {
                    date: formatTimestamp(lastGlobalUpdate, { includeTime: true }),
                  })}
                </Text>
              )}
            </Stack>
          </Group>

          <Can I={Permission.EDIT_ROSTER}>
            {hasSims && (
              <form onSubmit={handleReportSubmit}>
                <Group gap="sm" mt="md" align="flex-start">
                  <TextInput
                    style={{ flex: '1 1 240px' }}
                    placeholder={t(
                      isFeatureEnabled('hps-sims')
                        ? 'import.placeholder_with_qe'
                        : 'import.placeholder',
                    )}
                    aria-label={t('import.button_default')}
                    value={inputValue}
                    onChange={(e) =>
                      dispatch({ type: 'SET_INPUT_VALUE', payload: e.currentTarget.value })
                    }
                    error={inputError}
                    ref={textReportID}
                    leftSection={<IconReportAnalytics size={16} stroke={1.5} />}
                  />
                  <Button
                    disabled={isSubmitting || !inputValue.trim()}
                    type="submit"
                    color="brand.5"
                  >
                    {isSubmitting ? t('import.button_importing') : t('import.button_default')}
                  </Button>
                </Group>
              </form>
            )}
          </Can>
        </Box>

        {hasSims && (
          <>
            <TrackingViewSelector view={view} onChange={changeView} />

            <TrackingSummary
              summaries={summaries}
              view={view}
              stateFilter={state.stateFilter}
              onSelectMode={changeView}
              onSelectState={(mode, simState) => {
                storeView(mode);
                dispatch({ type: 'TOGGLE_STATE_FILTER', payload: { mode, state: simState } });
              }}
            />
          </>
        )}

        <TrackingFilters
          state={state}
          anomalyCounts={anomalyCounts}
          visibleCount={sortedRoster.length}
          totalCount={roster.length}
          onSearch={(value) => dispatch({ type: 'SET_SEARCH', payload: value })}
          onTodoOnly={(value) => dispatch({ type: 'SET_TODO_ONLY', payload: value })}
          onAnomaly={(value) => dispatch({ type: 'SET_ANOMALY_FILTER', payload: value })}
          onShowGear={(value) => dispatch({ type: 'SET_SHOW_GEAR', payload: value })}
          onClearState={() => dispatch({ type: 'CLEAR_STATE_FILTER' })}
          onReset={() => dispatch({ type: 'RESET_FILTERS' })}
        />

        {isLoading ? (
          <TableSkeleton columns={7} rows={10} />
        ) : (
          <TrackingTable
            sortedRoster={sortedRoster}
            view={view}
            showGear={showGear}
            gearByCharacter={gearByCharacter}
            gearBulkReady={gearBulkReady}
            handleSort={(key) => dispatch({ type: 'SORT_BY', payload: key })}
            sortKey={sortKey}
            sortDir={sortDir}
            difficulty={difficulty}
            lootsByCharacter={lootsByCharacter}
            guild={guild}
            extension={extension}
            staleAfterDays={staleAfterDays}
            isFiltered={roster.length > 0}
          />
        )}
      </Stack>
    </Container>
  );
};

export default TrackingPage;
