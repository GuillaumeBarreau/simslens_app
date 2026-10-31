import {
  ActionIcon,
  Box,
  Button,
  Container,
  Group,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconSwords } from '@tabler/icons-react';
import { useAuth, useDifficulty, useRealmAccess } from 'contexts';
import {
  useBosses as useBossesQuery,
  useCharacters,
  useUpgradesBatch,
  useUserRealm,
  useWishlistUpgradesBatch,
} from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { fetchItems } from 'services/api';
import { Permission } from 'types/permissions';
import type { items as Items } from 'types/shared';
import type { UpgradeBatchRow, UpgradesByItem } from 'types/upgrade.types';
import { Can } from 'utils/auth';
import { getItemLevelForDifficulty } from 'utils/getItemLevelForDifficulty';

import { BossPicker } from './components/BossPicker/BossPicker';
import { DroptimizerEmptyState } from './components/DroptimizerEmptyState/DroptimizerEmptyState';
import { DroptimizerHeader } from './components/DroptimizerHeader/DroptimizerHeader';
import { DroptimizerToolbar } from './components/DroptimizerToolbar/DroptimizerToolbar';
import { GainsView } from './components/GainsView/GainsView';
import { InstancePanel } from './components/InstancePanel';
import type { LootItem } from './components/UpgradeChips/UpgradeChips';
import { WishlistView } from './components/WishlistView';
import { BossesProvider } from './contexts/BossesContext';
import { useValidatedLoots, ValidatedLootsProvider } from './contexts/ValidatedLootsContext';
import {
  countInterestingItems,
  countRows,
  emptyReason,
  matchesRoleFilter,
  parseBossIndex,
  summarizeGains,
  summarizeWishesByItem,
  summarizeWishesByPlayer,
} from './droptimizerView';
import styles from './LootsOptimiserPage.module.css';
import { initialState, reducer } from './LootsOptimiserPage.reducers';

const ITEMS_CACHE_KEY = 'droptimizer_items_v1';
const EMPTY_UPGRADES: UpgradesByItem = {};

function LootsOptimiserContent() {
  const { t } = useTranslation(['droptimizer', 'common']);
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { players, items, instancePanelOpen, viewMode, groupBy, roleFilter } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const { difficulty, setDifficulty } = useDifficulty();
  const { extension, guild, season } = useRouteParams();
  const { index } = useParams();
  const { user } = useAuth();
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const realmId = realmData?.id;
  const { validatedIds, filterEnabled, setFilterEnabled } = useValidatedLoots();

  const { data: bosses = [], isLoading: isBossesLoading } = useBossesQuery(extension, season);
  const parsedIndex = parseBossIndex(index, bosses.length);
  const selectedBossIndex =
    parsedIndex === 'all' ? -1 : parsedIndex === 'invalid' ? 0 : parsedIndex;
  const selectedBoss = selectedBossIndex >= 0 ? (bosses[selectedBossIndex] ?? null) : null;

  const raidItemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const boss of bosses) {
      for (const loot of boss.loot ?? []) ids.add(Number(loot.id));
    }
    return [...ids];
  }, [bosses]);

  const updateItemState = useCallback(
    async (force: boolean = false) => {
      let currentItems: Items[] = [];

      if (!force) {
        if (items.length > 0) {
          currentItems = [...items];
        } else {
          try {
            const raw = localStorage.getItem(ITEMS_CACHE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) currentItems = parsed;
            }
          } catch (e) {
            console.error('Cache read error', e);
          }
        }
      } else {
        localStorage.removeItem(ITEMS_CACHE_KEY);
      }

      const currentIds = new Set(currentItems.map((i) => Number(i.id)));
      const idsToFetch = raidItemIds.filter((id) => !currentIds.has(id));

      if (idsToFetch.length === 0) {
        if (items.length !== currentItems.length) {
          dispatch({ type: 'SET_ITEMS', payload: currentItems });
        }
        return;
      }

      try {
        const newItems = await fetchItems(idsToFetch);
        const uniqueItems: Items[] = [];
        const seen = new Set<number>();
        for (const item of [...currentItems, ...newItems]) {
          if (!seen.has(Number(item.id))) {
            seen.add(Number(item.id));
            uniqueItems.push(item);
          }
        }

        dispatch({ type: 'SET_ITEMS', payload: uniqueItems });
        try {
          localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(uniqueItems));
        } catch (e) {
          console.error('Failed to save items to localStorage', e);
        }
      } catch (e) {
        console.error('Failed to fetch items', e);
      }
    },
    [raidItemIds, items],
  );

  useEffect(() => {
    if (bosses.length > 0) updateItemState(false);
  }, [bosses, updateItemState]);

  const { data: fetchedPlayers = [] } = useCharacters(realmId);

  useEffect(() => {
    if (Array.isArray(fetchedPlayers) && fetchedPlayers.length > 0) {
      dispatch({ type: 'SET_PLAYERS', payload: fetchedPlayers });
    }
  }, [fetchedPlayers]);

  const gainsQuery = useUpgradesBatch(
    raidItemIds,
    difficulty,
    realmId,
    viewMode === 'standard' && Boolean(realmId),
  );
  const wishlistQuery = useWishlistUpgradesBatch(
    raidItemIds,
    difficulty,
    realmId,
    viewMode === 'wishlist' && Boolean(realmId),
  );
  const activeQuery = viewMode === 'standard' ? gainsQuery : wishlistQuery;
  const upgradesByItem = activeQuery.data ?? EMPTY_UPGRADES;
  const itemLevel = getItemLevelForDifficulty(difficulty, extension, season);

  const itemsById = useMemo(() => new Map(items.map((it) => [Number(it.id), it])), [items]);

  const toLootItem = useCallback(
    (loot: { id: number; name: string; icon: string; quality?: number | null }): LootItem => {
      const details = itemsById.get(Number(loot.id));
      return {
        id: Number(loot.id),
        name: details?.name ?? loot.name,
        icon: details?.icon ?? loot.icon,
        quality: details?.quality ?? loot.quality,
      };
    },
    [itemsById],
  );

  const validatedActive = filterEnabled && validatedIds.length > 0;
  const searchActive = selectedBossIndex === -1 && searchQuery.trim().length > 0;

  const scopeItems = useMemo(() => {
    const source = selectedBoss ? [selectedBoss] : selectedBossIndex === -1 ? bosses : [];
    const seen = new Set<number>();
    const result: LootItem[] = [];
    for (const boss of source) {
      for (const loot of boss.loot ?? []) {
        const id = Number(loot.id);
        if (seen.has(id)) continue;
        seen.add(id);
        result.push(toLootItem(loot));
      }
    }
    const validated = validatedActive
      ? result.filter((it) => validatedIds.includes(it.id))
      : result;
    if (!searchActive) return validated;
    const q = searchQuery.trim().toLowerCase();
    return validated.filter((it) => it.name.toLowerCase().includes(q));
  }, [
    selectedBoss,
    selectedBossIndex,
    bosses,
    toLootItem,
    validatedActive,
    validatedIds,
    searchActive,
    searchQuery,
  ]);

  const filteredPlayers = useMemo(
    () => players.filter((p) => matchesRoleFilter(p.specialization?.role, roleFilter)),
    [players, roleFilter],
  );

  const gainEntries = useMemo(
    () =>
      viewMode === 'standard'
        ? summarizeGains(scopeItems, upgradesByItem, { roleFilter, itemLevel })
        : [],
    [viewMode, scopeItems, upgradesByItem, roleFilter, itemLevel],
  );
  const wishByItem = useMemo(
    () =>
      viewMode === 'wishlist' && groupBy === 'item'
        ? summarizeWishesByItem(scopeItems, upgradesByItem, filteredPlayers, itemLevel)
        : [],
    [viewMode, groupBy, scopeItems, upgradesByItem, filteredPlayers, itemLevel],
  );
  const wishByPlayer = useMemo(
    () =>
      viewMode === 'wishlist' && groupBy === 'player'
        ? summarizeWishesByPlayer(scopeItems, upgradesByItem, filteredPlayers, itemLevel)
        : [],
    [viewMode, groupBy, scopeItems, upgradesByItem, filteredPlayers, itemLevel],
  );

  const visibleCount =
    viewMode === 'standard'
      ? gainEntries.length
      : groupBy === 'item'
        ? wishByItem.length
        : wishByPlayer.length;

  const countOptions = useMemo(
    () => ({ view: viewMode, roleFilter, itemLevel, players: filteredPlayers }),
    [viewMode, roleFilter, itemLevel, filteredPlayers],
  );
  const bossCounts = useMemo(
    () =>
      activeQuery.isSuccess
        ? bosses.map((boss) =>
            countInterestingItems(
              (boss.loot ?? []).map((l) => l.id),
              upgradesByItem,
              countOptions,
            ),
          )
        : null,
    [activeQuery.isSuccess, bosses, upgradesByItem, countOptions],
  );
  const interestingCount = activeQuery.isSuccess
    ? countInterestingItems(
        scopeItems.map((it) => it.id),
        upgradesByItem,
        countOptions,
      )
    : null;

  const isWishRow = (row: UpgradeBatchRow) => Boolean(row.isWishlist);
  const rowFilter = viewMode === 'wishlist' ? isWishRow : undefined;
  const reason = emptyReason({
    view: viewMode,
    itemCount: scopeItems.length,
    searchActive,
    raidRowCount: countRows(raidItemIds, upgradesByItem, rowFilter),
    scopeRowCount: countRows(
      scopeItems.map((it) => it.id),
      upgradesByItem,
      rowFilter,
    ),
    visibleCount,
  });
  const isLoading = isBossesLoading || (raidItemIds.length > 0 && activeQuery.isPending);

  const selectBoss = (i: number) => {
    setSearchQuery('');
    navigate(`/${guild}/${extension}/${season}/boss/${i === -1 ? 'all' : String(i)}`);
  };

  if (parsedIndex === 'invalid' && bosses.length > 0) {
    return <Navigate to={`/${guild}/${extension}/${season}/boss/0`} replace />;
  }

  const raidName = bosses.find((b) => b.raidName)?.raidName ?? null;

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <Stack gap={0} className={styles.list}>
        {Array.from({ length: 5 }, (_, i) => (
          <Group key={i} gap="md" p={12} wrap="nowrap">
            <Skeleton height={40} width={40} radius="sm" />
            <Skeleton height={14} width="22%" radius="sm" />
            <Skeleton height={26} width="40%" radius="sm" ml="auto" />
          </Group>
        ))}
      </Stack>
    );
  } else if (activeQuery.isError || reason) {
    content = (
      <DroptimizerEmptyState
        reason={activeQuery.isError ? 'error' : (reason ?? 'no_loot')}
        view={viewMode}
        difficulty={difficulty}
        bossName={selectedBoss?.name ?? null}
        roleLabel={t(`toolbar.roles.${roleFilter}`)}
        search={searchQuery.trim()}
        trackingPath={`/${guild}/${extension}/tracking`}
        wishlistPath={`/${guild}/${extension}/wishlist`}
        onDifficulty={setDifficulty}
        onAllBosses={() => selectBoss(-1)}
        onResetRole={() => dispatch({ type: 'SET_ROLE_FILTER', payload: 'all' })}
        onClearSearch={() => setSearchQuery('')}
        onRetry={() => activeQuery.refetch()}
      />
    );
  } else if (viewMode === 'standard') {
    content = <GainsView entries={gainEntries} itemLevel={itemLevel} />;
  } else if (groupBy === 'item') {
    content = <WishlistView groupBy="item" entries={wishByItem} itemLevel={itemLevel} />;
  } else {
    content = <WishlistView groupBy="player" entries={wishByPlayer} itemLevel={itemLevel} />;
  }

  return (
    <Box className={instancePanelOpen ? styles.withPanel : undefined}>
      <Container my="xl" size="xl" className={styles.page}>
        <Stack gap="lg">
          <DroptimizerHeader
            boss={selectedBoss}
            bossIndex={selectedBossIndex}
            raidName={raidName}
            itemCount={scopeItems.length}
            interestingCount={interestingCount}
            view={viewMode}
            difficulty={difficulty}
            onDifficulty={setDifficulty}
            actions={
              <Can I={Permission.MANAGE_INSTANCE}>
                <Button
                  variant={instancePanelOpen ? 'filled' : 'default'}
                  color={instancePanelOpen ? 'brand.5' : undefined}
                  leftSection={<IconSwords size={16} stroke={1.5} />}
                  onClick={() =>
                    dispatch({ type: 'SET_INSTANCE_PANEL_OPEN', payload: !instancePanelOpen })
                  }
                  aria-pressed={instancePanelOpen}
                >
                  {t('page.instance')}
                </Button>
              </Can>
            }
          />

          <BossPicker
            bosses={bosses}
            activeIndex={selectedBossIndex}
            counts={bossCounts}
            view={viewMode}
            onSelect={selectBoss}
          />

          <DroptimizerToolbar
            view={viewMode}
            groupBy={groupBy}
            roleFilter={roleFilter}
            search={selectedBossIndex === -1 ? searchQuery : null}
            validatedFilter={validatedActive}
            resultCount={isLoading || activeQuery.isError || reason ? null : visibleCount}
            onView={(value) => dispatch({ type: 'SET_VIEW_MODE', payload: value })}
            onGroupBy={(value) => dispatch({ type: 'SET_GROUP_BY', payload: value })}
            onRole={(value) => dispatch({ type: 'SET_ROLE_FILTER', payload: value })}
            onSearch={setSearchQuery}
            onClearValidated={() => setFilterEnabled(false)}
          />

          {content}
        </Stack>
      </Container>

      {import.meta.env.DEV && (
        <Box
          style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9000, opacity: 0.5 }}
          bg="black"
          p="4px 8px"
          bdrs="md"
        >
          <Group gap="xs">
            <Tooltip label={t('page.force_refresh')}>
              <ActionIcon
                size="sm"
                color="red"
                variant="subtle"
                onClick={() => updateItemState(true)}
              >
                🔄
              </ActionIcon>
            </Tooltip>
            <Text size="xs" c="dimmed" style={{ userSelect: 'none' }}>
              {t('page.tooltip_dev', { count: items.length, boss: selectedBoss?.name })}
            </Text>
          </Group>
        </Box>
      )}

      <Can I={Permission.MANAGE_INSTANCE}>
        {instancePanelOpen && (
          <Box
            pos="fixed"
            right={0}
            top={0}
            w="min(600px, 100vw)"
            h="100vh"
            bg="var(--mantine-color-dark-7)"
            style={{ overflowY: 'auto', zIndex: 1000, boxSizing: 'border-box' }}
          >
            <InstancePanel
              onClose={() => dispatch({ type: 'SET_INSTANCE_PANEL_OPEN', payload: false })}
            />
          </Box>
        )}
      </Can>
    </Box>
  );
}

function LootsOptimiserPage() {
  const navigate = useNavigate();
  const { canEditAll } = useRealmAccess();
  const { extension, guild } = useRouteParams();

  useEffect(() => {
    if (!canEditAll) {
      navigate(`/${guild}/${extension}/roster`);
    }
  }, [canEditAll, extension, guild, navigate]);

  if (!canEditAll) {
    return null;
  }

  return (
    <ValidatedLootsProvider>
      <BossesProvider>
        <LootsOptimiserContent />
      </BossesProvider>
    </ValidatedLootsProvider>
  );
}

export default LootsOptimiserPage;
