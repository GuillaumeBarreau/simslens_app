import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  Image,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconMinus, IconPlus, IconTrophy } from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { BossImageCard } from 'components/domain/tracking/BossImageCard/BossImageCard';
import { API_VERSION } from 'config/apiConstants';
import { useDifficulty } from 'contexts';
import { useAuth } from 'contexts/AuthContext';
import { useInstances } from 'hooks/queries';
import { useUserRealm } from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import { useBossesContext } from 'pages/LootsOptimiserPage/contexts/BossesContext';
import { useValidatedLoots } from 'pages/LootsOptimiserPage/contexts/ValidatedLootsContext';
import React, { useCallback, useEffect, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api, { createLoot, fetchItem, fetchLoots } from 'services/api';
import type { Item } from 'types/loot.types';
import type { Instance } from 'types/raid';
import type { InstanceBoss } from 'types/shared';
import { getItemLevelForDifficulty } from 'utils/getItemLevelForDifficulty';
import { getQualityColor } from 'utils/qualityColors';
import { handleIconError, resolveBlizzardIcon, resolveFallbackIcon } from 'utils/resolveIconPath';

interface LootCount {
  [lootId: number]: number;
}

type LootRow = {
  id: number;
  instanceId: number;
  bossId: number;
  itemId: number;
  item_name?: string;
  item_icon?: string;
  quality?: number;
  itemLevel?: number;
};

type LootResult = LootRow;

type CompletedBoss = {
  name: string;
  completedAt: string;
  killedAt?: string | null;
  loots: LootResult[];
};

type State = {
  selectedBoss: number | null;
  lootCounts: LootCount;
  isValidating: boolean;
  completedBosses: Record<number, CompletedBoss>;
  displayingBossResults: number | null;
  loadedInstanceId: number | null;
  itemDetails: Record<number, Item>;
};

const initialState: State = {
  selectedBoss: null,
  lootCounts: {},
  isValidating: false,
  completedBosses: {},
  displayingBossResults: null,
  loadedInstanceId: null,
  itemDetails: {},
};

type Action =
  | { type: 'SET_SELECTED_BOSS'; payload: number | null }
  | { type: 'SET_LOOT_COUNTS'; payload: LootCount }
  | { type: 'SET_IS_VALIDATING'; payload: boolean }
  | { type: 'SET_COMPLETED_BOSSES'; payload: Record<number, CompletedBoss> }
  | { type: 'SET_DISPLAYING_BOSS_RESULTS'; payload: number | null }
  | { type: 'SET_LOADED_INSTANCE_ID'; payload: number | null }
  | { type: 'SET_ITEM_DETAILS'; payload: Record<number, Item> }
  | { type: 'MERGE_ITEM_DETAILS'; payload: Record<number, Item> }
  | { type: 'INCREMENT_LOOT_COUNT'; payload: number }
  | { type: 'CHANGE_LOOT_COUNT'; payload: { lootId: number; delta: number } }
  | { type: 'RESET_INSTANCE'; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SELECTED_BOSS':
      return { ...state, selectedBoss: action.payload };
    case 'SET_LOOT_COUNTS':
      return { ...state, lootCounts: action.payload };
    case 'SET_IS_VALIDATING':
      return { ...state, isValidating: action.payload };
    case 'SET_COMPLETED_BOSSES':
      return { ...state, completedBosses: action.payload };
    case 'SET_DISPLAYING_BOSS_RESULTS':
      return { ...state, displayingBossResults: action.payload };
    case 'SET_LOADED_INSTANCE_ID':
      return { ...state, loadedInstanceId: action.payload };
    case 'SET_ITEM_DETAILS':
      return { ...state, itemDetails: action.payload };
    case 'MERGE_ITEM_DETAILS':
      return { ...state, itemDetails: { ...state.itemDetails, ...action.payload } };
    case 'INCREMENT_LOOT_COUNT': {
      const id = action.payload;
      return {
        ...state,
        lootCounts: {
          ...state.lootCounts,
          [id]: state.lootCounts[id] ? state.lootCounts[id] + 1 : 1,
        },
      };
    }
    case 'CHANGE_LOOT_COUNT': {
      const { lootId, delta } = action.payload;
      const newCount = (state.lootCounts[lootId] || 0) + delta;
      if (newCount <= 0) {
        const rest = { ...state.lootCounts };
        delete rest[lootId];
        return { ...state, lootCounts: rest };
      }
      return { ...state, lootCounts: { ...state.lootCounts, [lootId]: newCount } };
    }
    case 'RESET_INSTANCE':
      return {
        ...state,
        completedBosses: {},
        displayingBossResults: null,
        selectedBoss: null,
        loadedInstanceId: action.payload,
      };
    default:
      return state;
  }
}

export const LootDrawer: React.FC<{ instanceId?: number }> = ({ instanceId }) => {
  const { t } = useTranslation('droptimizer');
  const navigate = useNavigate();
  const { difficulty } = useDifficulty();
  const { user } = useAuth();
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const { data: instances } = useInstances(realmData?.id);

  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    selectedBoss,
    lootCounts,
    isValidating,
    completedBosses,
    displayingBossResults,
    loadedInstanceId,
    itemDetails,
  } = state;
  const { extension, guild, season } = useRouteParams();
  const itemLevel = getItemLevelForDifficulty(difficulty, extension, season);

  const currentInstance: Instance | undefined = instanceId
    ? instances?.find((i) => i.id === instanceId)
    : instances?.[0];

  if (currentInstance && currentInstance.id !== loadedInstanceId) {
    dispatch({ type: 'RESET_INSTANCE', payload: currentInstance.id });
  }

  const handleBossSelect = (idx: number) => {
    if (completedBosses[idx]) {
      dispatch({ type: 'SET_DISPLAYING_BOSS_RESULTS', payload: idx });
      dispatch({ type: 'SET_SELECTED_BOSS', payload: null });
      try {
        navigate(`/${guild}/${extension}/${season}/boss/${idx}`);
      } catch (e) {
        /* empty */
      }
      return;
    }

    dispatch({ type: 'SET_SELECTED_BOSS', payload: idx });
    dispatch({ type: 'SET_LOOT_COUNTS', payload: {} });
    dispatch({ type: 'SET_DISPLAYING_BOSS_RESULTS', payload: null });
    try {
      navigate(`/${guild}/${extension}/${season}/boss/${idx}`);
    } catch (e) {
      /* empty */
    }
  };

  const handleLootClick = (lootId: number) => {
    dispatch({ type: 'INCREMENT_LOOT_COUNT', payload: lootId });
  };

  const handleCountChange = (lootId: number, delta: number) => {
    dispatch({ type: 'CHANGE_LOOT_COUNT', payload: { lootId, delta } });
  };

  const bosses = useBossesContext();
  const { setValidatedIds, filterEnabled, setFilterEnabled } = useValidatedLoots();

  const reloadBossesStatus = useCallback(async () => {
    if (!currentInstance) return {};
    try {
      const bossesResponse = await api.get(`${API_VERSION}/instances/${currentInstance.id}/bosses`);
      const allInstanceBosses: InstanceBoss[] = bossesResponse.data;
      const newCompletedBosses: Record<number, CompletedBoss> = {};

      for (const instanceBoss of allInstanceBosses) {
        if (!instanceBoss.killed) continue;
        const bossIndex = bosses.findIndex((b) => b.id === instanceBoss.bossId);
        if (bossIndex === -1) continue;

        const lootResponse = await api.get(`${API_VERSION}/loots`, {
          params: { instanceId: currentInstance.id, bossId: instanceBoss.bossId },
        });
        const lootsForBoss: LootRow[] = lootResponse.data;

        newCompletedBosses[bossIndex] = {
          name: bosses[bossIndex].name,
          completedAt: new Date(instanceBoss.killedAt as string).toLocaleString('fr-FR'),
          loots: lootsForBoss,
          killedAt: instanceBoss.killedAt,
        };
      }
      dispatch({ type: 'SET_COMPLETED_BOSSES', payload: newCompletedBosses });
      return newCompletedBosses;
    } catch (error) {
      console.error('Error loading boss status:', error);
      return {};
    }
  }, [currentInstance, bosses]);

  const handleValidate = async () => {
    if (selectedBoss === null || !currentInstance) {
      notifications.show({
        title: t('droptimizer:loot_drawer.error'),
        message: t('droptimizer:loot_drawer.select_boss_error'),
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    dispatch({ type: 'SET_IS_VALIDATING', payload: true });

    try {
      const boss = bosses[selectedBoss];
      const selectedLoots = Object.entries(lootCounts)
        .filter(([, count]) => count > 0)
        .flatMap(([lootId, count]) => Array(count).fill(Number(lootId)));

      if (selectedLoots.length === 0) {
        notifications.show({
          title: t('droptimizer:loot_drawer.error'),
          message: t('droptimizer:loot_drawer.select_loot_error'),
          color: 'red',
          icon: <IconAlertCircle />,
        });
        dispatch({ type: 'SET_IS_VALIDATING', payload: false });
        return;
      }

      const createdLootIds: number[] = [];
      for (const itemId of selectedLoots) {
        const loot = await createLoot({
          instanceId: currentInstance.id,
          bossId: boss.id || selectedBoss,
          itemId: itemId,
        });
        createdLootIds.push(loot.id);
      }

      notifications.show({
        title: t('droptimizer:loot_drawer.loots_created'),
        message: t('droptimizer:loot_drawer.loots_created_msg', { count: createdLootIds.length }),
        color: 'green',
        icon: <IconCheck />,
      });

      try {
        const bossIdToKill = boss.id || selectedBoss;
        await api.patch(
          `${API_VERSION}/instances/${currentInstance.id}/bosses/${bossIdToKill}/kill`,
        );
      } catch (err) {
        console.error('Failed to mark boss as killed:', err);
      }

      const fetchedLoots = await fetchLoots(createdLootIds);
      const itemIds = fetchedLoots.map((l) => Number(l.itemId)).filter(Boolean);

      if (itemIds.length > 0) {
        setValidatedIds(itemIds);
      }

      await reloadBossesStatus();
      dispatch({ type: 'SET_LOOT_COUNTS', payload: {} });
      dispatch({ type: 'SET_DISPLAYING_BOSS_RESULTS', payload: selectedBoss });

      if (selectedBoss !== null) {
        navigate(`/${guild}/${extension}/${season}/boss/${selectedBoss}`);
      }
    } catch (error) {
      console.error('Validation error:', error);
      notifications.show({
        title: t('droptimizer:loot_drawer.error'),
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      dispatch({ type: 'SET_IS_VALIDATING', payload: false });
    }
  };

  const loadBossesStatus = useCallback(async () => {
    if (!currentInstance) return {};
    return await reloadBossesStatus();
  }, [currentInstance, reloadBossesStatus]);

  useEffect(() => {
    if (!bosses || bosses.length === 0) return;
    if (!currentInstance) return;

    let isMounted = true;

    loadBossesStatus().then((completedBossesMap) => {
      if (!isMounted) return;
      const firstAliveBoss = bosses.findIndex((_, idx) => !completedBossesMap[idx]);
      if (firstAliveBoss !== -1 && isMounted) {
        dispatch({ type: 'SET_SELECTED_BOSS', payload: firstAliveBoss });
        navigate(`/${guild}/${extension}/${season}/boss/${firstAliveBoss}`);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    currentInstance?.id,
    bosses.length,
    bosses,
    currentInstance,
    loadBossesStatus,
    navigate,
    extension,
    guild,
    season,
  ]);

  useEffect(() => {
    if (selectedBoss === null) return;

    const boss = bosses[selectedBoss];
    if (!boss || !boss.loot) return;

    const idsToFetch: number[] = [];
    boss.loot.forEach((l) => {
      const id = Number(l.id);
      if (!itemDetails[id]) idsToFetch.push(id);
    });

    if (idsToFetch.length === 0) return;

    let isMounted = true;

    Promise.all(idsToFetch.map((id) => fetchItem(id)))
      .then((results) => {
        if (!isMounted) return;
        const map: Record<number, Item> = {};
        results.forEach((r) => {
          if (r && r.id) map[Number(r.id)] = r;
        });
        dispatch({ type: 'MERGE_ITEM_DETAILS', payload: map });
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Error fetching item details:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBoss, bosses, itemDetails]);

  return (
    <Flex direction="column" h="100%" style={{ overflow: 'hidden' }}>
      <Box p="md" pb="xs">
        <Title order={4} mb="sm">
          {t('droptimizer:loot_drawer.select_boss')}
        </Title>
        <Flex gap={4} align="center" justify="space-between" w="100%">
          {bosses.map((boss, idx) => {
            const isCompleted = completedBosses[idx];
            const isSelected = selectedBoss === idx || displayingBossResults === idx;
            return (
              <Box key={boss.name} style={{ flex: 1, minWidth: 0 }}>
                <BossImageCard
                  boss={boss}
                  idx={idx}
                  fluid
                  isSelected={isSelected}
                  isCompleted={Boolean(isCompleted)}
                  completedAt={isCompleted?.completedAt}
                  onSelect={handleBossSelect}
                />
              </Box>
            );
          })}
        </Flex>
      </Box>

      <Divider />

      <ScrollArea
        style={{ flex: 1 }}
        p="md"
        viewportProps={{ style: { scrollbarGutter: 'stable' } }}
      >
        {selectedBoss !== null && displayingBossResults === null && bosses[selectedBoss] && (
          <Stack gap="sm">
            <Title order={5} c="dimmed" mb={4}>
              {t('droptimizer:loot_drawer.loots_available')}
            </Title>
            {bosses[selectedBoss]?.loot?.map((loot) => {
              const count = lootCounts[loot.id] || 0;
              const item = itemDetails[loot.id];

              return (
                <Card
                  key={loot.id}
                  padding="sm"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleLootClick(loot.id)}
                >
                  <Flex justify="space-between" align="center">
                    <Group gap="md" style={{ flex: 1 }}>
                      {item ? (
                        <Image
                          src={resolveBlizzardIcon(item.icon)}
                          fallbackSrc={resolveFallbackIcon(item.icon)}
                          alt={item.name}
                          w={42}
                          h={42}
                          radius="sm"
                        />
                      ) : (
                        <Box w={42} h={42} bg="gray.1" style={{ borderRadius: 4 }} />
                      )}

                      <Box>
                        <Text
                          fw={600}
                          style={{ color: getQualityColor(item?.quality ?? loot.quality ?? 4) }}
                        >
                          {item
                            ? item.name
                            : t('droptimizer:loot_drawer.item_placeholder', { id: loot.id })}
                        </Text>
                        <Text size="xs" c="dimmed">
                          ilvl {itemLevel}
                        </Text>
                      </Box>
                    </Group>

                    {count > 0 && (
                      <Group gap={4} onClick={(e) => e.stopPropagation()}>
                        <ActionIcon
                          variant="light"
                          color="gray"
                          size="lg"
                          onClick={() => handleCountChange(loot.id, -1)}
                        >
                          <IconMinus size={16} />
                        </ActionIcon>
                        <Badge size="lg" variant="filled" color="blue" circle>
                          {count}
                        </Badge>
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="lg"
                          onClick={() => handleCountChange(loot.id, 1)}
                        >
                          <IconPlus size={16} />
                        </ActionIcon>
                      </Group>
                    )}
                  </Flex>
                </Card>
              );
            })}
          </Stack>
        )}

        {displayingBossResults !== null && completedBosses[displayingBossResults] && (
          <Stack gap="md">
            <Paper p="md" withBorder radius="md">
              <Group justify="space-between" mb="md">
                <Box>
                  <Group gap="xs">
                    <ThemeIcon color="green" variant="light">
                      <IconCheck size={16} />
                    </ThemeIcon>
                    <Title order={4}>{completedBosses[displayingBossResults].name}</Title>
                  </Group>
                  <Text size="sm" c="dimmed" mt={4}>
                    {t('droptimizer:loot_drawer.killed_at', {
                      date: completedBosses[displayingBossResults].completedAt,
                    })}
                  </Text>
                </Box>
                <Badge size="lg" color="green">
                  {completedBosses[displayingBossResults].loots.length} loots
                </Badge>
              </Group>

              <Divider my="sm" />

              <Stack gap="sm">
                {completedBosses[displayingBossResults].loots.map((loot) => {
                  return (
                    <Paper key={loot.id} p="sm" withBorder radius="sm" bg="app.7">
                      <Group justify="space-between" mb="xs">
                        <Box style={{ flex: 1 }}>
                          <Flex gap="xs">
                            <WowheadLink itemId={loot.itemId} region="eu">
                              <Group
                                style={{
                                  color: getQualityColor(loot.quality ?? 4),
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '4px 6px',
                                  minHeight: 32,
                                }}
                              >
                                <img
                                  alt={loot.item_name ?? String(loot.itemId)}
                                  src={resolveBlizzardIcon(loot.item_icon)}
                                  onError={handleIconError(loot.item_icon)}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 6,
                                    flex: '0 0 32px',
                                  }}
                                />
                                <Text
                                  style={{
                                    fontWeight: 'bold',
                                  }}
                                  size="sm"
                                >
                                  {`${loot.item_name ?? loot.itemId}`}
                                </Text>
                              </Group>
                            </WowheadLink>
                            <Text size="xs" c="dimmed" ml="auto">
                              Loot #{loot.id}
                            </Text>
                          </Flex>
                        </Box>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            </Paper>

            <Group>
              <Button
                variant="default"
                onClick={() => dispatch({ type: 'SET_DISPLAYING_BOSS_RESULTS', payload: null })}
              >
                {t('droptimizer:loot_drawer.back_selection')}
              </Button>
              <Button
                variant={filterEnabled ? 'filled' : 'light'}
                color={filterEnabled ? 'green' : 'gray'}
                onClick={() => setFilterEnabled(!filterEnabled)}
                leftSection={<IconTrophy size={16} />}
              >
                {filterEnabled
                  ? t('droptimizer:loot_drawer.results_mode_active')
                  : t('droptimizer:loot_drawer.view_results')}
              </Button>
            </Group>
          </Stack>
        )}
      </ScrollArea>

      {selectedBoss !== null && displayingBossResults === null && (
        <Box
          p="md"
          style={{
            zIndex: 10,
          }}
        >
          <Button
            fullWidth
            size="lg"
            color="green"
            onClick={handleValidate}
            disabled={Object.keys(lootCounts).length === 0}
            loading={isValidating}
            leftSection={<IconCheck size={20} />}
          >
            {isValidating
              ? t('droptimizer:loot_drawer.validating')
              : t('droptimizer:loot_drawer.validate_selection', {
                  count: Object.values(lootCounts).reduce((a, b) => a + b, 0),
                })}
          </Button>
        </Box>
      )}
    </Flex>
  );
};
