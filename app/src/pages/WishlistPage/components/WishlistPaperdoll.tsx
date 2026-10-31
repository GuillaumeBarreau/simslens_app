import { Box, Group, Stack } from '@mantine/core';
import type { MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { WishlistRecord } from 'types/character.types';

import { LEFT_SLOTS, RIGHT_SLOTS, SLOT_DETAILS } from '../constants';
import classes from '../WishlistPage.module.css';
import { getSlotLabelKey } from '../wishlistPlan';
import { WishlistSlot } from './WishlistSlot';

const SLOT_SIZE = 40;

interface WishlistPaperdollProps {
  wishlist: WishlistRecord;
  characterClass?: string;
  characterImage?: string;
  /** Emplacements d'arme proposés (voir `getWeaponSlots`). */
  weaponSlots: string[];
  selectedSlot: string | null;
  readOnly: boolean;
  onSelectSlot: (slot: string) => void;
  /** Pastilles d'état par emplacement (vœu à revoir : SIMS-205). */
  slotMarkers?: Record<string, ReactNode>;
  itemLevel?: number;
}

/**
 * Paperdoll compact de la wishlist (SIMS-250) : un résumé visuel des
 * emplacements autour du personnage, avec les pastilles d'état.
 */
export function WishlistPaperdoll({
  wishlist,
  characterClass,
  characterImage,
  weaponSlots,
  selectedSlot,
  readOnly,
  onSelectSlot,
  slotMarkers,
  itemLevel,
}: WishlistPaperdollProps) {
  const { t } = useTranslation('wishlist');
  const leftSlots = [...LEFT_SLOTS, ...weaponSlots];

  // Un clic sur un objet ouvre le tiroir, pas la page Wowhead de l'infobulle.
  const preventWowhead = (event: MouseEvent) => event.preventDefault();

  const renderSlot = (slot: string, side: 'left' | 'right') => {
    const wish = wishlist[slot];
    return (
      <Box key={slot} onClick={preventWowhead}>
        <WishlistSlot
          slotKey={slot}
          slotLabel={t(getSlotLabelKey(slot, characterClass), {
            defaultValue: SLOT_DETAILS[slot]?.label ?? slot,
          })}
          slotIcon={SLOT_DETAILS[slot]?.icon ?? ''}
          item={{ ...wish, ilevel: itemLevel }}
          onClick={readOnly ? () => {} : onSelectSlot}
          isSelected={selectedSlot === slot}
          disabled={false}
          tooltipPosition={side === 'left' ? 'right' : 'left'}
          showLabels={false}
          marker={slotMarkers?.[slot]}
          size={SLOT_SIZE}
        />
      </Box>
    );
  };

  return (
    <Stack gap={6}>
      <Box className={classes.paperdoll} p="sm">
        {characterImage && (
          <div className={classes.paperdollRender} aria-hidden="true">
            <img src={characterImage} alt="" />
          </div>
        )}
        <Group
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          style={{ position: 'relative' }}
        >
          <Stack gap={6}>{leftSlots.map((slot) => renderSlot(slot, 'left'))}</Stack>
          <Stack gap={6}>{RIGHT_SLOTS.map((slot) => renderSlot(slot, 'right'))}</Stack>
        </Group>
      </Box>
    </Stack>
  );
}
