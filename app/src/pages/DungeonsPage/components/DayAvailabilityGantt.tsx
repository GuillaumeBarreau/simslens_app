import { Box, Button, Card, Group, Text, Tooltip } from '@mantine/core';
import { IconHeart, IconShield, IconSword, IconUsers } from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import { useAuth } from 'contexts';
import dayjs from 'dayjs';
import { useCharacters, useUserRealm } from 'hooks/queries';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { DungeonAvailability } from '../../../services/dungeonAvailability.service';
import styles from '../DungeonsPage.module.css';

interface DayAvailabilityGanttProps {
  availabilities: DungeonAvailability[];
  date: dayjs.Dayjs;
  onCompose?: () => void;
}

interface PlayerRow {
  userId: string;
  displayName: string;
  classColor: string;
  slots: {
    startMinutes: number;
    endMinutes: number;
    roles: string[];
    type: string;
    note?: string;
    startTime: string;
    endTime: string;
  }[];
}

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

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

export default function DayAvailabilityGantt({
  availabilities,
  date,
  onCompose,
}: DayAvailabilityGanttProps) {
  const { t } = useTranslation('dungeons');
  const { user } = useAuth();
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const { data: characters = [] } = useCharacters(realmData?.id);

  const playerRows = useMemo(() => {
    const realmChars = characters.filter((c) => c.realmId === realmData?.id);

    const byUser: Record<string, DungeonAvailability[]> = {};
    for (const avail of availabilities) {
      if (!byUser[avail.userId]) byUser[avail.userId] = [];
      byUser[avail.userId].push(avail);
    }

    const rows: PlayerRow[] = [];

    for (const [userId, userAvails] of Object.entries(byUser)) {
      const char = realmChars.find((c) => c.userId === userId);
      const displayName = char?.name || userId;

      let classColor = 'var(--mantine-color-gray-6)';
      if (char?.class) {
        const key = String(char.class).toLowerCase().replace(/\s+/g, '_');
        const cc = classColors[key as keyof typeof classColors];
        if (cc) classColor = cc;
      }

      const slots = userAvails.map((avail) => {
        let roles: string[] = [];
        try {
          roles = JSON.parse(avail.roles);
        } catch {
          roles = ['DPS'];
        }
        return {
          startMinutes: toMinutes(avail.startTime),
          endMinutes: toMinutes(avail.endTime),
          roles,
          type: avail.type,
          note: avail.note || undefined,
          startTime: avail.startTime,
          endTime: avail.endTime,
        };
      });

      rows.push({ userId, displayName, classColor, slots });
    }

    const myUid = user?.id ? String(user.id) : null;
    rows.sort((a, b) => {
      if (a.userId === myUid) return -1;
      if (b.userId === myUid) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    return rows;
  }, [availabilities, characters, realmData?.id, user?.id]);

  const { minHour, maxHour } = useMemo(() => {
    let earliestMin = 24 * 60;
    let latestMin = 0;
    for (const row of playerRows) {
      for (const slot of row.slots) {
        if (slot.startMinutes < earliestMin) earliestMin = slot.startMinutes;
        if (slot.endMinutes > latestMin) latestMin = slot.endMinutes;
      }
    }
    if (earliestMin >= latestMin) return { minHour: 0, maxHour: 24 };
    return {
      minHour: Math.max(0, Math.floor(earliestMin / 60) - 2),
      maxHour: Math.min(24, Math.ceil(latestMin / 60) + 2),
    };
  }, [playerRows]);

  const hourCount = maxHour - minHour;
  const totalMinutes = hourCount * 60;
  const minMinutes = minHour * 60;

  const countsPerHour = useMemo(() => {
    const counts: number[] = Array(hourCount).fill(0);
    for (const row of playerRows) {
      for (const slot of row.slots) {
        const startH = Math.floor(slot.startMinutes / 60);
        const endH = Math.ceil(slot.endMinutes / 60);
        for (let h = startH; h < endH; h++) {
          const idx = h - minHour;
          if (idx >= 0 && idx < hourCount) counts[idx]++;
        }
      }
    }
    return counts;
  }, [playerRows, minHour, hourCount]);

  const hourTicks = Array.from({ length: hourCount + 1 }, (_, i) => minHour + i);

  if (availabilities.length === 0) {
    return (
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="xs" mb="sm">
          <IconUsers size={16} color="var(--mantine-color-orange-6)" />
          <Text fw={600} size="sm">
            {t('weekView.title')} — {date.format('dddd D MMMM')}
          </Text>
        </Group>
        <Text size="sm" c="dimmed" ta="center">
          {t('weekView.noAvailabilities')}
        </Text>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconUsers size={16} color="var(--mantine-color-orange-6)" />
          <Text fw={600} size="sm">
            {t('weekView.title')} — {date.format('dddd D MMMM')}
          </Text>
          <Text size="sm" c="dimmed">
            ({playerRows.length} {t('availability.member', { count: playerRows.length })})
          </Text>
        </Group>
        {onCompose && (
          <Button size="xs" variant="light" color="orange" onClick={onCompose}>
            {t('composer.title')}
          </Button>
        )}
      </Group>

      <Box className={styles.ganttDayWrapper}>
        <table className={styles.ganttDayTable}>
          <thead>
            <tr>
              <th className={styles.ganttDayNameCol}>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ paddingLeft: '8px' }}>
                  {t('availability.member')}
                </Text>
              </th>
              <th className={styles.ganttDayTimelineCol}>
                <div style={{ position: 'relative', height: '20px' }}>
                  {hourTicks.map((h, i) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        left: `${(i / hourCount) * 100}%`,
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: 'var(--mantine-color-dimmed)',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                    >
                      {h}h
                    </div>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {playerRows.map((row, rowIdx) => {
              const isMyRow = !!(user?.id && String(user.id) === row.userId);
              return (
                <tr
                  key={row.userId}
                  className={rowIdx % 2 === 0 ? styles.ganttDayRowEven : styles.ganttDayRowOdd}
                >
                  <td className={styles.ganttDayNameCell}>
                    <Group gap={4} wrap="nowrap">
                      <Box
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: row.classColor,
                          flexShrink: 0,
                        }}
                      />
                      <Text size="xs" fw={600} lineClamp={1} style={{ flex: 1 }}>
                        {row.displayName}
                      </Text>
                      {isMyRow && (
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                          (moi)
                        </Text>
                      )}
                    </Group>
                  </td>
                  <td className={styles.ganttDayTimelineCell}>
                    <div style={{ position: 'relative', height: '28px' }}>
                      {hourTicks.map((h, i) => (
                        <div
                          key={h}
                          style={{
                            position: 'absolute',
                            left: `${(i / hourCount) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: '1px',
                            backgroundColor: 'var(--mantine-color-dark-4)',
                            pointerEvents: 'none',
                          }}
                        />
                      ))}
                      {/* Slot blocks — precise to the minute */}
                      {row.slots.map((slot, i) => {
                        const leftPct = ((slot.startMinutes - minMinutes) / totalMinutes) * 100;
                        const widthPct =
                          ((slot.endMinutes - slot.startMinutes) / totalMinutes) * 100;
                        return (
                          <Tooltip
                            key={i}
                            label={
                              <div>
                                <div>
                                  {slot.type} — {slot.startTime} → {slot.endTime}
                                </div>
                                <div>{slot.roles.join(', ')}</div>
                                {slot.note && (
                                  <div style={{ fontStyle: 'italic' }}>{slot.note}</div>
                                )}
                              </div>
                            }
                            withArrow
                            position="top"
                            multiline
                            maw={250}
                          >
                            <div
                              className={`${styles.ganttDayBlock}${isMyRow ? ` ${styles.ganttDayBlockOwn}` : ''}`}
                              style={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                top: '3px',
                                bottom: '3px',
                                backgroundColor: row.classColor,
                                borderRadius: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                overflow: 'hidden',
                                paddingLeft: '4px',
                                gap: '2px',
                                minWidth: '4px',
                              }}
                            >
                              {slot.roles.map((role) => (
                                <span key={role} style={{ display: 'flex', flexShrink: 0 }}>
                                  {getRoleIcon(role)}
                                </span>
                              ))}
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  color: 'white',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 1,
                                }}
                              >
                                {slot.type}
                              </span>
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* Footer: player count per hour */}
            <tr className={styles.ganttDayFooter}>
              <td className={styles.ganttDayNameCell}>
                <Text size="xs" fw={600} c="dimmed" style={{ paddingLeft: '8px' }}>
                  Total
                </Text>
              </td>
              <td className={styles.ganttDayTimelineCell}>
                <div style={{ position: 'relative', height: '20px' }}>
                  {countsPerHour.map((count, idx) =>
                    count > 0 ? (
                      <Text
                        key={idx}
                        size="xs"
                        fw={700}
                        c={count >= 5 ? 'green.4' : count >= 3 ? 'orange.4' : 'dimmed'}
                        style={{
                          position: 'absolute',
                          left: `${((idx + 0.5) / hourCount) * 100}%`,
                          transform: 'translateX(-50%)',
                          top: 2,
                          lineHeight: 1,
                        }}
                      >
                        {count}
                      </Text>
                    ) : null,
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Box>
    </Card>
  );
}
