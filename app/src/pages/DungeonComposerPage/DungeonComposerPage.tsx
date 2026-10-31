import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { TimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBuildingCastle,
  IconCheck,
  IconHeart,
  IconPlus,
  IconShield,
  IconSparkles,
  IconSword,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { useAuth, useRealmAccess } from 'contexts';
import dayjs from 'dayjs';
import {
  useCharacters,
  useCreateDungeonGroup,
  useDeleteDungeonGroup,
  useDungeonAvailabilities,
  useDungeonGroups,
  useDungeonGroupsWeek,
  useUpdateDungeonGroup,
  useUserRealm,
} from 'hooks/queries';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Character } from 'types/character.types';
import type { DungeonGroup } from 'types/dungeon.types';
import { normalizeClass } from 'utils';

import DungeonAvailableCharactersTable from './components/DungeonAvailableCharactersTable';
import { initialState, reducer } from './DungeonComposerPage.reducers';

const GROUP_COLORS = ['orange', 'cyan', 'grape', 'lime', 'pink', 'yellow', 'indigo', 'teal'];

export default function DungeonComposerPage() {
  const { date: dateParam } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('dungeons');
  const { user } = useAuth();
  const { canEditAll } = useRealmAccess();
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const { data: characters = [] } = useCharacters(realmData?.id);

  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    selectedGroupId,
    isCreating,
    newStartTime,
    newEndTime,
    newType,
    startDropdownOpened,
    endDropdownOpened,
  } = state;
  const [searchParams] = useSearchParams();
  const preselectedGroupId = searchParams.get('groupId')
    ? parseInt(searchParams.get('groupId')!)
    : null;
  const hasPreselected = useRef<string | null>(null);

  const composerDate = dateParam ? dayjs(dateParam) : null;
  const realmId = realmData?.id || 0;
  const dateStr = composerDate?.format('YYYY-MM-DD') || '';

  const wowWeekBounds = useMemo(() => {
    if (!composerDate) return null;
    const ref = composerDate.hour(12).minute(0).second(0).millisecond(0);
    const dow = ref.day();
    const daysBack = (dow - 3 + 7) % 7;
    const weekStart = ref.subtract(daysBack, 'day').startOf('day');
    const weekEnd = weekStart.add(6, 'day').endOf('day');
    return {
      weekStart: weekStart.format('YYYY-MM-DD'),
      weekEnd: weekEnd.format('YYYY-MM-DD'),
    };
  }, [composerDate]);

  const { data: groups = [], isLoading: isLoadingGroups } = useDungeonGroups(realmId, dateStr);
  const { data: weekGroups = [] } = useDungeonGroupsWeek(
    realmId,
    wowWeekBounds?.weekStart,
    wowWeekBounds?.weekEnd,
  );

  useEffect(() => {
    const key = preselectedGroupId ? `${dateStr}-${preselectedGroupId}` : null;
    if (key && hasPreselected.current !== key && groups.length > 0) {
      const group = groups.find((g) => g.id === preselectedGroupId);
      if (group) {
        dispatch({ type: 'SET_SELECTED_GROUP_ID', payload: preselectedGroupId });
        hasPreselected.current = key;
      }
    }
  }, [groups, preselectedGroupId, dateStr]);

  const createGroup = useCreateDungeonGroup();
  const deleteGroup = useDeleteDungeonGroup();
  const updateGroup = useUpdateDungeonGroup();

  const availabilityFilters = useMemo(() => {
    if (!composerDate || !realmId) return { realmId: 0 };
    return {
      realmId,
      startDate: composerDate.startOf('day').toISOString(),
      endDate: composerDate.endOf('day').toISOString(),
    };
  }, [realmId, composerDate]);

  const { data: availabilities = [], isLoading: isLoadingAvailabilities } =
    useDungeonAvailabilities(availabilityFilters);

  const parseTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const calculateAvailability = (startTime: string, endTime: string, currentGroupId: number) => {
    const groupStart = parseTime(startTime);
    const groupEnd = parseTime(endTime);
    const realmChars = (characters as Character[]).filter((c: Character) => c.realmId === realmId);

    const uniqueUsers: Character[] = [];
    const seenUsers = new Set();
    for (const char of realmChars) {
      if (!seenUsers.has(char.userId)) {
        seenUsers.add(char.userId);
        uniqueUsers.push(char);
      }
    }

    return uniqueUsers.filter((char) => {
      const charAvails = availabilities.filter((a) => a.userId === char.userId);

      const isAvailable = charAvails.some((avail) => {
        const availStart = parseTime(avail.startTime);
        const availEnd = parseTime(avail.endTime);
        return availStart <= groupStart && availEnd >= groupEnd;
      });

      if (!isAvailable) return false;

      const otherGroupAssignments = groups
        .filter((g) => g.id !== currentGroupId)
        .filter((g) => g.members.some((m) => m.userId === char.userId));

      const overlappingGroup = otherGroupAssignments.find((g) => {
        const gStart = parseTime(g.startTime);
        const gEnd = parseTime(g.endTime);
        return Math.max(groupStart, gStart) < Math.min(groupEnd, gEnd);
      });

      return !overlappingGroup;
    }).length;
  };

  const handleCreateGroup = () => {
    if (!composerDate) return;
    const startTime = newStartTime.slice(0, 5);
    const endTime = newEndTime.slice(0, 5);
    createGroup.mutate(
      {
        realmId,
        date: composerDate.format('YYYY-MM-DD'),
        startTime,
        endTime,
        type: newType as 'M0' | 'M+',
      },
      {
        onSuccess: (data) => {
          dispatch({ type: 'SET_IS_CREATING', payload: false });
          dispatch({ type: 'SET_SELECTED_GROUP_ID', payload: data.id });
        },
        onError: (error: Error & { response?: { data?: { error?: string } } }) => {
          notifications.show({
            title: t('messages.error'),
            message: error?.response?.data?.error || error?.message || String(error),
            color: 'red',
          });
        },
      },
    );
  };

  /**
   * Detect time windows where ≥ MIN_GROUP_SIZE unique players are available.
   * Use a fixed GROUP_DURATION sliding window (30-min steps) so the count
   * matches exactly what the character table will show for that group.
   */
  const MIN_GROUP_SIZE = 5;
  const suggestedSlots = useMemo(() => {
    const realmChars = (characters as Character[]).filter((c: Character) => c.realmId === realmId);
    const seenUsers = new Set<string>();
    const uniqueUsers: Character[] = [];
    for (const char of realmChars) {
      if (char.userId && !seenUsers.has(char?.userId)) {
        seenUsers.add(char.userId);
        uniqueUsers.push(char);
      }
    }

    const GROUP_DURATION = 180;
    const STEP = 30;
    const sweepStart = 14 * 60;
    const sweepEnd = 26 * 60 - GROUP_DURATION;

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };

    const results: Array<{ startTime: string; endTime: string; count: number }> = [];

    for (let t = sweepStart; t <= sweepEnd; t += STEP) {
      const windowEnd = t + GROUP_DURATION;
      let count = 0;

      for (const char of uniqueUsers) {
        const charAvails = availabilities.filter((a) => a.userId === char.userId);

        const coversWindow = charAvails.some((avail) => {
          const aStart = parseTime(avail.startTime);
          let aEnd = parseTime(avail.endTime);
          if (aEnd <= aStart) aEnd += 24 * 60;
          return aStart <= t && aEnd >= windowEnd;
        });

        if (!coversWindow) continue;

        const alreadyInAnyGroup = groups.some((g) =>
          g.members.some((m) => m.userId === char.userId),
        );

        if (!alreadyInAnyGroup) count++;
      }

      if (count >= MIN_GROUP_SIZE) {
        results.push({
          startTime: formatTime(t),
          endTime: formatTime(windowEnd),
          count,
        });
      }
    }

    const deduped: Array<{ startTime: string; endTime: string; count: number }> = [];
    for (const r of results) {
      const last = deduped[deduped.length - 1];
      if (!last || parseTime(r.startTime) - parseTime(last.startTime) >= 60) {
        deduped.push(r);
      } else if (r.count > last.count) {
        deduped[deduped.length - 1] = r;
      }
    }

    return deduped;
  }, [availabilities, characters, realmId, groups]);

  const handleDeleteGroup = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteGroup.mutate({ id, realmId });
    if (selectedGroupId === id) dispatch({ type: 'SET_SELECTED_GROUP_ID', payload: null });
  };

  const handleToggleConfirm = (e: React.MouseEvent, group: DungeonGroup) => {
    e.stopPropagation();
    updateGroup.mutate({
      id: group.id,
      realmId,
      payload: { status: group.status === 'CONFIRMED' ? 'DRAFT' : 'CONFIRMED' },
    });
  };

  if (!composerDate || !composerDate.isValid()) {
    return (
      <Center h="calc(100vh - 100px)">
        <Text c="dimmed">{t('messages.error')}</Text>
      </Center>
    );
  }

  if (isLoadingGroups || isLoadingAvailabilities || !realmData) {
    return (
      <Center h="calc(100vh - 100px)">
        <Loader size="xl" />
      </Center>
    );
  }

  if (!canEditAll) {
    return (
      <Center h="calc(100vh - 100px)">
        <Text c="dimmed">{t('messages.error')}</Text>
      </Center>
    );
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <Box
      w="100%"
      p="lg"
      data-breakout
      px="xl"
      style={{
        height: 'calc(100vh - 70px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack gap="xl" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="md">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate(-1)}
            >
              {t('composer.back')}
            </Button>
            <Group gap="xs">
              <IconBuildingCastle size={22} color="var(--mantine-color-orange-6)" />
              <Stack gap={0}>
                <Title order={3} c="white">
                  {t('composer.title')}
                </Title>
                <Text size="sm" c="dimmed">
                  {composerDate.format('dddd D MMMM YYYY')}
                </Text>
              </Stack>
            </Group>
          </Group>

          <Button
            leftSection={<IconPlus size={18} />}
            color="orange"
            onClick={() => dispatch({ type: 'TOGGLE_IS_CREATING' })}
          >
            {t('composer.createGroup')}
          </Button>
        </Group>

        <Collapse in={isCreating}>
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
            <Stack gap="md">
              <Text fw={700} size="sm">
                {t('composer.createGroup')}
              </Text>

              {suggestedSlots.length > 0 ? (
                <Stack gap={6}>
                  <Group gap={6} align="center">
                    <IconSparkles size={13} color="var(--mantine-color-yellow-5)" />
                    <Text size="xs" fw={600} c="yellow.5">
                      Créneaux suggérés
                    </Text>
                  </Group>
                  <Group gap={6} wrap="wrap">
                    {suggestedSlots.map((slot) => (
                      <Tooltip
                        key={`${slot.startTime}-${slot.endTime}`}
                        label={`${slot.count} joueurs disponibles`}
                        position="top"
                        withArrow
                      >
                        <Badge
                          variant="light"
                          color="yellow"
                          size="md"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            dispatch({
                              type: 'SET_START_AND_END_TIME',
                              payload: { startTime: slot.startTime, endTime: slot.endTime },
                            });
                          }}
                          rightSection={
                            <Text size="xs" fw={700} c="yellow.3">
                              {slot.count}
                            </Text>
                          }
                        >
                          {slot.startTime.slice(0, 5)} → {slot.endTime.slice(0, 5)}
                        </Badge>
                      </Tooltip>
                    ))}
                  </Group>
                </Stack>
              ) : (
                <Text size="xs" c="dimmed" fs="italic">
                  Aucune tranche horaire avec assez de joueurs pour ce jour.
                </Text>
              )}

              <Group gap="lg">
                <Stack gap={4}>
                  <Text size="xs" fw={700} c="dimmed">
                    {t('availability.startTime')}
                  </Text>
                  <TimePicker
                    value={newStartTime}
                    onChange={(val) => {
                      dispatch({ type: 'SET_NEW_START_TIME', payload: val });
                      if (newStartTime === '')
                        dispatch({ type: 'SET_START_DROPDOWN_OPENED', payload: false });
                    }}
                    withDropdown
                    onClick={() => dispatch({ type: 'SET_START_DROPDOWN_OPENED', payload: true })}
                    popoverProps={{
                      opened: startDropdownOpened,
                      onChange: (_opened) =>
                        !_opened && dispatch({ type: 'SET_START_DROPDOWN_OPENED', payload: false }),
                    }}
                  />
                </Stack>
                <Stack gap={4}>
                  <Text size="xs" fw={700} c="dimmed">
                    {t('availability.endTime')}
                  </Text>
                  <TimePicker
                    value={newEndTime}
                    onChange={(val) => {
                      dispatch({ type: 'SET_NEW_END_TIME', payload: val });
                      if (newEndTime === '')
                        dispatch({ type: 'SET_END_DROPDOWN_OPENED', payload: false });
                    }}
                    withDropdown
                    onClick={() => dispatch({ type: 'SET_END_DROPDOWN_OPENED', payload: true })}
                    popoverProps={{
                      opened: endDropdownOpened,
                      onChange: (_opened) =>
                        !_opened && dispatch({ type: 'SET_END_DROPDOWN_OPENED', payload: false }),
                    }}
                  />
                </Stack>
                <Stack gap={4}>
                  <Text size="xs" fw={700} c="dimmed">
                    {t('availability.type')}
                  </Text>
                  <SegmentedControl
                    value={newType}
                    onChange={(value) => dispatch({ type: 'SET_NEW_TYPE', payload: value })}
                    data={[
                      { label: 'M+', value: 'M+' },
                      { label: 'M0', value: 'M0' },
                    ]}
                  />
                </Stack>
                <Button
                  mt="auto"
                  onClick={handleCreateGroup}
                  loading={createGroup.isPending}
                  color="orange"
                >
                  {t('actions.create')}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Collapse>

        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Stack gap="md">
              <Title order={4} c="dimmed" tt="uppercase">
                {t('composer.groups')}
              </Title>
              {groups.length === 0 ? (
                <Text size="sm" c="dimmed" fs="italic">
                  {t('composer.noGroups')}
                </Text>
              ) : (
                <ScrollArea
                  style={{ height: 'calc(100vh - 260px)' }}
                  offsetScrollbars
                  scrollbarSize={6}
                >
                  <Stack gap="md" pb="xs">
                    {groups.map((group, idx) => {
                      const isSelected = selectedGroupId === group.id;
                      const isConfirmed = group.status === 'CONFIRMED';
                      const color = GROUP_COLORS[idx % GROUP_COLORS.length];
                      const availableCount = calculateAvailability(
                        group.startTime,
                        group.endTime,
                        group.id,
                      );
                      const totalOccupied = group.members.length + (group.guests?.length ?? 0);
                      const fillPercent = (totalOccupied / 5) * 100;
                      const isFull = totalOccupied >= 5;

                      return (
                        <Card
                          key={group.id}
                          withBorder
                          padding={0}
                          radius="md"
                          onClick={() =>
                            dispatch({ type: 'SET_SELECTED_GROUP_ID', payload: group.id })
                          }
                          style={{
                            cursor: 'pointer',
                            borderColor: isSelected
                              ? `var(--mantine-color-${color}-6)`
                              : isConfirmed
                                ? 'var(--mantine-color-green-8)'
                                : 'transparent',
                            borderWidth: 2,
                            backgroundColor: isConfirmed
                              ? 'rgba(64, 192, 87, 0.06)'
                              : isSelected
                                ? 'var(--mantine-color-dark-6)'
                                : undefined,
                            overflow: 'hidden',
                          }}
                        >
                          <Group wrap="nowrap" gap={0}>
                            <Box
                              style={{
                                width: 4,
                                alignSelf: 'stretch',
                                backgroundColor: `var(--mantine-color-${color}-6)`,
                                flexShrink: 0,
                              }}
                            />

                            <Stack gap={4} p="xs" style={{ flex: 1, minWidth: 0 }}>
                              <Group justify="space-between" wrap="nowrap">
                                <Group gap={4}>
                                  <Badge color={color} variant="filled" size="xs">
                                    G{idx + 1}
                                  </Badge>
                                  <Badge
                                    variant="light"
                                    color={group.type === 'M+' ? 'orange' : 'blue'}
                                    size="xs"
                                  >
                                    {group.type}
                                  </Badge>
                                  {isConfirmed && (
                                    <Badge color="green" variant="light" size="xs">
                                      ✓
                                    </Badge>
                                  )}
                                </Group>
                                <Group gap={4}>
                                  <Tooltip label={t('composer.available')} position="top" withArrow>
                                    <Group gap={4} mr={4}>
                                      <IconUsers size={13} color="var(--mantine-color-dimmed)" />
                                      <Text size="xs" c="dimmed" fw={700}>
                                        {availableCount}
                                      </Text>
                                    </Group>
                                  </Tooltip>
                                  <ActionIcon
                                    variant="subtle"
                                    size="xs"
                                    color={isConfirmed ? 'green' : 'gray'}
                                    onClick={(e) => handleToggleConfirm(e, group)}
                                  >
                                    <IconCheck size={13} />
                                  </ActionIcon>
                                  <ActionIcon
                                    variant="subtle"
                                    size="xs"
                                    color="red"
                                    onClick={(e) => handleDeleteGroup(e, group.id)}
                                  >
                                    <IconTrash size={13} />
                                  </ActionIcon>
                                </Group>
                              </Group>

                              <Group justify="space-between" align="flex-end" wrap="nowrap">
                                <Stack gap={0}>
                                  <Text fw={700} size="sm" lh={1.2}>
                                    {group.startTime} - {group.endTime}
                                  </Text>
                                  <Text size="xs" c="dimmed" fw={600}>
                                    {group.members.length + (group.guests?.length ?? 0)} / 5{' '}
                                    {t('composer.members')}
                                  </Text>
                                  <Group gap={6} mt={2}>
                                    {(() => {
                                      const tanks = group.members.filter(
                                        (m) => m.role === 'TANK',
                                      ).length;
                                      const healers = group.members.filter(
                                        (m) => m.role === 'HEALER',
                                      ).length;
                                      const dps = group.members.filter(
                                        (m) => m.role === 'DPS',
                                      ).length;
                                      return (
                                        <>
                                          <Group gap={2} wrap="nowrap">
                                            <IconShield
                                              size={10}
                                              color={
                                                tanks >= 1
                                                  ? 'var(--mantine-color-blue-4)'
                                                  : 'var(--mantine-color-dark-3)'
                                              }
                                            />
                                            <Text
                                              size="xs"
                                              c={tanks >= 1 ? 'blue.4' : 'dark.3'}
                                              fw={600}
                                            >
                                              {tanks}/1
                                            </Text>
                                          </Group>
                                          <Group gap={2} wrap="nowrap">
                                            <IconHeart
                                              size={10}
                                              color={
                                                healers >= 1
                                                  ? 'var(--mantine-color-green-4)'
                                                  : 'var(--mantine-color-dark-3)'
                                              }
                                            />
                                            <Text
                                              size="xs"
                                              c={healers >= 1 ? 'green.4' : 'dark.3'}
                                              fw={600}
                                            >
                                              {healers}/1
                                            </Text>
                                          </Group>
                                          <Group gap={2} wrap="nowrap">
                                            <IconSword
                                              size={10}
                                              color={
                                                dps >= 3
                                                  ? 'var(--mantine-color-orange-4)'
                                                  : 'var(--mantine-color-dark-3)'
                                              }
                                            />
                                            <Text
                                              size="xs"
                                              c={dps >= 3 ? 'orange.4' : 'dark.3'}
                                              fw={600}
                                            >
                                              {dps}/3
                                            </Text>
                                          </Group>
                                        </>
                                      );
                                    })()}
                                  </Group>
                                </Stack>

                                {group.members.length > 0 && (
                                  <Group gap={3} wrap="nowrap">
                                    {group.members.map((member) => {
                                      const char = (characters as Character[]).find(
                                        (c) => c.userId === member.userId,
                                      );

                                      return (
                                        <Tooltip
                                          key={member.userId}
                                          label={char?.name || member.userId}
                                          position="top"
                                          withArrow
                                          openDelay={200}
                                        >
                                          <img
                                            src={`/src/character/class/${normalizeClass(char?.class)}-icon.svg`}
                                            alt={String(char?.class || '')}
                                            style={{
                                              width: 18,
                                              height: 18,
                                            }}
                                          />
                                        </Tooltip>
                                      );
                                    })}
                                  </Group>
                                )}
                              </Group>

                              <Box
                                style={{
                                  height: 3,
                                  borderRadius: 2,
                                  backgroundColor: 'var(--mantine-color-dark-5)',
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  style={{
                                    height: '100%',
                                    width: `${fillPercent}%`,
                                    borderRadius: 2,
                                    backgroundColor: isFull
                                      ? 'var(--mantine-color-green-6)'
                                      : `var(--mantine-color-${color}-6)`,
                                    transition: 'width 0.3s ease, background-color 0.3s ease',
                                  }}
                                />
                              </Box>
                            </Stack>
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                </ScrollArea>
              )}
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 9 }}>
            {selectedGroup ? (
              <ScrollArea
                style={{ height: 'calc(100vh - 260px)' }}
                offsetScrollbars
                scrollbarSize={6}
              >
                <Stack gap="lg" pb="xs">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Title order={3}>
                        {t('composer.group')} #{groups.indexOf(selectedGroup) + 1}
                      </Title>
                      <Text c="dimmed">
                        {selectedGroup.type} • {selectedGroup.startTime} - {selectedGroup.endTime}
                      </Text>
                    </Stack>
                  </Group>

                  <Divider />

                  <DungeonAvailableCharactersTable
                    key={selectedGroup.id}
                    realmId={realmId}
                    selectedGroup={selectedGroup}
                    groups={groups}
                    availabilities={availabilities}
                    weekGroups={weekGroups}
                    dateStr={dateStr}
                  />
                </Stack>
              </ScrollArea>
            ) : (
              <Center
                h="100%"
                style={{
                  border: '1px dashed var(--mantine-color-dark-4)',
                  borderRadius: 12,
                  minHeight: 300,
                }}
              >
                <Stack align="center" gap="xs">
                  <IconBuildingCastle
                    size={48}
                    color="var(--mantine-color-dark-4)"
                    style={{ opacity: 0.5 }}
                  />
                  <Text c="dimmed" fw={500}>
                    {t('composer.selectGroup')}
                  </Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    color="orange"
                    variant="light"
                    size="sm"
                    onClick={() => dispatch({ type: 'SET_IS_CREATING', payload: true })}
                  >
                    {t('composer.createGroup')}
                  </Button>
                </Stack>
              </Center>
            )}
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  );
}
