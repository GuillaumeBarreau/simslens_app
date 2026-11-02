import { Table } from '@mantine/core';
import { IconReportAnalytics } from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { EmptyState } from 'components/design-system/molecules';
import { isFeatureEnabled } from 'config/featureFlags';
import { useGame } from 'hooks/useGame';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImportedLootRow } from 'services/tracking.service';
import type { GearSnapshot } from 'types/character.types';

import classes from '../TrackingPage.module.css';
import type { SortKey } from '../TrackingPage.reducers';
import type { TrackingView } from '../trackingStatus';
import type { Character } from './TrackingTableRow';
import { TrackingTableRow } from './TrackingTableRow';

const EMPTY_LOOTS: ImportedLootRow[] = [];

interface TrackingTableProps {
  sortedRoster: Character[];
  view: TrackingView;
  showGear: boolean;
  handleSort: (key: SortKey) => void;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  difficulty: string;
  lootsByCharacter: Record<number, ImportedLootRow[]>;
  gearByCharacter?: Record<number, { snapshot: GearSnapshot } | null>;
  gearBulkReady?: boolean;
  guild?: string;
  extension?: string;
  staleAfterDays: number;
  isFiltered?: boolean;
}

export const TrackingTable: React.FC<TrackingTableProps> = ({
  sortedRoster,
  view,
  showGear,
  handleSort,
  sortKey,
  sortDir,
  difficulty,
  lootsByCharacter,
  gearByCharacter,
  gearBulkReady,
  guild,
  extension,
  staleAfterDays,
  isFiltered = false,
}) => {
  const { t } = useTranslation('tracking');
  const { has } = useGame();
  // Clés et score viennent de Raider.IO (M+), l'état des sims de Droptimizer : Retail seulement.
  const showMythicPlus = has('mythicPlus');
  const showSims = has('droptimizer');
  const showSimDate = showSims && isFeatureEnabled('sim-freshness');
  const showLastSim = showSimDate && view === 'overview';
  const columnCount = 4 + (showMythicPlus ? 2 : 0) + (showSims ? 1 : 0) + (showLastSim ? 1 : 0);
  const [openedCharacterId, setOpenedCharacterId] = useState<number | null>(null);

  const toggleLoots = useCallback((id: number) => {
    setOpenedCharacterId((prev) => (prev === id ? null : id));
  }, []);

  const sortableHeader = (key: SortKey, label: string, props: Record<string, unknown> = {}) => {
    const isSorted = sortKey === key;
    return (
      <Table.Th
        className={classes.sortable}
        onClick={() => handleSort(key)}
        aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        {...props}
      >
        <Text variant="section-label">
          {label} {isSorted ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </Text>
      </Table.Th>
    );
  };

  const stateLabel =
    view === 'overview' ? t('table.modes') : t('table.state_mode', { mode: t(`modes.${view}`) });

  return (
    <>
      <div className={classes.table}>
        <Table withRowBorders={false} verticalSpacing={8} horizontalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              {sortableHeader('spec', t('table.spec'), { w: 76, visibleFrom: 'sm' })}
              {sortableHeader('name', t('table.name'))}
              {sortableHeader('ilvl', t('table.ilvl'), { w: 90, visibleFrom: 'sm' })}
              {showMythicPlus &&
                sortableHeader('keys', t('table.key'), { w: 80, visibleFrom: 'sm' })}
              {showMythicPlus &&
                sortableHeader('score', t('table.score'), { w: 90, visibleFrom: 'sm' })}
              {showSims &&
                sortableHeader('report', stateLabel, {
                  className: `${classes.sortable} ${view === 'overview' ? classes.colPills : classes.colState}`,
                })}
              {showLastSim && (
                <Table.Th w={130} visibleFrom="sm">
                  <Text variant="section-label">{t('sim_freshness.column')}</Text>
                </Table.Th>
              )}
              <Table.Th className={classes.colActions}>
                <Text variant="section-label" ta="right">
                  {t('table.actions')}
                </Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {sortedRoster.map((character) => (
              <TrackingTableRow
                key={character.id}
                character={character}
                view={view}
                showGear={showGear}
                isExpanded={openedCharacterId === character.id}
                onToggle={toggleLoots}
                difficulty={difficulty}
                loots={lootsByCharacter[character.id] ?? EMPTY_LOOTS}
                gearData={gearByCharacter ? gearByCharacter[character.id] : undefined}
                gearBulkReady={gearBulkReady}
                guild={guild}
                extension={extension}
                staleAfterDays={staleAfterDays}
                showSimDate={showSimDate}
                showMythicPlus={showMythicPlus}
                showSims={showSims}
                columnCount={columnCount}
              />
            ))}
          </Table.Tbody>
        </Table>
      </div>

      {sortedRoster.length === 0 && (
        <EmptyState
          title={isFiltered ? t('empty_filtered.title') : t('empty.title')}
          description={isFiltered ? t('empty_filtered.description') : t('empty.description')}
          icon={IconReportAnalytics}
        />
      )}
    </>
  );
};
