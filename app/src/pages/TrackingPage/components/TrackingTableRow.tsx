import { ActionIcon, Box, Collapse, Group, Menu, Skeleton, Table, Tooltip } from '@mantine/core';
import {
  IconDots,
  IconExternalLink,
  IconListDetails,
  IconPackage,
  IconPackageOff,
} from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { DroptimizerUpdateButton } from 'components/domain/droptimizer';
import { CharacterGear } from 'components/domain/tracking/CharacterGear';
import { PlayerLootsTable } from 'components/domain/tracking/PlayerLootsTable';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ImportedLootRow } from 'services/tracking.service';
import type { GearSnapshot } from 'types/character.types';

import { getReportUrl, normalizeClass } from '../../../utils';
import classes from '../TrackingPage.module.css';
import type { ModeReport, SimMode, TrackingView } from '../trackingStatus';
import { LastSim, ModePills, SimStateBadge } from './SimState';

export interface Character {
  id: number;
  name: string;
  class: string | number;
  specialization?: {
    id: number;
    name: string;
    role: string;
  };
  role?: string;
  realm: string;
  ilvl: number;
  currentPeriodKeyCount: number;
  score: number;
  region?: string;
  archived?: boolean;
  isBackup?: boolean;
  lastModified?: number;
  thumbnail?: string;
  recentReportId: string | null;
  recentReportTimestamp?: number | string | null;
  reportsByDifficulty?: Record<SimMode, ModeReport | null> | null;
  discordTag?: string;
  status?: string;
}

export interface TrackingTableRowProps {
  character: Character;
  view: TrackingView;
  showGear: boolean;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  difficulty: string;
  loots: ImportedLootRow[];
  gearData?: { snapshot: GearSnapshot } | null;
  gearBulkReady?: boolean;
  guild?: string;
  extension?: string;
  staleAfterDays: number;
  showSimDate: boolean;
  /** Colonnes clés / score (M+, Retail seulement). */
  showMythicPlus: boolean;
  /** Colonne d'état des sims, bouton Droptimizer et lien du rapport (Retail seulement). */
  showSims: boolean;
  columnCount: number;
}

function reportLink(character: Character, view: TrackingView) {
  if (view !== 'overview') {
    const report = character.reportsByDifficulty?.[view];
    return report ? report.id : null;
  }
  return character.recentReportId;
}

export const TrackingTableRow = React.memo<TrackingTableRowProps>(
  ({
    character,
    view,
    showGear,
    isExpanded,
    onToggle,
    difficulty,
    loots,
    gearData,
    gearBulkReady,
    guild,
    extension,
    staleAfterDays,
    showSimDate,
    showMythicPlus,
    showSims,
    columnCount,
  }) => {
    const { t } = useTranslation('tracking');

    const rowRef = useRef<HTMLTableRowElement>(null);
    const [hasBeenVisible, setHasBeenVisible] = useState(false);
    useEffect(() => {
      if (!showGear || hasBeenVisible || !gearBulkReady) return;
      const el = rowRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setHasBeenVisible(true);
        },
        { rootMargin: '400px' },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, [showGear, hasBeenVisible, gearBulkReady]);

    const keys = Number(character.currentPeriodKeyCount) || 0;
    const reportId = reportLink(character, view);
    const lastReport =
      character.recentReportId && character.recentReportTimestamp
        ? { id: character.recentReportId, timestamp: Number(character.recentReportTimestamp) }
        : null;
    const lootLabel =
      loots.length > 0
        ? t('row_actions.loots', { count: loots.length })
        : t('loots_table.no_loots');

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest?.('a, button, [role="menu"]')) return;
        onToggle(character.id);
      },
      [onToggle, character.id],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(character.id);
        }
      },
      [onToggle, character.id],
    );

    const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

    return (
      <React.Fragment>
        <Table.Tr
          className={classes.row}
          data-expanded={isExpanded || undefined}
          tabIndex={0}
          aria-expanded={isExpanded}
          ref={rowRef}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <Table.Td visibleFrom="sm">
            <div className={classes.icons}>
              <img
                src={`/src/character/class/${normalizeClass(character.class)}-icon.svg`}
                alt=""
              />
              {character.specialization?.name && (
                <Tooltip label={character.specialization.name}>
                  <img
                    src={`/src/character/spec/${character.specialization.name.toLowerCase().replace(/ /g, '_')}_${character.class}.webp`}
                    alt={character.specialization.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </Tooltip>
              )}
            </div>
          </Table.Td>

          <Table.Td>
            <Group gap={8} wrap="nowrap">
              <Box hiddenFrom="sm" className={classes.icons}>
                <img
                  src={`/src/character/class/${normalizeClass(character.class)}-icon.svg`}
                  alt=""
                />
              </Box>
              <Text fw={600} className={`class-${character.class}`} size="sm" truncate>
                {character.name}
              </Text>
            </Group>
          </Table.Td>

          <Table.Td visibleFrom="sm">
            <Text size="sm" className={classes.num}>
              {character.ilvl}
            </Text>
          </Table.Td>

          {showMythicPlus && (
            <>
              <Table.Td visibleFrom="sm">
                <Text size="sm" className={classes.num} c={keys >= 4 ? 'teal.4' : 'dimmed'}>
                  {keys}
                </Text>
              </Table.Td>

              <Table.Td visibleFrom="sm">
                <Text size="sm" className={classes.num} c={character.score ? undefined : 'dimmed'}>
                  {Math.floor(character.score)}
                </Text>
              </Table.Td>
            </>
          )}

          {showSims && (
            <Table.Td>
              {view === 'overview' ? (
                <ModePills character={character} staleAfterDays={staleAfterDays} />
              ) : (
                <SimStateBadge
                  mode={view}
                  report={character.reportsByDifficulty?.[view] ?? null}
                  staleAfterDays={staleAfterDays}
                  showAge={showSimDate}
                />
              )}
            </Table.Td>
          )}

          {showSimDate && view === 'overview' && (
            <Table.Td visibleFrom="sm">
              <LastSim report={lastReport} staleAfterDays={staleAfterDays} />
            </Table.Td>
          )}

          <Table.Td>
            <Group gap={4} justify="flex-end" wrap="nowrap">
              {showSims && (
                <DroptimizerUpdateButton
                  characterName={character.name}
                  mythicReport={character.reportsByDifficulty?.mythic}
                  staleAfterDays={staleAfterDays}
                />
              )}
              {showSims && reportId ? (
                <Tooltip
                  label={
                    view === 'overview'
                      ? t('row_actions.open_report')
                      : t('row_actions.open_report_mode', { mode: t(`modes.${view}`) })
                  }
                  withArrow
                >
                  <ActionIcon
                    component="a"
                    href={getReportUrl(reportId, character.specialization?.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="subtle"
                    color="gray"
                    size="md"
                    aria-label={t('row_actions.open_report')}
                    onClick={stopPropagation}
                  >
                    <IconExternalLink size={16} stroke={1.5} />
                  </ActionIcon>
                </Tooltip>
              ) : (
                showSims && <Box w={28} aria-hidden />
              )}
              <Menu position="bottom-end" withinPortal shadow="md">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="md"
                    aria-label={t('row_actions.more')}
                    onClick={stopPropagation}
                  >
                    <IconDots size={16} stroke={1.5} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown onClick={stopPropagation}>
                  <Menu.Item
                    component={Link}
                    to={`/${guild}/${extension}/wishlist?characterId=${character.id}`}
                    leftSection={<IconListDetails size={16} stroke={1.5} />}
                  >
                    {t('row_actions.wishlist')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      loots.length > 0 ? (
                        <IconPackage size={16} stroke={1.5} />
                      ) : (
                        <IconPackageOff size={16} stroke={1.5} />
                      )
                    }
                    onClick={() => onToggle(character.id)}
                  >
                    {isExpanded ? t('row_actions.hide_loots') : t('row_actions.show_loots')}
                    <Text size="xs" c="dimmed">
                      {lootLabel}
                    </Text>
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Table.Td>
        </Table.Tr>

        <Table.Tr className={classes.detailRow}>
          <Table.Td colSpan={columnCount}>
            {hasBeenVisible && gearBulkReady ? (
              <div style={{ display: showGear ? 'block' : 'none' }}>
                <CharacterGear
                  character={character as never}
                  difficulty={difficulty}
                  gearData={gearData as React.ComponentProps<typeof CharacterGear>['gearData']}
                />
              </div>
            ) : (
              showGear && gearBulkReady && <Skeleton height={120} radius="sm" my={4} />
            )}
            <Collapse in={isExpanded} transitionDuration={200}>
              <PlayerLootsTable loots={loots} characterName={character.name} />
            </Collapse>
          </Table.Td>
        </Table.Tr>
      </React.Fragment>
    );
  },
);

TrackingTableRow.displayName = 'TrackingTableRow';
