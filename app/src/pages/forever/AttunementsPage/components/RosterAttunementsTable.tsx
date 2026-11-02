import { Badge, Group, Paper, ScrollArea, Table, Text, Title } from '@mantine/core';
import { classColors } from 'components/design-system/tokens/colors';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AttunementDefinition, CharacterAttunements } from 'services/attunement.service';
import { normalizeClass } from 'utils';

import { countReady, sortByProgress, statusOf } from '../attunementView';

interface RosterAttunementsTableProps {
  characters: CharacterAttunements[];
  definition: AttunementDefinition;
}

/** État du roster pour un attunement : les plus avancés en haut. */
export function RosterAttunementsTable({ characters, definition }: RosterAttunementsTableProps) {
  const { t } = useTranslation('attunements');
  const sorted = useMemo(
    () => sortByProgress(characters, definition.key),
    [characters, definition.key],
  );
  const { ready, total } = countReady(characters, definition.key);

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" mb="sm">
        <Title order={3}>{t('roster.title')}</Title>
        <Badge size="lg" color={ready === total && total > 0 ? 'green' : 'blue'}>
          {t('roster.ready_count', { ready, total, raid: definition.raid })}
        </Badge>
      </Group>
      <ScrollArea>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('roster.name')}</Table.Th>
              <Table.Th>{t('roster.class')}</Table.Th>
              <Table.Th>{t('roster.faction')}</Table.Th>
              <Table.Th>{t('roster.progress')}</Table.Th>
              <Table.Th>{t('roster.status')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((character) => {
              const status = statusOf(character, definition.key);
              const color =
                classColors[normalizeClass(character.class) as keyof typeof classColors];
              return (
                <Table.Tr key={character.characterId}>
                  <Table.Td>
                    <Text fw={500} c={color}>
                      {character.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>{character.class}</Table.Td>
                  <Table.Td>{status?.faction ? t(`faction.${status.faction}`) : '—'}</Table.Td>
                  <Table.Td>
                    {status?.totalSteps ? `${status.completedSteps} / ${status.totalSteps}` : '—'}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={status?.completed ? 'green' : 'gray'} variant="light">
                      {status?.completed ? t('roster.ready') : t('roster.not_ready')}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
