import {
  Badge,
  Button,
  CloseButton,
  Group,
  SegmentedControl,
  Select,
  Switch,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { useTranslation } from 'react-i18next';

import type { State } from '../TrackingPage.reducers';
import {
  type AnomalyFilter,
  type GearAnomalyLevel,
  isTrackingView,
  SIM_MODES,
  type TrackingView,
} from '../trackingStatus';

export const VIEWS: readonly TrackingView[] = ['overview', ...SIM_MODES];

interface TrackingViewSelectorProps {
  view: TrackingView;
  onChange: (view: TrackingView) => void;
}

export function TrackingViewSelector({ view, onChange }: TrackingViewSelectorProps) {
  const { t } = useTranslation('tracking');
  return (
    <SegmentedControl
      value={view}
      onChange={(value) => isTrackingView(value) && onChange(value)}
      data={VIEWS.map((v) => ({ value: v, label: t(`modes.${v}`) }))}
      color="brand.5"
      radius="md"
      fullWidth
      maw={560}
    />
  );
}

interface TrackingFiltersProps {
  state: Pick<State, 'view' | 'stateFilter' | 'todoOnly' | 'search' | 'anomalyFilter' | 'showGear'>;
  anomalyCounts: Record<GearAnomalyLevel, number> | null;
  visibleCount: number;
  totalCount: number;
  onSearch: (value: string) => void;
  onTodoOnly: (value: boolean) => void;
  onAnomaly: (value: AnomalyFilter) => void;
  onShowGear: (value: boolean) => void;
  onClearState: () => void;
  onReset: () => void;
}

export function TrackingFilters({
  state,
  anomalyCounts,
  visibleCount,
  totalCount,
  onSearch,
  onTodoOnly,
  onAnomaly,
  onShowGear,
  onClearState,
  onReset,
}: TrackingFiltersProps) {
  const { t } = useTranslation('tracking');
  const { view, stateFilter, todoOnly, search, anomalyFilter, showGear } = state;
  const hasFilters = !!stateFilter || todoOnly || !!search || anomalyFilter !== 'all';

  const anomalyOptions = [
    { value: 'all', label: t('filters.gear.all') },
    ...(['none', 'orange', 'red'] as const).map((level) => ({
      value: level,
      label: t(`filters.gear.${level}`, { count: anomalyCounts?.[level] ?? 0 }),
    })),
  ];

  return (
    <Group justify="space-between" gap="sm" align="center">
      <Group gap="sm" align="center" style={{ flex: '1 1 520px' }}>
        <TextInput
          value={search}
          onChange={(e) => onSearch(e.currentTarget.value)}
          placeholder={t('filters.search')}
          aria-label={t('filters.search')}
          leftSection={<IconSearch size={16} stroke={1.5} />}
          rightSection={
            search ? (
              <CloseButton size="sm" onClick={() => onSearch('')} aria-label={t('filters.reset')} />
            ) : null
          }
          style={{ flex: '1 1 220px', maxWidth: 320 }}
        />
        <Tooltip label={t('filters.gear_hint')} multiline maw={300} withArrow>
          <Select
            value={anomalyFilter}
            onChange={(value) => onAnomaly((value as AnomalyFilter) ?? 'all')}
            data={anomalyOptions}
            aria-label={t('filters.gear_label')}
            allowDeselect={false}
            disabled={!anomalyCounts}
            w={200}
          />
        </Tooltip>
        <Tooltip label={t('filters.todo_only_hint')} withArrow>
          <Switch
            checked={todoOnly}
            onChange={(e) => onTodoOnly(e.currentTarget.checked)}
            label={t('filters.todo_only')}
            color="brand.5"
          />
        </Tooltip>
        {stateFilter && view !== 'overview' && (
          <Badge
            variant="default"
            radius="sm"
            size="lg"
            tt="none"
            fw={500}
            rightSection={
              <CloseButton size="xs" onClick={onClearState} aria-label={t('filters.clear_state')} />
            }
          >
            {t('filters.active_state', {
              mode: t(`modes.${view}`),
              state: t(`state.${stateFilter}`),
            })}
          </Badge>
        )}
        {hasFilters && (
          <Button variant="subtle" color="gray" size="compact-sm" onClick={onReset}>
            {t('filters.reset')}
          </Button>
        )}
      </Group>
      <Group gap="md" align="center">
        <Text size="xs" c="dimmed">
          {t('filters.results', { count: visibleCount, total: totalCount })}
        </Text>
        <Switch
          checked={showGear}
          onChange={(e) => onShowGear(e.currentTarget.checked)}
          label={t('filters.show_gear')}
          color="brand.5"
        />
      </Group>
    </Group>
  );
}
