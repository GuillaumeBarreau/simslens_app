import { Group, SegmentedControl, Select } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { FILTERS, FilterType } from '../types';

interface HistoryFiltersProps {
  value: FilterType;
  onChange: (value: FilterType) => void;
  characters: { value: string; label: string }[];
  selectedCharacter: string | null;
  onCharacterChange: (value: string | null) => void;
}

export function HistoryFilters({
  value,
  onChange,
  characters,
  selectedCharacter,
  onCharacterChange,
}: HistoryFiltersProps) {
  const { t } = useTranslation('history');
  return (
    <Group mb="lg" gap="sm" align="center" justify="space-between">
      <SegmentedControl
        value={value}
        onChange={(v) => onChange(v as FilterType)}
        data={FILTERS.map(({ key, label }) => ({ value: key, label: t(label) }))}
        size="sm"
        color="brand.5"
        bg="dark.7"
      />
      <Select
        placeholder={t('filter.all_members')}
        data={characters}
        value={selectedCharacter}
        onChange={onCharacterChange}
        searchable
        clearable
        size="sm"
        w={200}
        leftSection={<IconUser size={14} />}
      />
    </Group>
  );
}
