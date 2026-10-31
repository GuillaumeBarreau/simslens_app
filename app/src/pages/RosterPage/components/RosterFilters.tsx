import { Button, CloseButton, Group, SegmentedControl, Select, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { useTranslation } from 'react-i18next';

import {
  COMPLETENESS_ISSUES,
  type CompletenessFilter,
  type CompletenessIssue,
  type RoleFilter,
  ROLES,
  type StatusFilter,
} from '../rosterView';

export const CLASS_KEYS = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'death_knight',
  'shaman',
  'mage',
  'warlock',
  'monk',
  'druid',
  'demon_hunter',
  'evoker',
] as const;

interface RosterStatusSelectorProps {
  status: StatusFilter;
  counts: Record<StatusFilter, number>;
  canViewGuests: boolean;
  onChange: (status: StatusFilter) => void;
}

export function RosterStatusSelector({
  status,
  counts,
  canViewGuests,
  onChange,
}: RosterStatusSelectorProps) {
  const { t } = useTranslation('roster');
  const statuses: StatusFilter[] = canViewGuests
    ? ['all', 'pending', 'guests']
    : ['all', 'pending'];
  return (
    <SegmentedControl
      value={status}
      onChange={(value) => onChange(value as StatusFilter)}
      data={statuses.map((s) => ({
        value: s,
        label: `${t(`page.status.${s}`)} · ${counts[s]}`,
      }))}
      color="brand.5"
      radius="md"
      fullWidth
      maw={520}
    />
  );
}

interface RosterFiltersProps {
  search: string;
  classFilter: string;
  roleFilter: RoleFilter;
  completenessFilter: CompletenessFilter;
  completenessCounts: Record<CompletenessIssue | 'incomplete', number>;
  visibleCount: number;
  totalCount: number;
  hasFilters: boolean;
  onSearch: (value: string) => void;
  onClass: (value: string) => void;
  onRole: (value: RoleFilter) => void;
  onCompleteness: (value: CompletenessFilter) => void;
  onReset: () => void;
}

export function RosterFilters({
  search,
  classFilter,
  roleFilter,
  completenessFilter,
  completenessCounts,
  visibleCount,
  totalCount,
  hasFilters,
  onSearch,
  onClass,
  onRole,
  onCompleteness,
  onReset,
}: RosterFiltersProps) {
  const { t } = useTranslation('roster');

  return (
    <Group justify="space-between" gap="sm" align="center">
      <Group gap="sm" align="center" style={{ flex: '1 1 600px' }}>
        <TextInput
          value={search}
          onChange={(e) => onSearch(e.currentTarget.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          leftSection={<IconSearch size={16} stroke={1.5} />}
          rightSection={
            search ? (
              <CloseButton
                size="sm"
                onClick={() => onSearch('')}
                aria-label={t('page.filters.reset')}
              />
            ) : null
          }
          style={{ flex: '1 1 200px', maxWidth: 280 }}
        />
        <Select
          value={classFilter}
          onChange={(value) => onClass(value || 'all')}
          aria-label={t('page.filters.class')}
          data={[
            { value: 'all', label: t('search.all_classes') },
            ...CLASS_KEYS.map((key) => ({ value: key, label: t(`classes.${key}`) })),
          ]}
          allowDeselect={false}
          w={180}
        />
        <Select
          value={roleFilter}
          onChange={(value) => onRole((value as RoleFilter) || 'all')}
          aria-label={t('page.filters.role')}
          data={[
            { value: 'all', label: t('page.filters.all_roles') },
            ...[...ROLES, 'unknown' as const].map((role) => ({
              value: role,
              label: t(`page.roles.${role}`),
            })),
          ]}
          allowDeselect={false}
          w={160}
        />
        <Select
          value={completenessFilter}
          onChange={(value) => onCompleteness((value as CompletenessFilter) || 'all')}
          aria-label={t('page.filters.completeness')}
          data={[
            { value: 'all', label: t('page.filters.all_completeness') },
            {
              value: 'incomplete',
              label: t('page.filters.incomplete', { count: completenessCounts.incomplete }),
            },
            ...COMPLETENESS_ISSUES.map((issue) => ({
              value: issue,
              label: `${t(`page.completeness.${issue}`)} (${completenessCounts[issue]})`,
            })),
          ]}
          allowDeselect={false}
          w={200}
        />
        {hasFilters && (
          <Button variant="subtle" color="gray" size="compact-sm" onClick={onReset}>
            {t('page.filters.reset')}
          </Button>
        )}
      </Group>
      <Text size="xs" c="dimmed">
        {t('page.filters.results', { count: visibleCount, total: totalCount })}
      </Text>
    </Group>
  );
}
