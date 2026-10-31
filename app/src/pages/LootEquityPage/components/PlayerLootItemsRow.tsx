import { Badge, Box, Group, Table, Text, Tooltip } from '@mantine/core';
import { SimMetricBadge } from 'components/domain/droptimizer/SimMetricBadge';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { useTranslation } from 'react-i18next';
import type { LootEquityItem } from 'services/attendance.service';
import { handleIconError, resolveBlizzardIcon } from 'utils/resolveIconPath';

import { formatDropDate, formatGain } from '../lootEquity/lootEquity';

interface Props {
  items: LootEquityItem[];
  colSpan: number;
}

/**
 * Objets reçus par un joueur sur la période, avec leur gain : figé à l'import
 * du loot (SIMS-229), ou, pour les drops plus anciens, estimé depuis le
 * dernier sim du joueur quand il précède le drop.
 */
export function PlayerLootItemsRow({ items, colSpan }: Props) {
  const { t, i18n } = useTranslation('lootEquity');

  return (
    <Table.Tr>
      <Table.Td colSpan={colSpan} p={0}>
        <Box px="md" py="sm" bg="rgba(255,255,255,0.02)">
          {items.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t('detail.no_items')}
            </Text>
          ) : (
            <Table verticalSpacing={4} fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('detail.date')}</Table.Th>
                  <Table.Th>{t('detail.item')}</Table.Th>
                  <Table.Th>{t('detail.response')}</Table.Th>
                  <Table.Th>{t('detail.instance')}</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>{t('detail.gain')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item) => (
                  <Table.Tr key={item.lootId}>
                    <Table.Td>{formatDropDate(item.receivedAt, i18n?.language)}</Table.Td>
                    <Table.Td>
                      <Group gap={8} wrap="nowrap">
                        <WowheadLink itemId={item.itemId || 0} region="eu">
                          <Group gap={8} wrap="nowrap" style={{ cursor: 'pointer' }}>
                            {item.itemIcon && (
                              <img
                                alt={item.itemName ?? String(item.itemId)}
                                src={resolveBlizzardIcon(item.itemIcon)}
                                onError={handleIconError(item.itemIcon)}
                                style={{ width: 22, height: 22, borderRadius: 4 }}
                              />
                            )}
                            <Text size="sm" fw={600} c="violet.3">
                              {item.itemName ?? item.itemId}
                            </Text>
                          </Group>
                        </WowheadLink>
                        {item.isBis && (
                          <Badge size="xs" color="yellow" variant="light">
                            {t('detail.bis')}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{item.response ?? '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {item.instance ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {item.gainPercent === null ? (
                        <Text size="xs" c="dimmed" fs="italic">
                          {t('detail.unknown')}
                        </Text>
                      ) : (
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip
                            label={t(
                              item.gainSource === 'frozen'
                                ? 'detail.gain_frozen'
                                : 'detail.gain_estimated',
                              {
                                date: item.simulatedAt
                                  ? new Date(item.simulatedAt).toLocaleDateString()
                                  : '—',
                              },
                            )}
                          >
                            <Text size="sm" c={item.gainPercent > 0 ? 'teal' : 'dimmed'}>
                              {formatGain(item.gainPercent)}
                            </Text>
                          </Tooltip>
                          {/* % de HPS (QE Live), SIMS-202. */}
                          <SimMetricBadge metric={item.gainMetric} />
                        </Group>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Box>
      </Table.Td>
    </Table.Tr>
  );
}
