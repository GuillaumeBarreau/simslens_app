import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBuildingCastle,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconHeart,
  IconShield,
  IconSword,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useAuth } from 'contexts';
import { useRealmAccess } from 'contexts';
import dayjs from 'dayjs';
import {
  useCharacters,
  useDungeonAvailabilities,
  useDungeonGroups,
  useUserRealm,
} from 'hooks/queries';
import { useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { DungeonAvailability } from '../../services/dungeonAvailability.service';
import AvailabilityModal from './components/AvailabilityModal';
import DayAvailabilityGantt from './components/DayAvailabilityGantt';
import DungeonGroupSummary from './components/DungeonGroupSummary';
import styles from './DungeonsPage.module.css';
import { initialState, reducer } from './DungeonsPage.reducers';

export default function DungeonsPage() {
  const { t } = useTranslation('dungeons');
  const { user } = useAuth();
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const { canEditAll } = useRealmAccess();
  const { data: characters = [] } = useCharacters(realmData?.id);

  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    currentMonth,
    availabilityModalOpen,
    selectedDate,
    showAllAvailabilities,
    ganttDate,
    currentWeekStart,
  } = state;

  const { data: ganttGroups = [] } = useDungeonGroups(
    realmData?.id || 0,
    ganttDate?.format('YYYY-MM-DD'),
  );
  const navigate = useNavigate();

  const availabilityFilters = useMemo(() => {
    const startDate = dayjs(currentMonth).subtract(1, 'month').startOf('month').toISOString();
    const endDate = dayjs(currentMonth).add(1, 'month').endOf('month').toISOString();

    return {
      realmId: realmData?.id || 0,
      userId:
        showAllAvailabilities && canEditAll ? undefined : user?.id ? String(user.id) : undefined,
      startDate,
      endDate,
    };
  }, [realmData?.id, currentMonth, user?.id, showAllAvailabilities, canEditAll]);

  const { data: availabilities = [] } = useDungeonAvailabilities(availabilityFilters);

  const ganttDayFilters = useMemo(() => {
    if (!ganttDate || !showAllAvailabilities) return { realmId: 0 };
    return {
      realmId: realmData?.id || 0,
      startDate: ganttDate.startOf('day').toISOString(),
      endDate: ganttDate.endOf('day').toISOString(),
    };
  }, [realmData?.id, ganttDate, showAllAvailabilities]);

  const { data: ganttAvailabilities = [] } = useDungeonAvailabilities(ganttDayFilters);

  const availabilitiesByDate = useMemo(() => {
    const grouped: Record<string, DungeonAvailability[]> = {};
    availabilities.forEach((avail) => {
      const dateKey = dayjs(avail.date).format('YYYY-MM-DD');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(avail);
    });
    return grouped;
  }, [availabilities]);

  const handlePreviousMonth = () => {
    dispatch({
      type: 'SET_CURRENT_MONTH',
      payload: dayjs(currentMonth).subtract(1, 'month').toDate(),
    });
  };

  const handleNextMonth = () => {
    dispatch({ type: 'SET_CURRENT_MONTH', payload: dayjs(currentMonth).add(1, 'month').toDate() });
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayIndex = (i + 1) % 7;
      const day = dayjs().day(dayIndex).format('ddd');
      return day.charAt(0).toUpperCase() + day.slice(1);
    });
  }, []);

  const calendarDays = useMemo(() => {
    const firstDay = dayjs(currentMonth).startOf('month');
    const lastDay = dayjs(currentMonth).endOf('month');
    const startDow = firstDay.day();
    const endDow = lastDay.day();
    const start = firstDay.subtract(startDow === 0 ? 6 : startDow - 1, 'day');
    const end = lastDay.add(endDow === 0 ? 0 : 7 - endDow, 'day');
    const days = [];
    let current = start;

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      days.push(current.toDate());
      current = current.add(1, 'day');
    }

    return days;
  }, [currentMonth]);

  const weekCalendarDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => currentWeekStart.add(i, 'day').toDate());
  }, [currentWeekStart]);

  const selectedDayAvailabilities = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = dayjs(selectedDate).format('YYYY-MM-DD');
    const all = availabilitiesByDate[dateKey] || [];
    return all.filter((a) => String(a.userId) === String(user?.id));
  }, [selectedDate, availabilitiesByDate, user?.id]);

  const handleDayClick = (date: Date) => {
    if (showAllAvailabilities) {
      dispatch({ type: 'SET_GANTT_DATE', payload: dayjs(date) });
    } else {
      dispatch({ type: 'SET_SELECTED_DATE', payload: date });
      dispatch({ type: 'SET_AVAILABILITY_MODAL_OPEN', payload: true });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'TANK':
        return <IconShield size={10} />;
      case 'HEALER':
        return <IconHeart size={10} />;
      default:
        return <IconSword size={10} />;
    }
  };

  return (
    <Container mt="xl" mb="xl" size="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Group gap="md">
              <ThemeIcon
                size="xl"
                variant="gradient"
                gradient={{ from: 'orange.5', to: 'orange.7' }}
                radius="md"
              >
                <IconBuildingCastle size={28} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {t('subtitle')}
                </Text>
                <Title order={2}>{t('title')}</Title>
              </div>
            </Group>
          </Stack>

          <Group gap="sm">
            <Button
              variant={showAllAvailabilities ? 'filled' : 'light'}
              color="gray"
              onClick={() => {
                const newVal = !showAllAvailabilities;
                dispatch({ type: 'SET_SHOW_ALL_AVAILABILITIES', payload: newVal });
                if (newVal) {
                  dispatch({ type: 'SET_GANTT_DATE', payload: dayjs() });
                } else {
                  dispatch({ type: 'SET_GANTT_DATE', payload: null });
                }
              }}
            >
              {showAllAvailabilities ? t('availability.hideAll') : t('availability.viewAll')}
            </Button>
          </Group>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Flex justify="space-between" align="center">
            <Button
              variant="subtle"
              leftSection={<IconChevronLeft size={18} />}
              onClick={
                showAllAvailabilities
                  ? () =>
                      dispatch({
                        type: 'SET_CURRENT_WEEK_START',
                        payload: currentWeekStart.subtract(1, 'week'),
                      })
                  : handlePreviousMonth
              }
              color="orange.4"
            >
              {showAllAvailabilities ? t('weekView.previousWeek') : t('previousMonth')}
            </Button>

            <Group>
              <Text size="xl" fw={700}>
                {showAllAvailabilities
                  ? `${currentWeekStart.format('D MMM')} — ${currentWeekStart.add(6, 'day').format('D MMM YYYY')}`
                  : dayjs(currentMonth).format('MMMM YYYY')}
              </Text>
            </Group>

            <Button
              variant="subtle"
              rightSection={<IconChevronRight size={18} />}
              onClick={
                showAllAvailabilities
                  ? () =>
                      dispatch({
                        type: 'SET_CURRENT_WEEK_START',
                        payload: currentWeekStart.add(1, 'week'),
                      })
                  : handleNextMonth
              }
              color="orange.4"
            >
              {showAllAvailabilities ? t('weekView.nextWeek') : t('nextMonth')}
            </Button>
          </Flex>
        </Card>

        {/* Calendar Grid: week view (showAll) or month view */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Box>
            <SimpleGrid cols={7} spacing="xs" className={styles.calendarGrid}>
              {weekDays.map((day) => (
                <Text
                  key={day}
                  ta="center"
                  fw={600}
                  size="sm"
                  c="dimmed"
                  className={styles.weekDayHeader}
                >
                  {day}
                </Text>
              ))}
            </SimpleGrid>

            <SimpleGrid cols={7} spacing="xs">
              {(showAllAvailabilities ? weekCalendarDays : calendarDays).map((date) => {
                const dateKey = dayjs(date).format('YYYY-MM-DD');
                const isToday = dayjs(date).isSame(dayjs(), 'day');
                const isCurrentMonth = dayjs(date).isSame(currentMonth, 'month');
                const isPast = dayjs(date).isBefore(dayjs(), 'day');
                const dayAvails = availabilitiesByDate[dateKey] || [];
                const isGanttSelected =
                  showAllAvailabilities && ganttDate?.format('YYYY-MM-DD') === dateKey;

                const cellClasses = [styles.calendarCell];
                if (isToday) cellClasses.push(styles.calendarCellToday);
                if (!showAllAvailabilities && !isCurrentMonth)
                  cellClasses.push(styles.calendarCellOtherMonth);
                if (isGanttSelected) cellClasses.push(styles.calendarCellSelected);
                if (isPast) cellClasses.push(styles.calendarCellPast);

                return (
                  <Box
                    key={dateKey}
                    onClick={isPast && !canEditAll ? undefined : () => handleDayClick(date)}
                    className={cellClasses.join(' ')}
                  >
                    <Flex justify="space-between" align="flex-start" mb="xs">
                      <Text size="sm" fw={isToday ? 700 : 500} c={isToday ? 'white' : undefined}>
                        {showAllAvailabilities ? dayjs(date).format('D MMM') : date.getDate()}
                      </Text>

                      {dayAvails.length > 0 && (
                        <Badge size="xs" color="orange" variant="light">
                          {dayAvails.length}
                        </Badge>
                      )}
                    </Flex>

                    {dayAvails.length > 0 && (
                      <Stack gap={4}>
                        {dayAvails.slice(0, 3).map((avail) => {
                          const roles: string[] = (() => {
                            try {
                              return JSON.parse(avail.roles);
                            } catch {
                              return [];
                            }
                          })();
                          const isOwn = String(avail.userId) === String(user?.id);

                          return (
                            <Tooltip
                              key={avail.id}
                              label={`${avail.type} ${avail.startTime}-${avail.endTime} | ${roles.join(', ')}`}
                            >
                              <Box
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Badge
                                  size="xs"
                                  color={avail.type === 'M+' ? 'orange' : 'blue'}
                                  variant={isOwn ? 'filled' : 'light'}
                                  style={{ flexShrink: 0 }}
                                >
                                  {avail.type}
                                </Badge>
                                <Group gap={2} style={{ flexShrink: 0 }}>
                                  {roles.map((role) => (
                                    <span key={role}>{getRoleIcon(role)}</span>
                                  ))}
                                </Group>
                                <Text
                                  size="xs"
                                  lineClamp={1}
                                  c={isToday ? 'white' : 'dimmed'}
                                  style={{ flex: 1 }}
                                >
                                  <IconClock
                                    size={10}
                                    style={{ display: 'inline', verticalAlign: 'middle' }}
                                  />{' '}
                                  {avail.startTime}-{avail.endTime}
                                </Text>
                              </Box>
                            </Tooltip>
                          );
                        })}
                        {dayAvails.length > 3 && (
                          <Text size="xs" c="dimmed" ta="center">
                            +{dayAvails.length - 3}
                          </Text>
                        )}
                      </Stack>
                    )}

                    {canEditAll && (!isPast || (isPast && canEditAll)) && (
                      <Group
                        gap={4}
                        wrap="nowrap"
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                        }}
                      >
                        <Tooltip
                          label={t('composer.viewSummary') || 'Voir le résumé'}
                          position="top"
                          withArrow
                        >
                          <ActionIcon
                            variant="default"
                            radius="xl"
                            size={24}
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: 'SET_SHOW_ALL_AVAILABILITIES', payload: true });
                              dispatch({ type: 'SET_GANTT_DATE', payload: dayjs(date) });
                            }}
                          >
                            <IconUsersGroup size={14} color="var(--mantine-color-gray-5)" />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label={t('composer.title')} position="top" withArrow>
                          <ActionIcon
                            variant="default"
                            radius="xl"
                            size={24}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`composer/${dateKey}`);
                            }}
                          >
                            <IconBuildingCastle size={14} color="var(--mantine-color-gray-5)" />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    )}
                  </Box>
                );
              })}
            </SimpleGrid>
          </Box>
        </Card>

        {/* Day Gantt (shown below calendar when a day is selected in "view all" mode) */}
        {showAllAvailabilities && ganttDate && realmData?.id && (
          <DayAvailabilityGantt
            availabilities={ganttAvailabilities}
            date={ganttDate}
            onCompose={
              canEditAll ? () => navigate(`composer/${ganttDate.format('YYYY-MM-DD')}`) : undefined
            }
          />
        )}

        {showAllAvailabilities && ganttDate && ganttGroups.length > 0 && (
          <DungeonGroupSummary
            groups={ganttGroups}
            characters={characters}
            realmId={realmData?.id || 0}
            currentUserId={user?.id}
          />
        )}

        {user && realmData?.id && (
          <AvailabilityModal
            opened={availabilityModalOpen}
            onClose={() => {
              dispatch({ type: 'SET_AVAILABILITY_MODAL_OPEN', payload: false });
              dispatch({ type: 'SET_SELECTED_DATE', payload: null });
            }}
            realmId={realmData.id}
            dayAvailabilities={selectedDayAvailabilities}
            selectedDate={selectedDate}
          />
        )}
      </Stack>
    </Container>
  );
}
