import { Anchor, Badge, Button, Group, Loader, Menu, Stack, Text } from '@mantine/core';
import {
  IconCalendar,
  IconCalendarOff,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconQuestionMark,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useUpsertSignup } from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import type { RaidEvent } from 'services/event.service';

import {
  daysUntil,
  effectiveSignupStatus,
  needsConfirmation,
  type SignupStatus,
  type TodoStatus,
} from '../activitySummary';
import classes from '../MyActivityPage.module.css';
import { ActivityEmptyState, ActivitySection } from './ActivitySection';

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'green',
  ABSENT: 'red',
  TENTATIVE: 'yellow',
  LATE: 'orange',
  BENCH: 'gray',
};

const STATUS_ICONS: Record<string, ReactNode> = {
  PRESENT: <IconCheck size={12} />,
  ABSENT: <IconX size={12} />,
  TENTATIVE: <IconQuestionMark size={12} />,
  LATE: <IconClock size={12} />,
};

const STATUSES = ['PRESENT', 'ABSENT', 'TENTATIVE', 'LATE'] as const;

/** Couleur du pavé de date : réponse ferme, à confirmer, absent. */
function dateTone(status: SignupStatus | null): TodoStatus {
  if (needsConfirmation(status)) return 'warning';
  if (status === 'ABSENT') return 'alert';
  return 'ok';
}

interface StatusMenuProps {
  event: RaidEvent;
  currentStatus: SignupStatus | null;
  selectedCharacterId: number;
  realmId: number;
}

function StatusMenu({ event, currentStatus, selectedCharacterId, realmId }: StatusMenuProps) {
  const { t } = useTranslation('myActivity');
  const upsertSignup = useUpsertSignup();

  const handleSelect = (status: (typeof STATUSES)[number]) => {
    upsertSignup.mutate({
      eventId: event.id,
      realmId,
      payload: { characterId: selectedCharacterId, status },
    });
  };

  const trigger = currentStatus ? (
    <Badge
      component="button"
      color={STATUS_COLORS[currentStatus]}
      variant="light"
      size="md"
      leftSection={STATUS_ICONS[currentStatus]}
      rightSection={<IconChevronDown size={10} />}
      style={{ cursor: 'pointer' }}
    >
      {t(`status.${currentStatus.toLowerCase()}`, { defaultValue: currentStatus })}
    </Badge>
  ) : (
    <Badge
      component="button"
      color="orange"
      variant="outline"
      size="md"
      rightSection={<IconChevronDown size={10} />}
      style={{ cursor: 'pointer' }}
    >
      {t('raids.answer')}
    </Badge>
  );

  return (
    <Menu shadow="md" width={170} position="bottom-end" withinPortal>
      <Menu.Target>{upsertSignup.isPending ? <Loader size={14} /> : trigger}</Menu.Target>
      <Menu.Dropdown>
        {STATUSES.map((status) => (
          <Menu.Item
            key={status}
            leftSection={STATUS_ICONS[status]}
            color={STATUS_COLORS[status]}
            bg={
              currentStatus === status
                ? `var(--mantine-color-${STATUS_COLORS[status]}-light)`
                : undefined
            }
            onClick={() => handleSelect(status)}
          >
            {t(`status.${status.toLowerCase()}`, { defaultValue: status })}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

interface ActivityRaidsSectionProps {
  id?: string;
  events: RaidEvent[];
  selectedCharacterId: number | null;
  realmId: number;
}

/** Frise des raids des 7 prochains jours, avec le statut d'inscription modifiable. */
export function ActivityRaidsSection({
  id,
  events,
  selectedCharacterId,
  realmId,
}: ActivityRaidsSectionProps) {
  const { t } = useTranslation('myActivity');
  const navigate = useNavigate();
  const { guild, extension } = useRouteParams();

  const relativeDay = (startTime: string) => {
    const days = daysUntil(startTime);
    if (days <= 0) return t('raids.today');
    if (days === 1) return t('raids.tomorrow');
    return t('raids.in_days', { count: days });
  };

  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  return (
    <ActivitySection
      id={id}
      icon={<IconCalendar size={20} />}
      color="brand"
      title={t('raids.title')}
      description={t('raids.description')}
    >
      {sorted.length === 0 ? (
        <ActivityEmptyState
          icon={<IconCalendarOff size={26} stroke={1.5} />}
          title={t('raids.empty_title')}
          text={t('raids.empty_text')}
          action={
            <Button
              variant="light"
              color="brand.5"
              size="xs"
              onClick={() => navigate(`/${guild}/${extension}/raid`)}
            >
              {t('raids.see_calendar')}
            </Button>
          }
        />
      ) : (
        <Stack gap={4} className={classes.timeline}>
          {sorted.map((event) => {
            const status = effectiveSignupStatus(event, selectedCharacterId);
            const start = dayjs(event.startTime);
            const difficulty = event.raid_difficulty?.difficulty_rel?.name;
            return (
              <div key={event.id} className={classes.raidItem}>
                <div className={classes.raidDate} data-status={dateTone(status)}>
                  <Text size="10px" fw={700} tt="uppercase" c="dimmed" lh={1.2}>
                    {start.format('ddd')}
                  </Text>
                  <Text size="xl" fw={800} lh={1.1}>
                    {start.format('D')}
                  </Text>
                  <Text size="10px" c="dimmed" tt="uppercase" lh={1.2}>
                    {start.format('MMM')}
                  </Text>
                </div>
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Anchor
                    component={Link}
                    to={`/${guild}/${extension}/raid/event/${event.id}/roster?view=summary`}
                    className={classes.raidTitle}
                    fw={600}
                    size="sm"
                    lineClamp={1}
                  >
                    {event.title}
                  </Anchor>
                  <Group gap={6} wrap="wrap">
                    <Text size="xs" c="dimmed">
                      {relativeDay(event.startTime)} · {start.format('HH:mm')}
                    </Text>
                    {difficulty && (
                      <Badge size="xs" variant="default" radius="sm">
                        {difficulty}
                      </Badge>
                    )}
                    {event.isOptional && (
                      <Badge size="xs" variant="light" color="gray" radius="sm">
                        {t('raids.optional')}
                      </Badge>
                    )}
                  </Group>
                </Stack>
                {selectedCharacterId ? (
                  <StatusMenu
                    event={event}
                    currentStatus={status}
                    selectedCharacterId={selectedCharacterId}
                    realmId={realmId}
                  />
                ) : (
                  <Badge color="gray" variant="outline" size="sm">
                    {t('no_status')}
                  </Badge>
                )}
              </div>
            );
          })}
        </Stack>
      )}
    </ActivitySection>
  );
}
