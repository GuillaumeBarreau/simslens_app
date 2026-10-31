import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconCalendar,
  IconCalendarOff,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDots,
  IconList,
  IconPlus,
  IconQuestionMark,
  IconTrash,
  IconUserMinus,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import { useAuth } from 'contexts';
import { useRealmAccess } from 'contexts';
import dayjs from 'dayjs';
import { useAbsences, useDeleteAbsence } from 'hooks/queries';
import { useEvents } from 'hooks/queries';
import { useCharacters, useUserRealm } from 'hooks/queries';
import { useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Permission } from 'types/permissions';
import { Can } from 'utils/auth';

import type { RaidEvent } from '../../services/event.service';
import styles from './CalendarPage.module.css';
import { initialState, reducer } from './CalendarPage.reducers';
import AbsenceModal from './components/AbsenceModal';
import CreateEventModal from './components/CreateEventModal';
import EventModal from './components/EventModal';

interface Character {
  id: number;
  name: string;
  class: string | number;
  spec?: string;
  role?: string;
  realm: string;
  ilvl: number;
  userId?: string;
  realmId?: number;
}

export default function CalendarPage() {
  const { t } = useTranslation('calendar');
  const { user } = useAuth();
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const { data: characters = [] } = useCharacters(realmData?.id);
  const { canEditAll } = useRealmAccess();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    selectedEvent,
    createModalOpen,
    editingEvent,
    selectedDate,
    currentMonth,
    eventSelectionModalOpen,
    eventsToSelect,
    selectionMode,
    absenceModalOpen,
    showAllAbsences,
  } = state;

  const eventFilters = useMemo(() => {
    const startDate = dayjs(currentMonth).subtract(1, 'month').startOf('month').toISOString();
    const endDate = dayjs(currentMonth).add(1, 'month').endOf('month').toISOString();

    return {
      realmId: realmData?.id || 0,
      startDate,
      endDate,
      status: 'SCHEDULED' as const,
    };
  }, [realmData?.id, currentMonth]);

  const { data: events = [], isLoading } = useEvents(eventFilters);

  const absenceFilters = useMemo(() => {
    const startDate = dayjs(currentMonth).subtract(1, 'month').startOf('month').toISOString();
    const endDate = dayjs(currentMonth).add(1, 'month').endOf('month').toISOString();

    return {
      realmId: realmData?.id || 0,
      userId: user?.id ? String(user.id) : undefined,
      startDate,
      endDate,
    };
  }, [realmData?.id, currentMonth, user?.id]);

  const { data: absences = [] } = useAbsences(absenceFilters);

  const allAbsencesFilters = useMemo(() => {
    const startDate = dayjs(currentMonth).subtract(1, 'month').startOf('month').toISOString();
    const endDate = dayjs(currentMonth).add(1, 'month').endOf('month').toISOString();

    return {
      realmId: realmData?.id || 0,
      startDate,
      endDate,
    };
  }, [realmData?.id, currentMonth]);

  const { data: allAbsences = [] } = useAbsences(allAbsencesFilters);
  const deleteAbsence = useDeleteAbsence();

  const isDateAbsent = (date: Date) => {
    const dateToCheck = dayjs(date).startOf('day');
    return absences.some((absence) => {
      const start = dayjs(absence.startDate).startOf('day');
      const end = dayjs(absence.endDate).startOf('day');
      return (
        (dateToCheck.isAfter(start) || dateToCheck.isSame(start, 'day')) &&
        (dateToCheck.isBefore(end) || dateToCheck.isSame(end, 'day'))
      );
    });
  };

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, RaidEvent[]> = {};
    events.forEach((event) => {
      const dateKey = dayjs(event.startTime).format('YYYY-MM-DD');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const getUserStatusForDay = (date: Date) => {
    if (!user) return null;

    const dateKey = dayjs(date).format('YYYY-MM-DD');
    const dayEvents = eventsByDate[dateKey] || [];

    const statuses: string[] = [];
    for (const event of dayEvents) {
      const mySignup = event.signups?.find((s) => {
        const signupUserId = s.character?.userId;
        return signupUserId && String(signupUserId) === String(user.id);
      });
      if (mySignup) {
        statuses.push(mySignup.status);
      }
    }

    if (statuses.length === 0) return null;

    const uniqueStatuses = [...new Set(statuses)];
    if (uniqueStatuses.length > 1) {
      return 'MIXED';
    }

    return statuses[0];
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return null;
    const colors: Record<string, string> = {
      PRESENT: 'green',
      ABSENT: 'red',
      TENTATIVE: 'yellow',
      LATE: 'orange',
      BENCH: 'gray',
      MIXED: 'gray', // Gray for mixed statuses
    };
    return colors[status] || 'gray';
  };

  const getStatusIcon = (status: string | null) => {
    if (!status) return null;
    const icons: Record<string, React.ElementType> = {
      PRESENT: IconCheck,
      ABSENT: IconX,
      TENTATIVE: IconQuestionMark,
      LATE: IconClock,
      BENCH: IconUserMinus,
      MIXED: IconDots,
    };
    const Icon = icons[status];
    return Icon ? <Icon size={14} /> : null;
  };

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

  const handleDayClick = (date: Date) => {
    const dateKey = dayjs(date).format('YYYY-MM-DD');
    const dayEvents = eventsByDate[dateKey] || [];

    if (dayEvents.length === 1) {
      dispatch({ type: 'SET_SELECTED_EVENT', payload: dayEvents[0] });
    } else if (dayEvents.length > 1) {
      dispatch({ type: 'SET_SELECTION_MODE', payload: 'view' });
      dispatch({ type: 'SET_EVENTS_TO_SELECT', payload: dayEvents });
      dispatch({ type: 'SET_EVENT_SELECTION_MODAL_OPEN', payload: true });
    } else {
      dispatch({ type: 'SET_SELECTED_DATE', payload: date });
      dispatch({ type: 'SET_CREATE_MODAL_OPEN', payload: true });
    }
  };

  const handleRosterClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const dateKey = dayjs(date).format('YYYY-MM-DD');
    const dayEvents = eventsByDate[dateKey] || [];

    if (dayEvents.length === 1) {
      navigate(`event/${dayEvents[0].id}/roster`);
    } else if (dayEvents.length > 1) {
      dispatch({ type: 'SET_SELECTION_MODE', payload: 'roster' });
      dispatch({ type: 'SET_EVENTS_TO_SELECT', payload: dayEvents });
      dispatch({ type: 'SET_EVENT_SELECTION_MODAL_OPEN', payload: true });
    }
  };

  const handleSummaryClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const dateKey = dayjs(date).format('YYYY-MM-DD');
    const dayEvents = eventsByDate[dateKey] || [];

    if (dayEvents.length === 1) {
      navigate(`event/${dayEvents[0].id}/roster?view=summary`);
    } else if (dayEvents.length > 1) {
      dispatch({ type: 'SET_SELECTION_MODE', payload: 'summary' });
      dispatch({ type: 'SET_EVENTS_TO_SELECT', payload: dayEvents });
      dispatch({ type: 'SET_EVENT_SELECTION_MODAL_OPEN', payload: true });
    }
  };

  const handleCreateEvent = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
    dispatch({ type: 'SET_CREATE_MODAL_OPEN', payload: true });
  };

  const handleComposerDoubleClick = (date: Date, e: React.MouseEvent) => {
    if (!canEditAll) return;
    e.stopPropagation();
    const dateKey = dayjs(date).format('YYYY-MM-DD');
    navigate(`../dungeons/composer/${dateKey}`);
  };

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

  return (
    <Container mt="xl" mb="xl" size="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Group gap="md">
              <ThemeIcon
                size="xl"
                variant="gradient"
                gradient={{ from: 'brand.5', to: 'brand.7' }}
                radius="md"
              >
                <IconCalendar size={28} />
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
            {user && (
              <Button
                leftSection={<IconPlus size={18} />}
                variant="light"
                color="gray"
                onClick={() => dispatch({ type: 'SET_ABSENCE_MODAL_OPEN', payload: true })}
              >
                {t('absence.declareAbsence')}
              </Button>
            )}
            <Button
              leftSection={<IconCalendarOff size={18} />}
              variant={showAllAbsences ? 'filled' : 'light'}
              color="gray"
              onClick={() => dispatch({ type: 'TOGGLE_SHOW_ALL_ABSENCES' })}
            >
              {showAllAbsences
                ? t('absence.hideAll', { defaultValue: 'Masquer les absences' })
                : t('absence.viewAll', { defaultValue: 'Voir les absences' })}
            </Button>
          </Group>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Flex justify="space-between" align="center">
            <Button
              variant="subtle"
              leftSection={<IconChevronLeft size={18} />}
              onClick={handlePreviousMonth}
              color="brand.4"
            >
              {t('previousMonth')}
            </Button>

            <Group>
              <Text size="xl" fw={700}>
                {dayjs(currentMonth).format('MMMM YYYY')}
              </Text>
            </Group>

            <Button
              variant="subtle"
              rightSection={<IconChevronRight size={18} />}
              onClick={handleNextMonth}
              color="brand.4"
            >
              {t('nextMonth')}
            </Button>
          </Flex>
        </Card>

        {/* Absences Gantt — togglable for all users */}
        {realmData?.id &&
          showAllAbsences &&
          (() => {
            const today = dayjs().startOf('day');
            const monthStart = dayjs(currentMonth).startOf('month');
            const monthEnd = dayjs(currentMonth).endOf('month');

            const sourceAbsences = canEditAll ? allAbsences : absences;

            const monthAbsences = sourceAbsences.filter((a) => {
              const start = dayjs(a.startDate).startOf('day');
              const end = dayjs(a.endDate).startOf('day');
              return start.isBefore(monthEnd) && end.isAfter(monthStart.subtract(1, 'day'));
            });

            const myUid = user?.id ? String(user.id) : null;

            const userDisplayName = (userId: string): string => {
              const char = (characters as Character[]).find(
                (c) => c.userId === userId && c.realmId === realmData?.id,
              );
              if (char) return char.name;

              if (user?.id && String(user.id) === userId && user.battletag) return user.battletag;

              return userId;
            };

            const absenceUserIds = [...new Set(monthAbsences.map((a) => a.userId))];
            const allUserIds = [...new Set([...(myUid ? [myUid] : []), ...absenceUserIds])].sort(
              (a, b) => {
                if (a === myUid) return -1;
                if (b === myUid) return 1;
                return userDisplayName(a).localeCompare(userDisplayName(b));
              },
            );

            const absenceMap: Record<
              string,
              {
                dates: Set<string>;
                reasonByDate: Record<string, string | undefined>;
                idByDate: Record<string, number>;
              }
            > = {};
            for (const absence of monthAbsences) {
              const uid = absence.userId;
              if (!absenceMap[uid])
                absenceMap[uid] = { dates: new Set(), reasonByDate: {}, idByDate: {} };
              let cur = dayjs(absence.startDate).startOf('day');
              const end = dayjs(absence.endDate).startOf('day');
              while (cur.isBefore(end) || cur.isSame(end, 'day')) {
                const key = cur.format('YYYY-MM-DD');
                absenceMap[uid].dates.add(key);
                if (absence.reason) absenceMap[uid].reasonByDate[key] = absence.reason;
                absenceMap[uid].idByDate[key] = absence.id;
                cur = cur.add(1, 'day');
              }
            }

            const days: dayjs.Dayjs[] = [];
            let cur = monthStart;
            while (cur.isBefore(monthEnd) || cur.isSame(monthEnd, 'day')) {
              days.push(cur);
              cur = cur.add(1, 'day');
            }

            const palette = [
              'var(--mantine-color-violet-8)',
              'var(--mantine-color-indigo-8)',
              'var(--mantine-color-blue-8)',
              'var(--mantine-color-teal-8)',
              'var(--mantine-color-cyan-8)',
              'var(--mantine-color-grape-8)',
              'var(--mantine-color-pink-8)',
              'var(--mantine-color-orange-8)',
            ];
            const userColorMap: Record<string, string> = {};
            allUserIds.forEach((uid, i) => {
              const char = (characters as Character[]).find(
                (c) => c.userId === uid && c.realmId === realmData?.id,
              );
              let classColor;
              if (char?.class) {
                const key = String(char.class).toLowerCase().replace(/\s+/g, '_');
                classColor = classColors[key as keyof typeof classColors];
              }
              userColorMap[uid] = classColor || palette[i % palette.length];
            });

            return (
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <IconUsers size={16} color="var(--mantine-color-violet-6)" />
                    <Text fw={600} size="sm">
                      {canEditAll ? t('absence.allAbsences') : t('absence.myAbsences')}
                    </Text>
                  </Group>
                  <Group gap="xs" />
                </Group>

                {allUserIds.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    {t('absence.noAbsences')}
                  </Text>
                ) : (
                  <Box className={styles.ganttWrapper}>
                    <table className={styles.ganttTable}>
                      <thead>
                        <tr>
                          <th className={styles.ganttNameCol}>
                            <Text
                              size="xs"
                              fw={600}
                              c="dimmed"
                              tt="uppercase"
                              style={{ paddingLeft: '8px' }}
                            >
                              Joueur
                            </Text>
                          </th>
                          {days.map((day) => {
                            const isToday = day.isSame(today, 'day');
                            const isWeekend = day.day() === 0 || day.day() === 6;
                            return (
                              <th
                                key={day.format('YYYY-MM-DD')}
                                className={`${styles.ganttDayCol}${isToday ? ` ${styles.ganttDayToday}` : ''}${isWeekend ? ` ${styles.ganttDayWeekend}` : ''}`}
                              >
                                <Text
                                  size="xs"
                                  fw={isToday ? 700 : 400}
                                  c={isToday ? 'violet.4' : isWeekend ? 'dimmed' : undefined}
                                  ta="center"
                                >
                                  {day.format('D')}
                                </Text>
                                <Text
                                  ta="center"
                                  c="dimmed"
                                  style={{ fontSize: '9px', lineHeight: 1.2 }}
                                >
                                  {day.format('dd').slice(0, 1)}
                                </Text>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {allUserIds.map((uid, rowIdx) => {
                          const color = userColorMap[uid];
                          const isMyRow = user?.id && String(user.id) === uid;
                          return (
                            <tr
                              key={uid}
                              className={
                                rowIdx % 2 === 0 ? styles.ganttRowEven : styles.ganttRowOdd
                              }
                            >
                              <td className={styles.ganttNameCell}>
                                <Group gap={4} wrap="nowrap">
                                  <Text size="xs" fw={600} lineClamp={1} style={{ flex: 1 }}>
                                    {userDisplayName(uid)}
                                  </Text>
                                  {isMyRow && (
                                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                                      (moi)
                                    </Text>
                                  )}
                                </Group>
                              </td>
                              {days.map((day) => {
                                const dateKey = day.format('YYYY-MM-DD');
                                const isAbsent = absenceMap[uid]?.dates.has(dateKey);
                                const reason = absenceMap[uid]?.reasonByDate[dateKey];
                                const absenceId = absenceMap[uid]?.idByDate[dateKey];
                                const prevAbsent = absenceMap[uid]?.dates.has(
                                  day.subtract(1, 'day').format('YYYY-MM-DD'),
                                );
                                const nextAbsent = absenceMap[uid]?.dates.has(
                                  day.add(1, 'day').format('YYYY-MM-DD'),
                                );
                                const radiusLeft = !prevAbsent ? '6px' : '0';
                                const radiusRight = !nextAbsent ? '6px' : '0';
                                return (
                                  <td key={dateKey} className={styles.ganttDayCell}>
                                    {isAbsent && (
                                      <Tooltip
                                        label={
                                          reason ||
                                          t('absence.noReason', { defaultValue: 'Absence' })
                                        }
                                        withArrow
                                        position="top"
                                      >
                                        <Box
                                          className={`${styles.ganttBlock}${isMyRow ? ` ${styles.ganttBlockOwn}` : ''}`}
                                          style={{
                                            backgroundColor: color,
                                            borderRadius: `${radiusLeft} ${radiusRight} ${radiusRight} ${radiusLeft}`,
                                            marginLeft: !prevAbsent ? '2px' : '0',
                                            marginRight: !nextAbsent ? '2px' : '0',
                                            position: 'relative',
                                          }}
                                        >
                                          {isMyRow && realmData?.id && absenceId && (
                                            <Box
                                              className={styles.ganttDeleteBtn}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteAbsence.mutate({
                                                  id: absenceId,
                                                  realmId: realmData.id!,
                                                });
                                              }}
                                              title={t('actions.delete', {
                                                defaultValue: 'Supprimer',
                                              })}
                                            >
                                              <IconTrash size={10} />
                                            </Box>
                                          )}
                                        </Box>
                                      </Tooltip>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                )}
              </Card>
            );
          })()}

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          {isLoading ? (
            <Text>{t('loading')}</Text>
          ) : (
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
                {calendarDays.map((date) => {
                  const dateKey = dayjs(date).format('YYYY-MM-DD');
                  const dayEvents = eventsByDate[dateKey] || [];
                  const isToday = dayjs(date).isSame(dayjs(), 'day');
                  const isCurrentMonth = dayjs(date).isSame(currentMonth, 'month');
                  const isPast = dayjs(date).isBefore(dayjs(), 'day');
                  const userStatus = getUserStatusForDay(date);
                  const statusColor = getStatusColor(userStatus);
                  const hasAbsence = isDateAbsent(date);

                  const cellClasses = [styles.calendarCell];
                  if (isToday) cellClasses.push(styles.calendarCellToday);
                  if (!isCurrentMonth) cellClasses.push(styles.calendarCellOtherMonth);
                  if (isPast) cellClasses.push(styles.calendarCellPast);
                  if (!isPast && statusColor) {
                    const statusClass = `statusBorder${statusColor.charAt(0).toUpperCase() + statusColor.slice(1)}`;
                    if (styles[statusClass]) cellClasses.push(styles[statusClass]);
                  }

                  return (
                    <Box
                      key={dateKey}
                      onClick={isPast ? undefined : () => handleDayClick(date)}
                      onDoubleClick={isPast ? undefined : (e) => handleComposerDoubleClick(date, e)}
                      className={cellClasses.join(' ')}
                    >
                      <Flex justify="space-between" align="flex-start" mb="xs">
                        <Text size="sm" fw={isToday ? 700 : 500} c={isToday ? 'white' : undefined}>
                          {date.getDate()}
                        </Text>

                        <Group gap={4}>
                          {hasAbsence && (
                            <Tooltip label={t('absence.youAreAbsent')}>
                              <Badge size="xs" color="red" variant="filled">
                                <IconCalendarOff size={10} />
                              </Badge>
                            </Tooltip>
                          )}

                          {userStatus && (
                            <Tooltip label={t(`signup.${userStatus.toLowerCase()}`)}>
                              <Badge
                                size="xs"
                                color={statusColor || 'gray'}
                                leftSection={getStatusIcon(userStatus)}
                                variant="filled"
                                style={{
                                  cursor: 'pointer',
                                }}
                              >
                                {dayEvents.length}
                              </Badge>
                            </Tooltip>
                          )}

                          {!userStatus && dayEvents.length > 0 && (
                            <Badge size="xs" color="brand.5" variant="light">
                              {dayEvents.length}
                            </Badge>
                          )}
                        </Group>
                      </Flex>

                      {dayEvents.length > 0 && (
                        <Stack gap={4}>
                          {dayEvents.slice(0, 3).map((event) => {
                            const mySignup = event.signups?.find(
                              (s) =>
                                s.character?.userId &&
                                String(s.character.userId) === String(user?.id),
                            );
                            const eventStatusColor = mySignup
                              ? getStatusColor(mySignup.status)
                              : 'brand';

                            return (
                              <Box
                                key={event.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Box
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: `var(--mantine-color-${eventStatusColor}-6)`,
                                    flexShrink: 0,
                                  }}
                                />
                                <Text
                                  size="xs"
                                  lineClamp={1}
                                  c={isToday ? 'white' : 'dimmed'}
                                  style={{ flex: 1 }}
                                >
                                  {dayjs(event.startTime).format('HH:mm')} {event.title}
                                </Text>
                              </Box>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <Text size="xs" c="dimmed" ta="center">
                              +{dayEvents.length - 3} more
                            </Text>
                          )}
                        </Stack>
                      )}

                      {/* Summary Button - visible to all */}
                      {dayEvents.length > 0 && (
                        <Tooltip label={t('actions.viewSummary', { defaultValue: 'Résumé' })}>
                          <Box
                            onClick={(e) => handleSummaryClick(date, e)}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '40px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              backgroundColor: 'var(--mantine-color-dark-5)',
                              border: '1px solid var(--mantine-color-dark-4)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)';
                            }}
                          >
                            <IconList size={14} color="var(--mantine-color-gray-5)" />
                          </Box>
                        </Tooltip>
                      )}

                      {dayEvents.length > 0 && (
                        <Can I={Permission.MANAGE_SIGNUPS}>
                          <Tooltip label={t('actions.manageRoster', { defaultValue: 'Roster' })}>
                            <Box
                              onClick={(e) => handleRosterClick(date, e)}
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                right: '72px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                backgroundColor: 'var(--mantine-color-dark-5)',
                                border: '1px solid var(--mantine-color-dark-4)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  'var(--mantine-color-dark-4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  'var(--mantine-color-dark-5)';
                              }}
                            >
                              <IconUsers size={14} color="var(--mantine-color-gray-5)" />
                            </Box>
                          </Tooltip>
                        </Can>
                      )}

                      {canEditAll && dayEvents.length > 0 && (
                        <Tooltip label={t('createEvent')}>
                          <Box
                            onClick={(e) => handleCreateEvent(date, e)}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              backgroundColor: 'var(--mantine-color-dark-5)',
                              border: '1px solid var(--mantine-color-dark-4)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)';
                            }}
                          >
                            <IconPlus size={14} color="var(--mantine-color-gray-5)" />
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>
          )}
        </Card>

        {selectedEvent && realmData?.id && (
          <EventModal
            event={selectedEvent}
            opened={!!selectedEvent}
            onClose={() => dispatch({ type: 'SET_SELECTED_EVENT', payload: null })}
            realmId={realmData.id}
            onEdit={() => {
              dispatch({ type: 'SET_EDITING_EVENT', payload: selectedEvent });
              dispatch({ type: 'SET_CREATE_MODAL_OPEN', payload: true });
            }}
          />
        )}

        {realmData?.id && (
          <CreateEventModal
            opened={createModalOpen || !!editingEvent}
            onClose={() => {
              dispatch({ type: 'SET_CREATE_MODAL_OPEN', payload: false });
              dispatch({ type: 'SET_EDITING_EVENT', payload: null });
              dispatch({ type: 'SET_SELECTED_DATE', payload: null });
            }}
            realmId={realmData.id}
            selectedDate={selectedDate}
            event={editingEvent}
          />
        )}

        <Modal
          opened={eventSelectionModalOpen}
          onClose={() => {
            dispatch({ type: 'SET_EVENT_SELECTION_MODAL_OPEN', payload: false });
            dispatch({ type: 'SET_EVENTS_TO_SELECT', payload: [] });
          }}
          title={t('selectEvent')}
          size="md"
        >
          <Stack gap="sm">
            {eventsToSelect.map((event) => {
              const mySignup = event.signups?.find((s) => {
                const signupUserId = s.character?.userId;
                return signupUserId && String(signupUserId) === String(user?.id);
              });
              const statusColor = mySignup ? getStatusColor(mySignup.status) : null;

              return (
                <Card
                  key={event.id}
                  padding="md"
                  radius="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    borderLeft: statusColor
                      ? `4px solid var(--mantine-color-${statusColor}-6)`
                      : undefined,
                    transition: 'background-color 0.2s ease, transform 0.2s ease',
                  }}
                  onClick={() => {
                    if (selectionMode === 'roster') {
                      navigate(`event/${event.id}/roster`);
                    } else if (selectionMode === 'summary') {
                      navigate(`event/${event.id}/roster?view=summary`);
                    } else {
                      dispatch({ type: 'SET_SELECTED_EVENT', payload: event });
                    }
                    dispatch({ type: 'SET_EVENT_SELECTION_MODAL_OPEN', payload: false });
                    dispatch({ type: 'SET_EVENTS_TO_SELECT', payload: [] });
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4}>
                      <Text fw={600} size="sm">
                        {event.title}
                      </Text>
                      <Group gap="xs">
                        <IconClock size={14} />
                        <Text size="xs" c="dimmed">
                          {dayjs(event.startTime).format('HH:mm')} -{' '}
                          {dayjs(event.endTime).format('HH:mm')}
                        </Text>
                      </Group>
                      {event.description && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {event.description}
                        </Text>
                      )}
                    </Stack>

                    {mySignup && (
                      <Tooltip label={t(`signup.${mySignup.status.toLowerCase()}`)}>
                        <Badge
                          size="sm"
                          color={statusColor || 'gray'}
                          leftSection={getStatusIcon(mySignup.status)}
                          variant="filled"
                        >
                          {t(`signup.${mySignup.status.toLowerCase()}`)}
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                </Card>
              );
            })}
          </Stack>
        </Modal>

        {user && realmData?.id && (
          <AbsenceModal
            opened={absenceModalOpen}
            onClose={() => dispatch({ type: 'SET_ABSENCE_MODAL_OPEN', payload: false })}
            realmId={realmData.id}
          />
        )}
      </Stack>
    </Container>
  );
}
