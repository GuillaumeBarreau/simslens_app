import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  Slider,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconClipboardCopy,
  IconCode,
  IconHistory,
  IconSparkles,
  IconUsers,
} from '@tabler/icons-react';
import {
  useApplyComposition,
  useCompositionContext,
  useGenerateComposition,
} from 'hooks/queries/useRosterQueries';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CompositionResult, CompositionWarning } from 'services/roster.service';
import { normalizeClass } from 'utils';

import { countMissingSpecialization, missingSpecializationEntries } from './missingSpecialization';
import { offspecFillEntries } from './offspecFill';

export interface CompositionBossOption {
  id: number;
  name: string;
}

const MAX_HISTORY_WEEKS = 6;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface GenerateCompositionModalProps {
  opened: boolean;
  onClose: () => void;
  eventId: number | null;
  realmId: number;
  difficulty: string;
  hasExistingAssignments: boolean;
  bosses: CompositionBossOption[];
}

const ROLE_COLORS: Record<string, string> = {
  TANK: 'blue',
  HEALER: 'green',
  MELEE: 'red',
  RANGED: 'orange',
};

export const GenerateCompositionModal = ({
  opened,
  onClose,
  eventId,
  realmId,
  difficulty,
  hasExistingAssignments,
  bosses,
}: GenerateCompositionModalProps) => {
  const { t } = useTranslation('eventRoster');
  const isMythic = difficulty.toLowerCase() === 'mythic';

  const [buffs, setBuffs] = useState(0.5);
  const [upgrades, setUpgrades] = useState(0.3);
  const [history, setHistory] = useState(0.2);
  const [sizeOverride, setSizeOverride] = useState<number | ''>(20);
  const [historyWeeks, setHistoryWeeks] = useState(6);
  const [minBossesPerPlayer, setMinBossesPerPlayer] = useState<number | ''>(0);
  const [selectedBossIds, setSelectedBossIds] = useState<number[]>([]);
  const [proposal, setProposal] = useState<CompositionResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  const generate = useGenerateComposition(eventId, realmId);
  const apply = useApplyComposition(eventId, realmId);
  const contextQuery = useCompositionContext(eventId, realmId, opened, MAX_HISTORY_WEEKS);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    if (opened) {
      setSelectedBossIds(bosses.map((b) => b.id));
    } else {
      setProposal(null);
      setConfirming(false);
      setShowRawJson(false);
    }
  }, [opened, bosses]);

  const allBossesSelected = selectedBossIds.length === bosses.length;
  const someBossesSelected = selectedBossIds.length > 0 && !allBossesSelected;

  const toggleAllBosses = () => {
    if (allBossesSelected) setSelectedBossIds([]);
    else setSelectedBossIds(bosses.map((b) => b.id));
  };

  const toggleBoss = (bossId: number) => {
    setSelectedBossIds((prev) =>
      prev.includes(bossId) ? prev.filter((id) => id !== bossId) : [...prev, bossId],
    );
  };

  const handleGenerate = () => {
    if (!eventId) return;
    generate.mutate(
      {
        weights: { buffs, upgrades, history },
        sizeOverride: isMythic ? undefined : Number(sizeOverride) || undefined,
        historyWeeks,
        selectedBossIds: selectedBossIds.length > 0 ? selectedBossIds : undefined,
        minBossesPerPlayer: typeof minBossesPerPlayer === 'number' ? minBossesPerPlayer : 0,
      },
      {
        onSuccess: (result) => setProposal(result),
      },
    );
  };

  const liveOptions = useMemo(
    () => ({
      weights: { buffs, upgrades, history },
      sizeOverride: isMythic ? null : Number(sizeOverride) || null,
      historyWeeks,
      selectedBossIds: [...selectedBossIds].sort((a, b) => a - b),
      minBossesPerPlayer: typeof minBossesPerPlayer === 'number' ? minBossesPerPlayer : 0,
    }),
    [
      buffs,
      upgrades,
      history,
      sizeOverride,
      isMythic,
      historyWeeks,
      selectedBossIds,
      minBossesPerPlayer,
    ],
  );

  const liveContext = useMemo(() => {
    const data = contextQuery.data;
    if (!data) return null;

    const eventStartMs = new Date(data.event.startTime).getTime();
    const cutoff = eventStartMs - liveOptions.historyWeeks * WEEK_MS;
    const filteredEvents = data.history.events.filter(
      (e) => new Date(e.startTime).getTime() >= cutoff,
    );

    const selectedSet = new Set(liveOptions.selectedBossIds);
    const selectedBosses = data.bosses.filter((b) => selectedSet.has(b.id));

    const activeBuffs = liveOptions.weights.buffs > 0 ? data.constraints.activeBuffs : [];

    const cap =
      data.constraints.sizeHardCap ??
      Math.min(
        data.constraints.flexCapMax,
        liveOptions.sizeOverride ?? data.constraints.flexCapMax,
      );

    return {
      ...data,
      bosses: selectedBosses,
      constraints: {
        ...data.constraints,
        activeBuffs,
        effectiveCap: cap,
      },
      history: {
        ...data.history,
        weeksRequested: liveOptions.historyWeeks,
        eventsFound: filteredEvents.length,
        events: filteredEvents,
      },
    };
  }, [contextQuery.data, liveOptions]);

  const displayPayload = useMemo(
    () => ({
      options: liveOptions,
      context: liveContext,
    }),
    [liveOptions, liveContext],
  );

  const handleCopyJson = () => {
    const json = JSON.stringify(displayPayload, null, 2);
    navigator.clipboard.writeText(json).then(
      () => notifications.show({ message: t('generate.context.copied'), color: 'green' }),
      () => notifications.show({ message: t('generate.context.copyFailed'), color: 'red' }),
    );
  };

  const handleApply = () => {
    if (!proposal) return;
    if (hasExistingAssignments && !confirming) {
      setConfirming(true);
      return;
    }
    apply.mutate(proposal, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleClose = () => {
    if (apply.isPending) return;
    onClose();
  };

  const aggregatedWarnings = useMemo<CompositionWarning[]>(() => {
    if (!proposal) return [];
    return proposal.warnings;
  }, [proposal]);

  const uncoveredBuffsByBoss = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const w of aggregatedWarnings) {
      if (w.type === 'buff_uncovered' && w.bossId && w.buff) {
        const arr = map.get(w.bossId) || [];
        arr.push(w.buff);
        map.set(w.bossId, arr);
      }
    }
    return map;
  }, [aggregatedWarnings]);

  const playersBelowMin = useMemo(
    () => aggregatedWarnings.filter((w) => w.type === 'player_below_min' && w.characterName),
    [aggregatedWarnings],
  );

  const playersWithoutSpec = useMemo(
    () => missingSpecializationEntries(aggregatedWarnings),
    [aggregatedWarnings],
  );

  const offspecFills = useMemo(() => offspecFillEntries(aggregatedWarnings), [aggregatedWarnings]);

  const contextMissingSpecCount = contextQuery.data
    ? countMissingSpecialization(contextQuery.data)
    : 0;

  const maxMinBosses = Math.max(1, selectedBossIds.length);
  const canGenerate = !!eventId && selectedBossIds.length > 0;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconSparkles size={18} />
          <span>{t('generate.title')}</span>
        </Group>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        {!proposal && (
          <>
            <Text size="sm" c="dimmed">
              {t('generate.description')}
            </Text>

            <Box
              p="sm"
              style={{
                border: '1px solid var(--mantine-color-dark-4)',
                borderRadius: 'var(--mantine-radius-md)',
                background: 'var(--mantine-color-dark-7)',
              }}
            >
              {contextQuery.isLoading && (
                <Group gap="xs">
                  <Loader size="xs" />
                  <Text size="sm" c="dimmed">
                    {t('generate.context.loading')}
                  </Text>
                </Group>
              )}

              {contextQuery.isError && (
                <Group gap="xs">
                  <IconAlertTriangle size={14} color="var(--mantine-color-red-5)" />
                  <Text size="sm" c="red">
                    {t('generate.context.error')}
                  </Text>
                  <Button size="compact-xs" variant="subtle" onClick={() => contextQuery.refetch()}>
                    {t('generate.context.retry')}
                  </Button>
                </Group>
              )}

              {liveContext && contextQuery.data && (
                <Stack gap="xs">
                  <Group justify="space-between" wrap="wrap">
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        {t('generate.context.title')}
                      </Text>
                      <Badge size="xs" color="gray">
                        v{liveContext.schemaVersion}
                      </Badge>
                    </Group>
                    <Group gap="xs">
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        leftSection={<IconCode size={12} />}
                        onClick={() => setShowRawJson((v) => !v)}
                      >
                        {showRawJson
                          ? t('generate.context.hideJson')
                          : t('generate.context.showJson')}
                      </Button>
                      <Button
                        size="compact-xs"
                        variant="light"
                        leftSection={<IconClipboardCopy size={12} />}
                        onClick={handleCopyJson}
                      >
                        {t('generate.context.copy')}
                      </Button>
                    </Group>
                  </Group>
                  <Group gap="lg" wrap="wrap">
                    <Text size="xs" c="dimmed">
                      {t('generate.context.players', { count: liveContext.pool.length })}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('generate.context.bosses', {
                        selected: liveContext.bosses.length,
                        total: contextQuery.data.bosses.length,
                      })}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('generate.context.history', {
                        count: liveContext.history.eventsFound,
                        weeks: liveOptions.historyWeeks,
                      })}
                    </Text>
                    <Tooltip
                      label={
                        liveContext.constraints.activeBuffs.length === 0
                          ? t('generate.context.buffsDisabled')
                          : liveContext.constraints.activeBuffs.map((b) => b.key).join(', ')
                      }
                      multiline
                      maw={300}
                    >
                      <Text size="xs" c="dimmed" style={{ cursor: 'help' }}>
                        {t('generate.context.activeBuffs', {
                          count: liveContext.constraints.activeBuffs.length,
                        })}
                      </Text>
                    </Tooltip>
                    <Text size="xs" c="dimmed">
                      {t('generate.context.cap', {
                        cap: liveContext.constraints.effectiveCap,
                      })}
                    </Text>
                    {liveOptions.minBossesPerPlayer > 0 && (
                      <Text size="xs" c="dimmed">
                        {t('generate.context.minBosses', {
                          count: liveOptions.minBossesPerPlayer,
                        })}
                      </Text>
                    )}
                    {contextMissingSpecCount > 0 && (
                      <Text size="xs" c="yellow">
                        {t('generate.context.missingSpec', { count: contextMissingSpecCount })}
                      </Text>
                    )}
                  </Group>
                  {showRawJson && (
                    <ScrollArea.Autosize mah={240}>
                      <Box
                        component="pre"
                        style={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          margin: 0,
                          padding: 8,
                          background: 'var(--mantine-color-dark-9)',
                          borderRadius: 'var(--mantine-radius-sm)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {JSON.stringify(displayPayload, null, 2)}
                      </Box>
                    </ScrollArea.Autosize>
                  )}
                </Stack>
              )}
            </Box>

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  {t('generate.weights.buffs')}
                </Text>
                <Text size="sm" c="dimmed">
                  {Math.round(buffs * 100)}%
                </Text>
              </Group>
              <Slider value={buffs} onChange={setBuffs} min={0} max={1} step={0.05} color="grape" />
              <Text size="xs" c="dimmed">
                {t('generate.weights.buffsHint')}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  {t('generate.weights.upgrades')}
                </Text>
                <Text size="sm" c="dimmed">
                  {Math.round(upgrades * 100)}%
                </Text>
              </Group>
              <Slider
                value={upgrades}
                onChange={setUpgrades}
                min={0}
                max={1}
                step={0.05}
                color="orange"
              />
              <Text size="xs" c="dimmed">
                {t('generate.weights.upgradesHint')}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  {t('generate.weights.history')}
                </Text>
                <Text size="sm" c="dimmed">
                  {Math.round(history * 100)}%
                </Text>
              </Group>
              <Slider
                value={history}
                onChange={setHistory}
                min={0}
                max={1}
                step={0.05}
                color="cyan"
              />
              <Text size="xs" c="dimmed">
                {t('generate.weights.historyHint')}
              </Text>
            </Stack>

            <Divider my="xs" />

            <Group grow>
              <NumberInput
                label={t('generate.size.label')}
                description={
                  isMythic ? t('generate.size.mythicLocked') : t('generate.size.flexHint')
                }
                value={isMythic ? 20 : sizeOverride}
                onChange={(v) => setSizeOverride(typeof v === 'number' ? v : '')}
                min={1}
                max={30}
                disabled={isMythic}
              />
              <NumberInput
                label={t('generate.history.label')}
                description={t('generate.history.hint')}
                value={historyWeeks}
                onChange={(v) => typeof v === 'number' && setHistoryWeeks(v)}
                min={1}
                max={6}
              />
              <NumberInput
                label={t('generate.minBosses.label')}
                description={t('generate.minBosses.hint')}
                value={minBossesPerPlayer}
                onChange={(v) => setMinBossesPerPlayer(typeof v === 'number' ? v : '')}
                min={0}
                max={maxMinBosses}
              />
            </Group>

            <Divider my="xs" />

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  {t('generate.bosses.label', { count: selectedBossIds.length })}
                </Text>
                <Button variant="subtle" size="compact-xs" onClick={toggleAllBosses}>
                  {allBossesSelected
                    ? t('generate.bosses.deselectAll')
                    : t('generate.bosses.selectAll')}
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                {t('generate.bosses.hint')}
              </Text>
              <Group gap="xs" wrap="wrap">
                {bosses.map((b) => (
                  <Checkbox
                    key={b.id}
                    label={b.name}
                    checked={selectedBossIds.includes(b.id)}
                    onChange={() => toggleBoss(b.id)}
                    size="sm"
                  />
                ))}
              </Group>
              {someBossesSelected && (
                <Text size="xs" c="dimmed">
                  {t('generate.bosses.partial', {
                    selected: selectedBossIds.length,
                    total: bosses.length,
                  })}
                </Text>
              )}
            </Stack>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" color="gray" onClick={handleClose}>
                {t('generate.cancel')}
              </Button>
              <Button
                onClick={handleGenerate}
                loading={generate.isPending}
                leftSection={<IconSparkles size={16} />}
                disabled={!canGenerate}
              >
                {t('generate.run')}
              </Button>
            </Group>
          </>
        )}

        {generate.isPending && !proposal && (
          <Group justify="center" py="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('generate.computing')}
            </Text>
          </Group>
        )}

        {proposal && (
          <>
            <Group gap="lg" wrap="wrap">
              <Group gap="xs">
                <IconUsers size={16} />
                <Text size="sm">{t('generate.meta.pool', { count: proposal.meta.poolSize })}</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {t('generate.meta.cap', { cap: proposal.meta.cap })}
              </Text>
              <Text size="sm" c="dimmed">
                {t('generate.meta.history', { count: proposal.meta.historyEvents })}
              </Text>
              <Text size="sm" c="dimmed">
                {t('generate.meta.buffs', { count: proposal.meta.activeBuffs.length })}
              </Text>
            </Group>

            {aggregatedWarnings.length > 0 && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />} variant="light">
                <Text size="xs">
                  {t('generate.warnings.summary', { count: aggregatedWarnings.length })}
                </Text>
              </Alert>
            )}

            {playersWithoutSpec.length > 0 && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />} variant="light">
                <Text size="xs" fw={600}>
                  {t('generate.warnings.missingSpecTitle', { count: playersWithoutSpec.length })}
                </Text>
                <Text size="xs">
                  {playersWithoutSpec
                    .map((p) =>
                      p.role
                        ? t('generate.warnings.missingSpecPlaced', {
                            name: p.name,
                            role: t(`vacancies.roles.${p.role}`),
                          })
                        : t('generate.warnings.missingSpecUnplaced', { name: p.name }),
                    )
                    .join(' • ')}
                </Text>
              </Alert>
            )}

            {offspecFills.length > 0 && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />} variant="light">
                <Text size="xs" fw={600}>
                  {t('generate.warnings.offspecTitle', { count: offspecFills.length })}
                </Text>
                <Text size="xs">
                  {offspecFills
                    .map((entry) =>
                      t('generate.warnings.offspecEntry', {
                        name: entry.name,
                        role: t(`vacancies.roles.${entry.role}`),
                        primaryRole: t(`vacancies.roles.${entry.primaryRole}`),
                        count: entry.bossCount,
                      }),
                    )
                    .join(' • ')}
                </Text>
              </Alert>
            )}

            {playersBelowMin.length > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />} variant="light">
                <Text size="xs" fw={600}>
                  {t('generate.warnings.belowMinTitle', { count: playersBelowMin.length })}
                </Text>
                <Text size="xs">
                  {playersBelowMin
                    .map((w) =>
                      t('generate.warnings.belowMinEntry', {
                        name: w.characterName,
                        assigned: w.assigned,
                        target: w.target,
                      }),
                    )
                    .join(' • ')}
                </Text>
              </Alert>
            )}

            <ScrollArea.Autosize mah={420}>
              <Stack gap="md">
                {proposal.bosses.map(({ boss, assignments, roleTargets, roleSource }) => {
                  const uncovered = uncoveredBuffsByBoss.get(boss.id) || [];
                  return (
                    <Box
                      key={boss.id}
                      p="sm"
                      style={{
                        border: '1px solid var(--mantine-color-dark-4)',
                        borderRadius: 'var(--mantine-radius-md)',
                      }}
                    >
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <Title order={6}>{boss.name}</Title>
                          {roleSource === 'history' && (
                            <Badge
                              size="xs"
                              color="cyan"
                              variant="light"
                              leftSection={<IconHistory size={10} />}
                            >
                              {t('generate.roleSource.history')}
                            </Badge>
                          )}
                          {roleTargets && (
                            <Text size="xs" c="dimmed">
                              {roleTargets.TANK}T / {roleTargets.HEALER}H /{' '}
                              {roleTargets.MELEE + roleTargets.RANGED} DPS
                            </Text>
                          )}
                        </Group>
                        <Group gap="xs">
                          <Badge size="sm" color="gray">
                            {assignments.length}
                          </Badge>
                          {uncovered.length > 0 && (
                            <Badge size="sm" color="yellow" variant="light">
                              {t('generate.warnings.missingBuffs', {
                                buffs: uncovered.join(', '),
                              })}
                            </Badge>
                          )}
                        </Group>
                      </Group>
                      <Group gap="xs" wrap="wrap">
                        {assignments.map((a) => (
                          <Group key={a.characterId} gap={4} wrap="nowrap">
                            <Badge
                              color={ROLE_COLORS[a.role] || 'gray'}
                              variant="light"
                              className={`class-${normalizeClass(a.class)}`}
                            >
                              {a.characterName}
                              {a.spec
                                ? ` (${a.spec})`
                                : ` (${t('generate.warnings.specToDefine')})`}
                            </Badge>
                            {a.offspec && (
                              <Badge size="xs" color="gray" variant="outline">
                                {t('generate.offspec')}
                              </Badge>
                            )}
                          </Group>
                        ))}
                        {assignments.length === 0 && (
                          <Text size="xs" c="dimmed">
                            {t('generate.warnings.emptyBoss')}
                          </Text>
                        )}
                      </Group>
                    </Box>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>

            {confirming && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />} variant="filled">
                <Text size="sm" fw={600}>
                  {t('generate.confirm.title')}
                </Text>
                <Text size="xs">{t('generate.confirm.body')}</Text>
              </Alert>
            )}

            <Group justify="space-between" mt="md">
              <Button variant="subtle" color="gray" onClick={() => setProposal(null)}>
                {t('generate.back')}
              </Button>
              <Group gap="xs">
                <Button variant="subtle" color="gray" onClick={handleClose}>
                  {t('generate.cancel')}
                </Button>
                <Button
                  onClick={handleApply}
                  color={confirming ? 'red' : 'brand.5'}
                  loading={apply.isPending}
                >
                  {confirming ? t('generate.confirm.button') : t('generate.apply')}
                </Button>
              </Group>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
};

export default GenerateCompositionModal;
