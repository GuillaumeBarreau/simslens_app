import {
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowRight,
  IconCalendarCheck,
  IconCircleCheck,
  IconDiamond,
  IconHeart,
  IconRefresh,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type GearAnomaly,
  type GearTodo,
  type RaidTodo,
  type SimTodo,
  type TodoStatus,
  type WishlistTodo,
} from '../activitySummary';
import classes from '../MyActivityPage.module.css';

export type TodoTarget = 'raids' | 'sim' | 'gear' | 'wishlist';

const TONE: Record<TodoStatus, string> = {
  ok: 'teal',
  warning: 'orange',
  alert: 'red',
  neutral: 'gray',
};

function StatusIcon({ status }: { status: TodoStatus }) {
  if (status === 'ok') return <IconCircleCheck size={18} color="var(--mantine-color-teal-5)" />;
  if (status === 'warning')
    return <IconAlertTriangle size={18} color="var(--mantine-color-orange-5)" />;
  if (status === 'alert') return <IconAlertCircle size={18} color="var(--mantine-color-red-5)" />;
  return null;
}

interface TodoCardProps {
  status: TodoStatus;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  detail: ReactNode;
  cta: string;
  footer?: ReactNode;
  tooltip?: ReactNode;
  onClick: () => void;
}

function TodoCard({
  status,
  icon,
  label,
  value,
  unit,
  detail,
  cta,
  footer,
  tooltip,
  onClick,
}: TodoCardProps) {
  const card = (
    <UnstyledButton className={classes.todoCard} data-status={status} onClick={onClick}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon variant="light" color={TONE[status]} size={30} radius="md">
            {icon}
          </ThemeIcon>
          <Text size="sm" fw={600} truncate>
            {label}
          </Text>
        </Group>
        <StatusIcon status={status} />
      </Group>
      <Group align="baseline" gap={6} wrap="nowrap">
        <span className={classes.todoValue}>{value}</span>
        {unit && (
          <Text size="sm" c="dimmed" fw={500}>
            {unit}
          </Text>
        )}
      </Group>
      {footer}
      <Text size="xs" c="dimmed" lineClamp={1}>
        {detail}
      </Text>
      <Group gap={4} className={classes.todoCta} mt="auto">
        <Text size="xs" fw={700} c="inherit">
          {cta}
        </Text>
        <IconArrowRight size={12} />
      </Group>
    </UnstyledButton>
  );

  if (!tooltip) return card;
  return (
    <Tooltip label={tooltip} withArrow multiline maw={280} position="bottom">
      {card}
    </Tooltip>
  );
}

interface ActivityTodoStripProps {
  raids: RaidTodo;
  sim: SimTodo;
  gear: GearTodo;
  wishlist: WishlistTodo;
  /** Carte « Sim » sous le drapeau `sim-freshness`. */
  showSim: boolean;
  onSelect: (target: TodoTarget) => void;
}

/**
 * Bandeau « À faire » (SIMS-239) : ce qui demande l'attention du joueur, en
 * cartes cliquables qui mènent à la bonne section.
 */
export function ActivityTodoStrip({
  raids,
  sim,
  gear,
  wishlist,
  showSim,
  onSelect,
}: ActivityTodoStripProps) {
  const { t } = useTranslation('myActivity');
  // Sans donnée de rapport pour ce personnage, la carte n'aurait rien à dire.
  const withSim = showSim && sim.freshness !== 'unknown';

  const anomalyLine = (a: GearAnomaly) =>
    `${t(`slots.${a.slot}`, { defaultValue: a.slot })} — ${t(`anomalies.${a.kind}_${a.issue}`)}`;
  const gearTooltip =
    gear.anomalies.length > 0 ? (
      <Stack gap={2}>
        {gear.anomalies.slice(0, 8).map((a) => (
          <Text key={`${a.slot}-${a.kind}`} size="xs">
            {anomalyLine(a)}
          </Text>
        ))}
        {gear.anomalies.length > 8 && (
          <Text size="xs" c="dimmed">
            {t('todo.gear.more', { count: gear.anomalies.length - 8 })}
          </Text>
        )}
      </Stack>
    ) : undefined;

  let raidDetail = t('todo.raids.none');
  if (raids.pending > 0) raidDetail = t('todo.raids.pending', { count: raids.pending });
  else if (raids.total > 0) raidDetail = t('todo.raids.ok');

  let gearDetail = t('todo.gear.unknown');
  if (gear.issues > 0) gearDetail = t('todo.gear.issues', { count: gear.issues });
  else if (gear.minor > 0) gearDetail = t('todo.gear.minor', { count: gear.minor });
  else if (gear.status === 'ok') gearDetail = t('todo.gear.ok');

  const wishlistDetail = {
    ok: t('todo.wishlist.ok'),
    warning: t('todo.wishlist.partial'),
    alert: t('todo.wishlist.empty'),
    neutral: t('todo.wishlist.unknown'),
  }[wishlist.status];

  return (
    <Stack gap="sm" component="section" aria-label={t('todo.title')}>
      <SimpleGrid cols={{ base: 1, xs: 2, lg: withSim ? 4 : 3 }} spacing="md">
        <TodoCard
          status={raids.status}
          icon={<IconCalendarCheck size={18} />}
          label={t('todo.raids.label')}
          value={raids.pending}
          unit={raids.total > 0 ? t('todo.raids.unit', { total: raids.total }) : undefined}
          detail={raidDetail}
          cta={raids.pending > 0 ? t('todo.cta.raids') : t('todo.cta.raids_view')}
          onClick={() => onSelect('raids')}
        />
        {withSim && (
          <TodoCard
            status={sim.status}
            icon={<IconRefresh size={18} />}
            label={t('todo.sim.label')}
            value={sim.ageDays ?? '—'}
            unit={sim.ageDays !== null ? t('todo.sim.unit', { count: sim.ageDays }) : undefined}
            detail={t(`todo.sim.${sim.freshness}`)}
            cta={t('todo.cta.sim')}
            onClick={() => onSelect('sim')}
          />
        )}
        <TodoCard
          status={gear.status}
          icon={<IconDiamond size={18} />}
          label={t('todo.gear.label')}
          value={gear.status === 'neutral' ? '—' : gear.issues}
          unit={
            gear.issues > 0 && gear.minor > 0
              ? t('todo.gear.minor', { count: gear.minor })
              : undefined
          }
          detail={gearDetail}
          cta={t('todo.cta.gear')}
          tooltip={gearTooltip}
          onClick={() => onSelect('gear')}
        />
        <TodoCard
          status={wishlist.status}
          icon={<IconHeart size={18} />}
          label={t('todo.wishlist.label')}
          value={wishlist.filled}
          unit={t('todo.wishlist.unit', { total: wishlist.total })}
          footer={
            <Progress
              value={wishlist.percent}
              color={TONE[wishlist.status]}
              size="sm"
              radius="xl"
              aria-label={t('todo.wishlist.label')}
            />
          }
          detail={wishlistDetail}
          cta={t('todo.cta.wishlist')}
          onClick={() => onSelect('wishlist')}
        />
      </SimpleGrid>
    </Stack>
  );
}
