import { Box, Image, Stack } from '@mantine/core';
import { useRouteParams } from 'hooks/useRouteParams';
import { WishlistSlot } from 'pages/WishlistPage/components/WishlistSlot';
import {
  BOTTOM_SLOTS,
  getClassSlotOverrides,
  getClassWeaponConfig,
  LEFT_SLOTS,
  RIGHT_SLOTS,
  SLOT_DETAILS,
} from 'pages/WishlistPage/constants';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getItemLevelForDifficulty } from 'utils/getItemLevelForDifficulty';

interface SlotItem {
  itemId?: number;
  name?: string;
  icon?: string;
  quality?: number;
  itemLevel?: number;
  ilevel?: number;
  [key: string]: unknown;
}

interface ActivityCharacterPanelProps {
  items: Record<string, SlotItem>;
  characterImage?: string;
  characterClass?: string;
  showLabels?: boolean;
  activeView?: 'wishlist' | 'snapgear';
  /** Pastilles posées sur les emplacements (anomalies d'enchantement et de gemme). */
  slotMarkers?: Record<string, ReactNode>;
}

const CharacterSheetSlot = ({
  slotKey,
  characterClass,
  items,
  t,
  showLabels,
  activeView,
  tooltipPosition = 'right',
  marker,
}: {
  slotKey: string;
  characterClass: string | undefined;
  items: Record<string, SlotItem>;
  t: (key: string, opts?: Record<string, unknown>) => string;
  showLabels?: boolean;
  activeView?: 'wishlist' | 'snapgear';
  tooltipPosition?: 'left' | 'right';
  marker?: ReactNode;
}) => {
  const { extension, season } = useRouteParams();
  let label = t(`slots.${slotKey}`, { defaultValue: SLOT_DETAILS[slotKey]?.label || '' });
  let icon = SLOT_DETAILS[slotKey]?.icon || '';

  const classOverrides = getClassSlotOverrides(characterClass);
  const override = classOverrides?.[slotKey];

  if (override) {
    if (override.label === 'Main Hand') label = t('slots.main_hand');
    else if (override.label === 'Off Hand') label = t('slots.off_hand');
    else label = override.label;
    icon = override.icon;
  }

  const derivedIlevel =
    activeView === 'snapgear'
      ? items?.[slotKey]?.itemLevel || items?.[slotKey]?.ilevel
      : getItemLevelForDifficulty('mythic', extension, season);

  return (
    <WishlistSlot
      key={slotKey}
      slotKey={slotKey}
      slotLabel={label}
      slotIcon={icon}
      item={{ ...items?.[slotKey], ilevel: derivedIlevel }}
      onClick={() => {}}
      isSelected={false}
      disabled={false}
      tooltipPosition={tooltipPosition}
      showLabels={showLabels}
      marker={marker}
    />
  );
};

/** Paperdoll de « Mon activité » : emplacements de part et d'autre du rendu du personnage. */
export function ActivityCharacterPanel({
  items,
  characterImage,
  characterClass,
  showLabels = true,
  activeView,
  slotMarkers,
}: ActivityCharacterPanelProps) {
  const { t } = useTranslation('wishlist');
  const isDefault = !characterImage || characterImage.includes('default-character.png');

  const weaponConfig = getClassWeaponConfig(characterClass);
  const baseBottomSlots = weaponConfig?.allowedSlots || BOTTOM_SLOTS;

  const getVisibleBottomSlots = () => {
    const allowsTwoHand = baseBottomSlots.includes('two_hand');
    const allowsDualWield =
      baseBottomSlots.includes('main_hand') || baseBottomSlots.includes('off_hand');

    if (!allowsTwoHand) return baseBottomSlots;
    if (!allowsDualWield) return baseBottomSlots;

    const hasTwoHand = !!items?.two_hand;
    const hasMainHand = !!items?.main_hand;
    const hasOffHand = !!items?.off_hand;

    if (hasTwoHand) return ['two_hand'];
    if (hasMainHand || hasOffHand) return ['main_hand', 'off_hand'];
    return baseBottomSlots;
  };

  const visibleBottomSlots = getVisibleBottomSlots();
  const spacersNeeded = Math.max(
    0,
    RIGHT_SLOTS.length - (LEFT_SLOTS.length + visibleBottomSlots.length),
  );

  const renderSlot = (slot: string, side: 'left' | 'right') => (
    <div
      key={slot}
      style={{
        marginBottom: 'var(--mantine-spacing-xs)',
        display: 'flex',
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
      }}
    >
      <CharacterSheetSlot
        slotKey={slot}
        characterClass={characterClass}
        items={items}
        t={t}
        showLabels={showLabels}
        tooltipPosition={side === 'left' ? 'right' : 'left'}
        activeView={activeView}
        marker={slotMarkers?.[slot]}
      />
    </div>
  );

  return (
    <Box
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--mantine-radius-md)',
        border: '1px solid var(--mantine-color-dark-4)',
        backgroundColor: 'var(--mantine-color-dark-8)',
        padding: 'var(--mantine-spacing-md)',
      }}
    >
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: `url('/src/pages/whishlistPage/backgroundImage.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px)',
          opacity: 0.45,
        }}
      />
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(circle at 50% 40%, transparent 30%, rgba(10, 10, 12, 0.65) 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 480,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {characterImage && (
            <Image
              src={characterImage}
              alt=""
              style={{
                height: isDefault ? '50%' : '100%',
                marginTop: isDefault ? '100px' : '0',
                width: 'auto',
                objectFit: 'cover',
                objectPosition: 'top center',
                maskImage: isDefault
                  ? 'none'
                  : 'linear-gradient(to bottom, black 80%, transparent 100%)',
              }}
            />
          )}
        </Box>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            gap: '1rem',
          }}
        >
          <Stack gap={0} align="flex-start">
            {LEFT_SLOTS.map((slot) => renderSlot(slot, 'left'))}
            {visibleBottomSlots.map((slot) => renderSlot(slot, 'left'))}
            {Array.from({ length: spacersNeeded }, (_, i) => (
              <div key={`spacer-${i}`} style={{ width: 56, height: 56 }} aria-hidden="true" />
            ))}
          </Stack>
          <Stack gap={0} align="flex-end">
            {RIGHT_SLOTS.map((slot) => renderSlot(slot, 'right'))}
          </Stack>
        </div>
      </div>
    </Box>
  );
}
