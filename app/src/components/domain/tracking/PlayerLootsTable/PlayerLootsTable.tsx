import { Badge, Box, Group, ScrollArea, Stack, Table, Text } from '@mantine/core';
import { IconPackageOff } from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { useTranslation } from 'react-i18next';
import { handleIconError, resolveBlizzardIcon } from 'utils/resolveIconPath';

interface Loot {
  id: number;
  importID?: number;
  characterID?: number;
  date?: string;
  time?: string;
  itemID?: number;
  response?: string;
  instance?: string;
  owner?: number;
  itemName?: string;
  itemIcon?: string;
}

const RESPONSE_COLOR: Record<string, string> = {
  'Best in Slot': 'yellow',
  Upgrade: 'green',
  'Minor Upgrade': 'teal',
  Transmog: 'violet',
  Proc: 'orange',
  'Off-spec': 'gray',
};

export default function PlayerLootsTable({
  loots,
  characterName,
}: {
  loots: Loot[];
  characterName?: string;
}) {
  const { t } = useTranslation('tracking');

  if (!loots) return null;

  if (loots.length === 0) {
    return (
      <Box
        py="xl"
        px="lg"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          borderTop: '1px solid #1f1f1f',
        }}
      >
        <IconPackageOff size={20} color="var(--mantine-color-dimmed)" />
        <Stack gap={2}>
          <Text size="sm" c="dimmed" fw={500}>
            {t('loots_table.no_loots')}
          </Text>
          {characterName && (
            <Text size="xs" c="dimmed">
              Aucun loot importé pour{' '}
              <Text span fw={600} c="app.2">
                {characterName}
              </Text>
            </Text>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box style={{ borderTop: '1px solid #1f1f1f' }}>
      <Group px="md" py="xs" justify="space-between" style={{ borderBottom: '1px solid #1f1f1f' }}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
          {characterName && (
            <Text span c="app.2" fw={700}>
              {characterName}
            </Text>
          )}
          {characterName ? ' — ' : ''}Loots importés
        </Text>
        <Badge variant="light" color="brand" size="sm">
          {loots.length}
        </Badge>
      </Group>

      <ScrollArea type="auto" scrollbarSize={6}>
        <Table verticalSpacing="xs" fz="sm" style={{ minWidth: 600 }}>
          <Table.Thead>
            <Table.Tr style={{ borderBottom: '1px solid #2f2f2f' }}>
              <Table.Th c="dimmed" fw={500} style={{ width: 140 }}>
                {t('loots_table.date')}
              </Table.Th>
              <Table.Th c="dimmed" fw={500}>
                {t('loots_table.item')}
              </Table.Th>
              <Table.Th c="dimmed" fw={500} style={{ width: 150 }}>
                {t('loots_table.response')}
              </Table.Th>
              <Table.Th c="dimmed" fw={500} style={{ width: 200 }}>
                Instance
              </Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {loots.map((l, idx) => (
              <Table.Tr
                key={l.id}
                style={{
                  borderBottom: '1px solid #1f1f1f',
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                }}
              >
                <Table.Td>
                  <Stack gap={0}>
                    <Text size="sm" c="app.1">
                      {l.date}
                    </Text>
                    {l.time && (
                      <Text size="xs" c="dimmed">
                        {l.time}
                      </Text>
                    )}
                  </Stack>
                </Table.Td>

                <Table.Td>
                  <WowheadLink itemId={l.itemID || 0} region="eu">
                    <Group gap={8} style={{ cursor: 'pointer' }}>
                      {l.itemIcon && (
                        <img
                          alt={l.itemName ?? String(l.itemID)}
                          src={resolveBlizzardIcon(l.itemIcon)}
                          onError={handleIconError(l.itemIcon)}
                          style={{ width: 28, height: 28, borderRadius: 4, flex: '0 0 28px' }}
                        />
                      )}
                      <Text size="sm" fw={600} c="violet.3">
                        {l.itemName ?? l.itemID}
                      </Text>
                    </Group>
                  </WowheadLink>
                </Table.Td>

                <Table.Td>
                  {l.response ? (
                    <Badge variant="light" color={RESPONSE_COLOR[l.response] ?? 'gray'} size="sm">
                      {l.response}
                    </Badge>
                  ) : (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>

                <Table.Td>
                  <Text size="xs" c="dimmed" truncate>
                    {l.instance ?? '—'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Box>
  );
}
