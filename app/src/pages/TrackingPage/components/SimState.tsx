import { Badge, Group, Tooltip } from '@mantine/core';
import { Text } from 'components/design-system/atoms';
import { useTranslation } from 'react-i18next';
import { formatTimestamp } from 'utils';

import classes from '../TrackingPage.module.css';
import {
  type ModeReport,
  reportAgeInDays,
  SIM_MODES,
  SIM_STATE_COLOR,
  type SimMode,
  simStateOf,
  type TrackedCharacter,
} from '../trackingStatus';

function useSimStateText(staleAfterDays: number) {
  const { t, i18n } = useTranslation('tracking');
  const locale = i18n?.resolvedLanguage || i18n?.language || 'fr';

  const age = (report: ModeReport) => {
    const days = reportAgeInDays(report);
    return days === 0 ? t('age.today') : t('age.days_ago', { count: days });
  };

  const tooltip = (mode: SimMode, report: ModeReport | null) => {
    const state = simStateOf(report, staleAfterDays);
    return t(`state_tooltip.${state}`, {
      mode: t(`modes.${mode}`),
      date: report ? formatTimestamp(report.timestamp, { includeTime: true, locale }) : '',
      days: staleAfterDays,
    });
  };

  return { t, age, tooltip };
}

interface SimStateBadgeProps {
  mode: SimMode;
  report: ModeReport | null;
  staleAfterDays: number;
  showAge: boolean;
}

export function SimStateBadge({ mode, report, staleAfterDays, showAge }: SimStateBadgeProps) {
  const { t, age, tooltip } = useSimStateText(staleAfterDays);
  const state = simStateOf(report, staleAfterDays);
  const withAge = showAge && report && state !== 'missing';

  return (
    <Tooltip label={tooltip(mode, report)} withArrow multiline maw={300}>
      <Badge
        variant={state === 'missing' ? 'outline' : 'light'}
        color={state === 'missing' ? 'dark.2' : SIM_STATE_COLOR[state]}
        radius="sm"
        size="lg"
        tt="none"
        fw={600}
      >
        {t(`state.${state}`)}
        {withAge && <span className={classes.age}> · {age(report)}</span>}
      </Badge>
    </Tooltip>
  );
}

interface ModePillsProps {
  character: TrackedCharacter;
  staleAfterDays: number;
}

export function ModePills({ character, staleAfterDays }: ModePillsProps) {
  const { t, tooltip } = useSimStateText(staleAfterDays);

  return (
    <Group gap={4} wrap="nowrap">
      {SIM_MODES.map((mode) => {
        const report = character.reportsByDifficulty?.[mode] ?? null;
        const state = simStateOf(report, staleAfterDays);
        const color = SIM_STATE_COLOR[state];
        return (
          <Tooltip
            key={mode}
            label={`${t(`state.${state}`)} — ${tooltip(mode, report)}`}
            withArrow
            multiline
            maw={300}
          >
            <span
              className={classes.statePill}
              data-state={state}
              aria-label={`${t(`modes.${mode}`)} : ${t(`state.${state}`)}`}
              style={
                state === 'missing'
                  ? undefined
                  : {
                      background: `var(--mantine-color-${color}-light)`,
                      color: `var(--mantine-color-${color}-light-color)`,
                    }
              }
            >
              {t(`modes.short.${mode}`)}
            </span>
          </Tooltip>
        );
      })}
    </Group>
  );
}

interface LastSimProps {
  report: ModeReport | null;
  staleAfterDays: number;
}

export function LastSim({ report, staleAfterDays }: LastSimProps) {
  const { t, i18n } = useTranslation('tracking');
  const locale = i18n?.resolvedLanguage || i18n?.language || 'fr';
  if (!report) {
    return (
      <Text size="xs" c="dimmed">
        {t('sim_freshness.no_sim')}
      </Text>
    );
  }
  const state = simStateOf({ ...report, hasNoUpgrade: false }, staleAfterDays);
  const days = reportAgeInDays(report);
  return (
    <Tooltip
      label={t(state === 'stale' ? 'sim_freshness.tooltip_stale' : 'sim_freshness.tooltip', {
        date: formatTimestamp(report.timestamp, { includeTime: true, locale }),
        days: staleAfterDays,
      })}
      withArrow
      multiline
      maw={300}
    >
      <Text size="xs" c={state === 'fresh' ? 'dimmed' : `${SIM_STATE_COLOR[state]}.4`} span>
        {days === 0 ? t('age.today') : t('age.days_ago', { count: days })}
      </Text>
    </Tooltip>
  );
}
