import { Box, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { WishSlotStatus } from 'types/character.types';

interface WishSlotMarkerProps {
  status?: WishSlotStatus;
}

/**
 * Pastille posée sur un emplacement du paperdoll (SIMS-205) : un « ! » orange
 * pour un BiS à revoir (déjà porté ou battu par l'équipement actuel). Rien
 * sinon.
 */
export function WishSlotMarker({ status }: WishSlotMarkerProps) {
  const { t } = useTranslation('wishlist');
  if (!status?.obsolete) return null;

  const label = t(`insights.status.${status.state}`);

  return (
    <Tooltip label={label} withArrow>
      <Box
        aria-label={label}
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          zIndex: 2,
          minWidth: 16,
          height: 16,
          padding: '0 3px',
          borderRadius: 8,
          fontSize: 10,
          fontWeight: 700,
          lineHeight: '16px',
          textAlign: 'center',
          color: 'white',
          backgroundColor: 'var(--mantine-color-orange-filled)',
          pointerEvents: 'auto',
        }}
      >
        !
      </Box>
    </Tooltip>
  );
}
