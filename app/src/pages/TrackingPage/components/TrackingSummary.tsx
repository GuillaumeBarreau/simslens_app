import { Group, Progress, SimpleGrid, Tooltip, UnstyledButton } from '@mantine/core';
import { Text } from 'components/design-system/atoms';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import classes from '../TrackingPage.module.css';
import {
  type ModeSummary,
  SIM_MODES,
  SIM_STATES,
  type SimMode,
  type SimState,
  type TrackingView,
} from '../trackingStatus';

export const SEGMENT_COLOR: Record<SimState, string> = {
  fresh: 'teal.6',
  late: 'orange.6',
  stale: 'red.6',
  missing: 'dark.3',
  done: 'gray.6',
};

const cssColor = (mantineColor: string) => {
  const [name, shade] = mantineColor.split('.');
  return `var(--mantine-color-${name}-${shade})`;
};

interface TrackingSummaryProps {
  summaries: Record<SimMode, ModeSummary>;
  view: TrackingView;
  stateFilter: SimState | null;
  onSelectMode: (mode: SimMode) => void;
  onSelectState: (mode: SimMode, state: SimState) => void;
}

export function TrackingSummary({
  summaries,
  view,
  stateFilter,
  onSelectMode,
  onSelectState,
}: TrackingSummaryProps) {
  const { t } = useTranslation('tracking');

  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" aria-label={t('summary.title')}>
      {SIM_MODES.map((mode) => {
        const summary = summaries[mode];
        const isActive = view === mode;
        const todo = summary.late + summary.stale + summary.missing;
        return (
          <section key={mode} className={classes.modeCard} data-active={isActive || undefined}>
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <UnstyledButton
                className={classes.modeTitle}
                onClick={() => onSelectMode(mode)}
                aria-pressed={isActive}
              >
                {t(`modes.${mode}`)}
              </UnstyledButton>
              <Text size="xs" c="dimmed" className={classes.num}>
                {todo > 0 ? t('summary.todo', { count: todo }) : t('summary.todo_none')}
              </Text>
            </Group>

            <Progress.Root size={8} radius="xl" className={classes.bar}>
              {SIM_STATES.map((state) =>
                summary[state] > 0 ? (
                  <Tooltip
                    key={state}
                    label={`${t(`state.${state}`)} : ${summary[state]}`}
                    withArrow
                  >
                    <Progress.Section
                      value={(summary[state] / Math.max(summary.total, 1)) * 100}
                      color={SEGMENT_COLOR[state]}
                      onClick={() => onSelectState(mode, state)}
                    />
                  </Tooltip>
                ) : null,
              )}
            </Progress.Root>

            <div className={classes.counters}>
              {SIM_STATES.map((state) => (
                <UnstyledButton
                  key={state}
                  className={classes.counter}
                  data-active={(isActive && stateFilter === state) || undefined}
                  data-empty={summary[state] === 0 || undefined}
                  aria-pressed={isActive && stateFilter === state}
                  onClick={() => onSelectState(mode, state)}
                >
                  <span
                    className={classes.dot}
                    style={{ '--dot-color': cssColor(SEGMENT_COLOR[state]) } as CSSProperties}
                  />
                  {t(`state.${state}`)}
                  <span className={classes.count}>{summary[state]}</span>
                </UnstyledButton>
              ))}
            </div>
          </section>
        );
      })}
    </SimpleGrid>
  );
}
