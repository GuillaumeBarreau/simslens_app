import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Image,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconCrown,
  IconSwords,
  IconTrendingUp,
} from '@tabler/icons-react';
import { Select } from 'components/design-system/atoms/Select';
import { SimMetricBadge } from 'components/domain/droptimizer/SimMetricBadge';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { isFeatureEnabled } from 'config/featureFlags';
import { useDifficulty } from 'contexts';
import type { Difficulty } from 'contexts/DifficultyContext';
import { useCharacterBossUpgrades } from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CharacterBossUpgrade, CharacterBossUpgradeItem } from 'services/character.service';
import { getReportFreshness, type ReportFreshness } from 'utils/droptimizer';
import { getQualityColor } from 'utils/qualityColors';
import { resolveBlizzardIcon, resolveFallbackIcon, resolveIconPath } from 'utils/resolveIconPath';

import { bestBossId, sortBossLoot, topUpgrades } from '../activitySummary';
import classes from '../MyActivityPage.module.css';
import { ActivityEmptyState, ActivitySection } from './ActivitySection';
import {
  type BossUpgradeSpecChoice,
  bossUpgradeSpecOptions,
  requestedSpecializationId,
} from './bossUpgradeSpecs';

type DiffReport = { id: string; timestamp: number; hasNoUpgrade?: boolean } | null | undefined;

function getReportStatus(report: DiffReport): ReportFreshness {
  if (report?.hasNoUpgrade) return 'fresh';
  return getReportFreshness(report?.timestamp);
}

const STATUS_COLOR: Record<ReportFreshness, string> = {
  fresh: 'var(--mantine-color-teal-5)',
  late: 'var(--mantine-color-orange-5)',
  stale: 'var(--mantine-color-red-5)',
  missing: 'var(--mantine-color-dark-3)',
};

interface ReportsByDifficulty {
  normal: DiffReport;
  heroic: DiffReport;
  mythic: DiffReport;
}

interface ActivityBossUpgradesSectionProps {
  id?: string;
  characterId: number | null;
  specializationId: number | null;
  region?: string;
  reportsByDifficulty?: ReportsByDifficulty | null;
  /** Action proposée quand il n'y a pas encore de données (import d'un sim). */
  emptyAction?: ReactNode;
}

function DifficultySegment({ label, status }: { label: string; status: ReportFreshness }) {
  return (
    <Stack gap={2} align="center" style={{ minWidth: 28 }}>
      <Text size="xs" fw={700} lh={1}>
        {label}
      </Text>
      <Box style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[status] }} />
    </Stack>
  );
}

function formatDpsGain(gain: number | null): string {
  if (gain == null) return '—';
  if (gain <= 0) return '0';
  if (gain >= 1000) return `+${(gain / 1000).toFixed(1)}k`;
  return `+${Math.round(gain)}`;
}

function formatPercent(percent: number | null): string {
  if (percent == null) return '';
  return `${percent.toFixed(1)}%`;
}

function ItemIcon({
  item,
  region,
  size,
}: {
  item: CharacterBossUpgradeItem;
  region: string;
  size: number;
}) {
  const display = item.isToken && item.rewardItem ? item.rewardItem : item;
  return (
    <WowheadLink
      itemId={display.id}
      region={region as 'eu'}
      itemLevel={display.itemLevel || undefined}
    >
      <Image
        src={resolveBlizzardIcon(item.icon)}
        fallbackSrc={resolveFallbackIcon(item.icon)}
        alt={item.name}
        w={size}
        h={size}
        radius={4}
        style={{ border: `1px solid ${getQualityColor(item.quality)}`, flexShrink: 0 }}
      />
    </WowheadLink>
  );
}

function BossLootRow({ item, region }: { item: CharacterBossUpgradeItem; region: string }) {
  const { t } = useTranslation('myActivity');
  const noData = !item.hasSimData;
  const isUpgrade = item.isUpgrade;
  const isBiS = item.isWishlist;
  const greyed = !isUpgrade && !isBiS;

  let gainLabel = t('boss_upgrades.no_gain');
  if (noData) gainLabel = '—';
  else if (isUpgrade) gainLabel = formatDpsGain(item.dpsGain);

  return (
    <Group
      gap="xs"
      wrap="nowrap"
      align="center"
      style={{
        opacity: greyed ? 0.45 : 1,
        padding: '4px 6px',
        borderRadius: 6,
        background: greyed ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
        filter: greyed ? 'grayscale(0.7)' : 'none',
        border: isBiS ? '1px solid var(--mantine-color-brand-5)' : '1px solid transparent',
      }}
    >
      <ItemIcon item={item} region={region} size={30} />

      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" fw={600} truncate style={{ color: getQualityColor(item.quality) }}>
          {item.name}
        </Text>
        {item.isToken && item.rewardItem ? (
          <Text size="10px" c="dimmed" truncate>
            → {item.rewardItem.name}
          </Text>
        ) : (
          item.spec && (
            <Text size="10px" c="dimmed" truncate>
              {item.spec}
            </Text>
          )
        )}
      </Stack>

      <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
        <Text size="xs" fw={700} c={isUpgrade && !noData ? 'teal.4' : 'dimmed'} lh={1.1}>
          {gainLabel}
        </Text>
        {isUpgrade && item.gainPercent != null && (
          <Text size="10px" c="teal.6" lh={1.1}>
            {formatPercent(item.gainPercent)}
          </Text>
        )}
      </Stack>

      <IconCircleCheck
        size={16}
        style={{
          color: isUpgrade ? 'var(--mantine-color-teal-5)' : 'var(--mantine-color-dark-4)',
          flexShrink: 0,
        }}
      />
    </Group>
  );
}

function BossCard({
  entry,
  region,
  extension,
  season,
  isBest,
}: {
  entry: CharacterBossUpgrade;
  region: string;
  extension: string;
  season: string;
  isBest: boolean;
}) {
  const { t } = useTranslation('myActivity');
  const { boss, items, stats } = entry;
  const bossIcon = boss.icon ? resolveIconPath(boss.icon, extension, season) : '';
  const hasUpgrades = stats.upgradesCount > 0;

  return (
    <div className={classes.bossCard}>
      <Group gap="sm" wrap="nowrap" align="center">
        {bossIcon ? (
          <Image
            src={bossIcon}
            alt={boss.name}
            w={44}
            h={44}
            radius={8}
            fallbackSrc=""
            style={{ border: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
          />
        ) : (
          <Box
            w={44}
            h={44}
            style={{
              borderRadius: 8,
              background: 'var(--mantine-color-dark-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconSwords size={20} />
          </Box>
        )}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="sm" truncate>
            {boss.name}
          </Text>
          {isBest ? (
            <Badge
              size="xs"
              color="teal"
              variant="light"
              leftSection={<IconCrown size={10} />}
              style={{ alignSelf: 'flex-start' }}
            >
              {t('boss_upgrades.best_boss')}
            </Badge>
          ) : (
            boss.raidName && (
              <Text size="10px" c="dimmed" truncate>
                {boss.raidName}
              </Text>
            )
          )}
        </Stack>
      </Group>

      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <Tooltip label={t('boss_upgrades.best_gain_help')} withArrow>
          <Stack gap={4}>
            <Group gap={4} wrap="nowrap">
              <Text size="10px" c="dimmed" tt="uppercase" fw={700} lh={1}>
                {t('boss_upgrades.best_gain')}
              </Text>
              <SimMetricBadge metric={stats.metric} />
            </Group>
            {stats.bestGain > 0 ? (
              <span className={classes.bestGain}>{formatDpsGain(stats.bestGain)}</span>
            ) : (
              <Text fw={700} c="dimmed" lh={1}>
                —
              </Text>
            )}
          </Stack>
        </Tooltip>
        <Tooltip label={t('boss_upgrades.upgrade_chance_help')} withArrow>
          <Badge
            variant={hasUpgrades ? 'light' : 'default'}
            color={hasUpgrades ? 'teal' : 'gray'}
            size="lg"
            radius="sm"
            style={{ textTransform: 'none' }}
          >
            {t('boss_upgrades.upgrades_count', { count: stats.upgradesCount })}
          </Badge>
        </Tooltip>
      </Group>

      <Stack gap={2} style={{ flex: 1 }}>
        <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
          {t('boss_upgrades.loot_table')}
        </Text>
        {items.length === 0 ? (
          <Text size="xs" c="dimmed">
            {t('boss_upgrades.no_loot')}
          </Text>
        ) : (
          sortBossLoot(items).map((item) => (
            <BossLootRow key={item.id} item={item} region={region} />
          ))
        )}
      </Stack>
    </div>
  );
}

/**
 * Upgrades par boss (SIMS-211, remontées et refondues par SIMS-239) : meilleurs
 * gains en tête, puis une carte par boss avec son meilleur gain mis en avant.
 */
export function ActivityBossUpgradesSection({
  id,
  characterId,
  specializationId,
  region = 'eu',
  reportsByDifficulty,
  emptyAction,
}: ActivityBossUpgradesSectionProps) {
  const { t } = useTranslation('myActivity');
  const { difficulty, setDifficulty } = useDifficulty();
  const { extension, season } = useRouteParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  const difficultyData = (
    [
      { value: 'normal', label: 'NM' },
      { value: 'heroic', label: 'HM' },
      { value: 'mythic', label: 'MM' },
    ] as const
  ).map(({ value, label }) => ({
    value,
    label: (
      <DifficultySegment label={label} status={getReportStatus(reportsByDifficulty?.[value])} />
    ) as unknown as string,
  }));

  // Choix de la spé simulée (SIMS-211) ; par défaut la spé principale.
  const showSpecSelector = isFeatureEnabled('boss-upgrades-spec');
  const [specChoice, setSpecChoice] = useState<BossUpgradeSpecChoice | null>(null);
  const requestedSpecId = requestedSpecializationId(
    showSpecSelector ? specChoice : null,
    characterId,
    specializationId,
  );

  const {
    data: result,
    isLoading,
    isError,
  } = useCharacterBossUpgrades(characterId, {
    difficulty,
    extension,
    season,
    specializationId: requestedSpecId,
  });
  const data = result?.bosses;
  const specOptions = bossUpgradeSpecOptions(result);
  const top = topUpgrades(data);
  const bestId = bestBossId(data);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <Group gap="md" wrap="nowrap" style={{ overflow: 'hidden' }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} h={340} w={300} radius="md" style={{ flexShrink: 0 }} />
          ))}
        </Group>
      );
    }
    if (isError) {
      return (
        <ActivityEmptyState
          icon={<IconAlertTriangle size={26} stroke={1.5} />}
          title={t('boss_upgrades.error_title')}
          text={t('boss_upgrades.error')}
        />
      );
    }
    if (!data || data.length === 0) {
      return (
        <ActivityEmptyState
          icon={<IconSwords size={26} stroke={1.5} />}
          title={t('boss_upgrades.empty_title')}
          text={t('boss_upgrades.empty')}
          action={emptyAction}
        />
      );
    }
    return (
      <Stack gap="md">
        {top.length > 0 && (
          <Stack gap={6}>
            <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
              {t('boss_upgrades.top_title')}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              {top.map(({ item, bossName }) => (
                <div key={`${bossName}-${item.id}`} className={classes.topUpgrade}>
                  <ItemIcon item={item} region={region} size={36} />
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      size="sm"
                      fw={600}
                      truncate
                      style={{ color: getQualityColor(item.quality) }}
                    >
                      {item.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {bossName}
                    </Text>
                  </Stack>
                  <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
                    <Text fw={800} c="teal.4" lh={1.1}>
                      {formatDpsGain(item.dpsGain)}
                    </Text>
                    {item.gainPercent != null && (
                      <Text size="10px" c="teal.6" lh={1.1}>
                        {formatPercent(item.gainPercent)}
                      </Text>
                    )}
                  </Stack>
                </div>
              ))}
            </SimpleGrid>
          </Stack>
        )}
        <div ref={scrollRef} className={classes.bossRail}>
          {data.map((entry) => (
            <BossCard
              key={entry.boss.id}
              entry={entry}
              region={region}
              extension={extension}
              season={season}
              isBest={entry.boss.id === bestId}
            />
          ))}
        </div>
      </Stack>
    );
  };

  return (
    <ActivitySection
      id={id}
      icon={<IconTrendingUp size={20} />}
      color="teal"
      title={
        <Group gap="xs" wrap="nowrap" component="span">
          {t('boss_upgrades.label')}
          {/* Gains en HPS d'une sim QE Live (SIMS-202). */}
          <SimMetricBadge metric={result?.metric} />
        </Group>
      }
      description={t('boss_upgrades.description')}
      actions={
        <Group gap={6} wrap="wrap" justify="flex-end">
          {showSpecSelector && result?.specialization && (
            <Group gap={6} wrap="nowrap" align="center">
              <Text size="xs" c="dimmed">
                {t('boss_upgrades.simulated_spec')}
              </Text>
              {specOptions.length > 1 ? (
                <Select
                  size="xs"
                  w={160}
                  allowDeselect={false}
                  aria-label={t('boss_upgrades.change_spec')}
                  data={specOptions}
                  value={String(result.specialization.id)}
                  onChange={(value) => {
                    if (value && characterId) {
                      setSpecChoice({ characterId, specializationId: Number(value) });
                    }
                  }}
                />
              ) : (
                <Text size="xs" fw={600}>
                  {result.specialization.name}
                </Text>
              )}
              {result.specializations.every((s) => s.id !== result.specialization?.id) && (
                <Text size="xs" c="dimmed">
                  {t('boss_upgrades.no_sim_for_spec')}
                </Text>
              )}
            </Group>
          )}
          <SegmentedControl
            size="xs"
            radius="md"
            value={difficulty}
            onChange={(v) => setDifficulty(v as Difficulty)}
            data={difficultyData}
          />
          <ActionIcon
            size="md"
            variant="subtle"
            color="gray"
            onClick={() => scrollBy(-320)}
            aria-label={t('boss_upgrades.prev')}
          >
            <IconChevronLeft size={16} />
          </ActionIcon>
          <ActionIcon
            size="md"
            variant="subtle"
            color="gray"
            onClick={() => scrollBy(320)}
            aria-label={t('boss_upgrades.next')}
          >
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
      }
    >
      {renderBody()}
    </ActivitySection>
  );
}
