import { ActionIcon, Button, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconRefresh } from '@tabler/icons-react';
import { isFeatureEnabled } from 'config/featureFlags';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTimestamp } from 'utils';
import {
  FRESHNESS_COLOR,
  getReportFreshness,
  RAIDBOTS_DROPTIMIZER_URL,
  REPORT_STALE_DAYS,
  type ReportFreshness,
} from 'utils/droptimizer';

import { DroptimizerUpdateModal } from './DroptimizerUpdateModal';

type MythicReport = { id: string; timestamp: number; hasNoUpgrade?: boolean } | null | undefined;

interface DroptimizerUpdateButtonProps {
  characterName: string;
  /** Rapport Mythique actuel du personnage : la couleur en dépend. */
  mythicReport: MythicReport;
  /** `compact` pour une ligne de tableau, `full` pour une fiche. */
  variant?: 'compact' | 'full';
  /** Seuil de péremption de la guilde (SIMS-199) ; 7 jours par défaut. */
  staleAfterDays?: number;
}

/**
 * « Mettre à jour le Droptimizer » : ouvre Raidbots dans un nouvel onglet et la
 * modale de collage du lien (SIMS-137). Visible pour tous les utilisateurs.
 */
export function DroptimizerUpdateButton({
  characterName,
  mythicReport,
  variant = 'compact',
  staleAfterDays = REPORT_STALE_DAYS,
}: DroptimizerUpdateButtonProps) {
  const { t } = useTranslation('tracking');
  const [opened, { open, close }] = useDisclosure(false);

  if (!isFeatureEnabled('droptimizer-update')) return null;

  const freshness: ReportFreshness = mythicReport?.hasNoUpgrade
    ? 'fresh'
    : getReportFreshness(mythicReport?.timestamp, Date.now(), staleAfterDays);
  const color = FRESHNESS_COLOR[freshness];
  const tooltip =
    freshness === 'missing'
      ? t('droptimizer_update.tooltip_missing')
      : t('droptimizer_update.tooltip_date', {
          date: formatTimestamp(mythicReport!.timestamp, { includeTime: true }),
        });

  const handleClick = (event: React.MouseEvent) => {
    // Le bouton vit aussi dans une ligne cliquable du tableau de suivi.
    event.stopPropagation();
    window.open(RAIDBOTS_DROPTIMIZER_URL, '_blank', 'noopener,noreferrer');
    open();
  };

  return (
    <>
      <Tooltip label={tooltip} withArrow>
        {variant === 'full' ? (
          <Button
            variant="light"
            color={color}
            leftSection={<IconRefresh size={16} />}
            onClick={handleClick}
          >
            {t('droptimizer_update.button')}
          </Button>
        ) : (
          <ActionIcon
            variant="light"
            color={color}
            size="sm"
            aria-label={t('droptimizer_update.button')}
            onClick={handleClick}
          >
            <IconRefresh size={14} />
          </ActionIcon>
        )}
      </Tooltip>
      {/* Hors de la ligne du tableau : un clic dans la modale ne doit pas la replier. */}
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <DroptimizerUpdateModal opened={opened} onClose={close} characterName={characterName} />
      </div>
    </>
  );
}
