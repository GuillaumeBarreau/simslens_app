import {
  Badge,
  CloseButton,
  Group,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { useTranslation } from 'react-i18next';

import { type DroptimizerView, ROLE_FILTERS } from '../../droptimizerView';
import type { RoleFilter } from '../../LootsOptimiserPage.reducers';

interface DroptimizerToolbarProps {
  view: DroptimizerView;
  groupBy: 'player' | 'item';
  roleFilter: RoleFilter;
  search: string | null;
  validatedFilter: boolean;
  resultCount: number | null;
  onView: (view: DroptimizerView) => void;
  onGroupBy: (groupBy: 'player' | 'item') => void;
  onRole: (role: RoleFilter) => void;
  onSearch: (value: string) => void;
  onClearValidated: () => void;
}

export function DroptimizerToolbar({
  view,
  groupBy,
  roleFilter,
  search,
  validatedFilter,
  resultCount,
  onView,
  onGroupBy,
  onRole,
  onSearch,
  onClearValidated,
}: DroptimizerToolbarProps) {
  const { t } = useTranslation('droptimizer');
  const byPlayer = view === 'wishlist' && groupBy === 'player';

  return (
    <Stack gap={6}>
      <Group justify="space-between" gap="sm" align="flex-end">
        <Group gap="md" align="flex-end">
          <Stack gap={4}>
            <Text variant="section-label">{t('toolbar.view_label')}</Text>
            <SegmentedControl
              value={view}
              onChange={(value) => onView(value as DroptimizerView)}
              color="brand.5"
              radius="md"
              data={[
                { label: t('toolbar.view_standard'), value: 'standard' },
                { label: t('toolbar.view_wishlist'), value: 'wishlist' },
              ]}
            />
          </Stack>
          {view === 'wishlist' && (
            <Stack gap={4}>
              <Text variant="section-label">{t('toolbar.group_label')}</Text>
              <SegmentedControl
                value={groupBy}
                onChange={(value) => onGroupBy(value as 'player' | 'item')}
                radius="md"
                data={[
                  { label: t('toolbar.group_item'), value: 'item' },
                  { label: t('toolbar.group_player'), value: 'player' },
                ]}
              />
            </Stack>
          )}
          <Stack gap={4}>
            <Text variant="section-label">{t('toolbar.role_label')}</Text>
            <Select
              value={roleFilter}
              onChange={(value) => onRole((value ?? 'all') as RoleFilter)}
              data={ROLE_FILTERS.map((role) => ({
                value: role,
                label: t(`toolbar.roles.${role}`),
              }))}
              aria-label={t('toolbar.role_label')}
              allowDeselect={false}
              w={170}
            />
          </Stack>
          {search !== null && (
            <TextInput
              value={search}
              onChange={(e) => onSearch(e.currentTarget.value)}
              placeholder={t('page.search_placeholder')}
              aria-label={t('page.search_placeholder')}
              leftSection={<IconSearch size={16} stroke={1.5} />}
              rightSection={
                search ? (
                  <CloseButton
                    size="sm"
                    onClick={() => onSearch('')}
                    aria-label={t('empty.no_match_action')}
                  />
                ) : null
              }
              w={260}
            />
          )}
          {validatedFilter && (
            <Badge
              variant="default"
              radius="sm"
              size="lg"
              tt="none"
              fw={500}
              mb={4}
              rightSection={
                <CloseButton
                  size="xs"
                  onClick={onClearValidated}
                  aria-label={t('toolbar.raid_results_clear')}
                />
              }
            >
              {t('toolbar.raid_results')}
            </Badge>
          )}
        </Group>
        {resultCount !== null && (
          <Text size="xs" c="dimmed" mb={8}>
            {t(byPlayer ? 'toolbar.results_players' : 'toolbar.results', { count: resultCount })}
          </Text>
        )}
      </Group>
      <Text size="xs" c="dimmed">
        {t(`toolbar.hint_${view}`)}
      </Text>
    </Stack>
  );
}
