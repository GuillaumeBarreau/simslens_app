import { Avatar, Badge, Center, Flex, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { SimFreshness, SimMetricBadge } from 'components/domain/droptimizer';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import {
  compareGains,
  computeBoundariesByMetric,
  computePercentGain,
  valueToColor,
} from 'components/playerListUtils';
import { isFeatureEnabled } from 'config/featureFlags';
import { useSimStaleAfterDays } from 'hooks/useSimStaleAfterDays';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatNumberWithLocale, getReportUrl, getThumbnailUrl, isHealerSpec } from 'utils';
import { simMetricOf } from 'utils/droptimizer';
import { handleIconError, resolveBlizzardIcon } from 'utils/resolveIconPath';

interface UpgradeData {
  dps: number;
  baseDps: number;
  /** Grandeur de la sim (SIMS-202) : `hps` pour QE Live. */
  metric?: string | null;
  name: string;
  realm?: string;
  region?: string;
  class?: string;
  thumbnail?: string;
  spec?: string;
  guild?: string;
  reportID?: string;
  timeStamp: Date;
  isWishlist?: boolean | number;
  characterId?: number;
  equippedItems?: Array<{
    itemId: number;
    ilevel: number;
    slot: string;
    upgradeLevel?: number | null;
    upgradeMax?: number | null;
    upgradeName?: string | null;
    upgradeFullName?: string | null;
    upgradeBonusId?: number | null;
    baseItemLevel?: number | null;
    item: {
      id: number;
      name: string;
      icon: string;
    };
  }>;
  items?: {
    id: number;
    name: string;
    icon: string;
  };
}

interface PlayerListProps {
  isPercent: boolean;
  onVisibleChange?: (visible: UpgradeData[]) => void;
  upgrades: UpgradeData[];
  loadingUpgrades: boolean;
  sourceItemId?: number;
  sourceItemLevel?: number;
  maxHeight?: number | string;
  focus?: { key: string; at: number } | null;
}

export const playerRowKey = (player: { name?: string | null; realm?: string | null }) =>
  `${player.name ?? ''}-${player.realm ?? ''}`;

type SortKey = 'player' | 'increase' | 'trend' | 'wishlist';
type SortDirection = 'asc' | 'desc';

type EquippedItem = NonNullable<UpgradeData['equippedItems']>[number];

const EquippedItemCard: React.FC<{
  equippedItem: EquippedItem;
  sourceItemLevel?: number;
}> = ({ equippedItem, sourceItemLevel }) => {
  const delta = sourceItemLevel ? sourceItemLevel - equippedItem.ilevel : null;

  return (
    <Group gap={10} justify="center" align="center" wrap="nowrap">
      <WowheadLink itemId={equippedItem.itemId} itemLevel={equippedItem.ilevel} region="eu">
        <img
          src={resolveBlizzardIcon(equippedItem.item.icon)}
          onError={handleIconError(equippedItem.item.icon)}
          alt={equippedItem.item.name}
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            border: '1px solid #444',
            cursor: 'pointer',
            display: 'block',
          }}
        />
      </WowheadLink>
      <Stack gap={3} align="flex-start">
        <Group gap={5} align="center" wrap="nowrap">
          <Text fw={700} size="sm" style={{ lineHeight: 1 }}>
            {equippedItem.ilevel}
          </Text>
          {delta !== null &&
            (delta === 0 ? (
              <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
                =
              </Text>
            ) : (
              <Badge
                size="xs"
                variant="light"
                color={delta > 0 ? 'teal' : 'red'}
                style={{ textTransform: 'none' }}
              >
                {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
              </Badge>
            ))}
        </Group>
        {equippedItem.upgradeFullName ? (
          <Badge size="xs" variant="light" color="grape" style={{ textTransform: 'none' }}>
            {equippedItem.upgradeFullName}
          </Badge>
        ) : (
          <Badge size="xs" variant="light" color="cyan" style={{ textTransform: 'none' }}>
            Craft
          </Badge>
        )}
      </Stack>
    </Group>
  );
};

const PlayerList: React.FC<PlayerListProps> = ({
  isPercent,
  onVisibleChange,
  upgrades,
  loadingUpgrades,
  sourceItemId,
  sourceItemLevel,
  maxHeight = 408,
  focus = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Date du dernier sim et badge « Sim périmé » sous chaque joueur (SIMS-199).
  // Le seuil ne sert qu'à cet affichage : pas de requête tant que le drapeau est fermé.
  const showSimDate = isFeatureEnabled('sim-freshness');
  const staleAfterDays = useSimStaleAfterDays(showSimDate);
  // Gains HPS des sims QE Live (SIMS-202) : libellés « HPS » et jamais comparés
  // bruts aux DPS. Drapeau fermé : toute sim compte comme DPS, comme avant.
  const showHps = isFeatureEnabled('hps-sims');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'trend',
    direction: 'desc',
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: key === 'player' ? 'asc' : 'desc' };
    });
  };

  const filteredAndSorted = useMemo(() => {
    if (!upgrades || upgrades.length === 0) return [];
    const asGain = (u: UpgradeData) => ({
      dps: u.dps,
      baseDps: u.baseDps,
      metric: showHps ? u.metric : null,
    });

    let arr = [...upgrades];

    arr = arr.sort((a, b) => {
      const aHas =
        sourceItemId && sourceItemLevel
          ? (a.equippedItems || []).some(
              (eq) => eq.itemId === sourceItemId && eq.ilevel >= sourceItemLevel,
            )
          : false;

      const bHas =
        sourceItemId && sourceItemLevel
          ? (b.equippedItems || []).some(
              (eq) => eq.itemId === sourceItemId && eq.ilevel >= sourceItemLevel,
            )
          : false;

      if (aHas && !bHas) return 1;
      if (!aHas && bHas) return -1;

      let comparison = 0;

      switch (sortConfig.key) {
        case 'player':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'increase':
          comparison = compareGains(asGain(a), asGain(b), isPercent);
          break;
        case 'trend': {
          const aTrend = ((a.dps - a.baseDps) / (a.baseDps || 1)) * 100;
          const bTrend = ((b.dps - b.baseDps) / (b.baseDps || 1)) * 100;
          comparison = aTrend - bTrend;
          break;
        }
        case 'wishlist': {
          const aWish = a.isWishlist ? 1 : 0;
          const bWish = b.isWishlist ? 1 : 0;
          comparison = aWish - bWish;
          break;
        }
        default:
          comparison = 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return arr;
  }, [upgrades, isPercent, sortConfig, sourceItemId, sourceItemLevel, showHps]);

  const metricOf = useCallback(
    (u: UpgradeData) => (showHps ? simMetricOf(u.metric) : 'dps'),
    [showHps],
  );

  const boundariesByMetric = useMemo(
    () =>
      computeBoundariesByMetric(
        filteredAndSorted.map((u) => ({ dps: u.dps, baseDps: u.baseDps, metric: metricOf(u) })),
        isPercent,
      ),
    [filteredAndSorted, isPercent, metricOf],
  );

  const orderedForDisplay = filteredAndSorted;

  const rows = useMemo(() => {
    if (!orderedForDisplay || orderedForDisplay.length === 0) return [];
    return orderedForDisplay.map((p, idx) => {
      const rank = idx + 1;
      const dps = p.dps ?? 0;
      const baseDps = p.baseDps ?? 0;
      const increase = dps - baseDps;
      const percentGain = computePercentGain(dps, baseDps);
      const display = isPercent ? percentGain : increase;
      const percentDisplay = percentGain.toFixed(1);
      const metric = metricOf(p);
      const [boundaryHigh, boundaryLow] = boundariesByMetric[metric];
      const color = valueToColor(display, boundaryHigh, boundaryLow);
      const thumbnailUrl = getThumbnailUrl({
        thumbnail: p.thumbnail,
        region: p.region,
      });
      const resolvedItem = p.items && p.items.id && p.items.id !== sourceItemId ? p.items : null;

      const equippedItems = p.equippedItems || [];

      const hasItem =
        sourceItemId && sourceItemLevel
          ? equippedItems.some((eq) => eq.itemId === sourceItemId && eq.ilevel >= sourceItemLevel)
          : false;

      // Row striping is handled by the Table `striped` prop; here we only mark
      // rows for players who already own the item (dimmed + darker background).
      const rowStyle: React.CSSProperties = {
        borderBottom: '1px solid var(--mantine-color-app-7)',
        ...(hasItem ? { background: 'rgba(0, 0, 0, 0.25)', opacity: 0.55 } : {}),
      };

      const grayScaleStyle = hasItem ? { filter: 'grayscale(100%)' } : {};

      return (
        <Table.Tr
          key={`${p.name}-${p.realm || 'unknown'}-${
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            idx
          }`}
          data-player-key={playerRowKey(p)}
          style={
            focus?.key === playerRowKey(p)
              ? { ...rowStyle, background: 'var(--mantine-color-dark-5)', opacity: 1 }
              : rowStyle
          }
        >
          <Table.Td style={{ width: '6%', textAlign: 'left', ...grayScaleStyle }}>
            <Text size="sm" c="dimmed" fw={600}>
              {rank}
            </Text>
          </Table.Td>
          <Table.Td style={grayScaleStyle}>
            <Group align="center" gap={8} wrap="nowrap">
              <Avatar src={thumbnailUrl || undefined} size={28} radius="sm" alt={p.name} />
              <div style={{ minWidth: 0 }}>
                <Group gap={6} wrap="nowrap">
                  <Text fw={600} size="sm" className={`class-${p.class}`} truncate="end">
                    {p.name}
                  </Text>
                  {resolvedItem && (
                    <WowheadLink itemId={resolvedItem.id} region="eu">
                      <img
                        src={resolveBlizzardIcon(resolvedItem.icon)}
                        onError={handleIconError(resolvedItem.icon)}
                        alt={resolvedItem.name}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: '1px solid #444',
                          cursor: 'pointer',
                        }}
                      />
                    </WowheadLink>
                  )}
                </Group>
                <Text size="xs" c="dimmed" truncate="end">
                  {p.spec || ''} {p.guild ? `• ${p.guild}` : ''}
                </Text>
                {showSimDate && (
                  <SimFreshness timestamp={p.timeStamp} staleAfterDays={staleAfterDays} />
                )}
              </div>
            </Group>
          </Table.Td>

          <Table.Td style={{ textAlign: 'center', ...grayScaleStyle }}>
            {equippedItems.length === 0 ? (
              <Text size="xs" c="dimmed">
                -
              </Text>
            ) : (
              <Group gap={16} justify="center" align="center" wrap="nowrap">
                {equippedItems.map((equippedItem) => (
                  <EquippedItemCard
                    key={`${equippedItem.itemId}-${equippedItem.slot}`}
                    equippedItem={equippedItem}
                    sourceItemLevel={sourceItemLevel}
                  />
                ))}
              </Group>
            )}
          </Table.Td>

          <Table.Td style={{ width: '19.5%', textAlign: 'center', ...grayScaleStyle }}>
            <Text size="sm">
              {isHealerSpec(p.spec) || metric === 'hps' ? (
                <Text c="dimmed">-</Text>
              ) : (
                formatNumberWithLocale(p.dps, 'fr-FR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })
              )}
            </Text>
          </Table.Td>

          <Table.Td style={{ width: '19.5%', textAlign: 'center', ...grayScaleStyle }}>
            <Stack gap={0} align="center">
              <Group c={color} align="center" justify="center" gap={4} wrap="nowrap">
                <Text size="sm">{increase > 0 ? '▲' : '▼'}</Text>
                <Text size="md" fw={700}>
                  {percentDisplay} %
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {increase > 0 ? '+' : ''}
                {formatNumberWithLocale(display, 'fr-FR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })}
              </Text>
              <SimMetricBadge metric={metric} />
            </Stack>
          </Table.Td>
          <Table.Td style={{ width: '10%', textAlign: 'center', ...grayScaleStyle }}>
            {p.isWishlist ? (
              <Badge variant="filled" color="yellow" size="md" c="dark.9">
                BiS
              </Badge>
            ) : null}
          </Table.Td>
          <Table.Td style={{ width: '6%', textAlign: 'center' }}>
            {p.reportID ? (
              <a
                href={getReportUrl(p.reportID, p.spec, p.metric)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/src/rb4.png" alt="Report" style={{ width: 22, maxHeight: 22 }} />
              </a>
            ) : null}
          </Table.Td>
        </Table.Tr>
      );
    });
  }, [
    orderedForDisplay,
    isPercent,
    boundariesByMetric,
    metricOf,
    sourceItemId,
    sourceItemLevel,
    showSimDate,
    staleAfterDays,
    focus?.key,
  ]);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!focus) return;
    const target = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>('[data-player-key]') ?? [],
    ).find((el) => el.dataset.playerKey === focus.key);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus]);

  useEffect(() => {
    if (onVisibleChange && isMountedRef.current) {
      onVisibleChange(filteredAndSorted || []);
    }
  }, [filteredAndSorted, onVisibleChange]);

  return (
    <Flex
      ref={containerRef}
      direction="column"
      bdrs="sm"
      style={{ minHeight: 0, background: 'var(--mantine-color-app-8' }}
    >
      {loadingUpgrades ? (
        <Center style={{ padding: 20 }}>
          <Loader />
        </Center>
      ) : (
        <Table.ScrollContainer minWidth="100%" maxHeight={maxHeight} ml="sm" mt="md">
          <Table
            verticalSpacing={6}
            horizontalSpacing="sm"
            highlightOnHover
            style={{ tableLayout: 'fixed', width: '100%' }}
          >
            <Table.Thead
              style={{
                position: 'sticky',
                background: 'var(--mantine-color-app-6)',
                zIndex: 1,
              }}
            >
              <Table.Tr
                c="app.1"
                style={{
                  borderBottom: '2px solid var(--mantine-color-app-6)',
                }}
              >
                <Table.Th style={{ textAlign: 'left', width: '6%' }}>#</Table.Th>
                <Table.Th
                  style={{
                    textAlign: 'left',
                    width: '19.5%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.2s',
                    background:
                      sortConfig.key === 'player' ? 'var(--mantine-color-app-5)' : 'transparent',
                  }}
                  onClick={() => handleSort('player')}
                >
                  <Group gap={4} wrap="nowrap">
                    <Text>Player</Text>
                    {sortConfig.key === 'player' && (
                      <Text size="xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '19.5%' }}>Item Actuel</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '19.5%' }}>DPS</Table.Th>
                <Table.Th
                  style={{
                    textAlign: 'center',
                    width: '19.5%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.2s',
                    background:
                      sortConfig.key === 'trend' ? 'var(--mantine-color-app-5)' : 'transparent',
                  }}
                  onClick={() => handleSort('trend')}
                >
                  <Group gap={4} wrap="nowrap" justify="center">
                    <Text>Gain</Text>
                    {sortConfig.key === 'trend' && (
                      <Text size="xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{
                    textAlign: 'center',
                    width: '10%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.2s',
                    background:
                      sortConfig.key === 'wishlist' ? 'var(--mantine-color-app-5)' : 'transparent',
                  }}
                  onClick={() => handleSort('wishlist')}
                >
                  <Group gap={4} wrap="nowrap" justify="center">
                    <Text>BiS</Text>
                    {sortConfig.key === 'wishlist' && (
                      <Text size="xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</Text>
                    )}
                  </Group>
                </Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '6%' }}>Sim</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody c="app.1">{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Flex>
  );
};

export default PlayerList;
