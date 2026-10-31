import { Box, Group, Image, Text, Tooltip } from '@mantine/core';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import type { ReactNode } from 'react';
import { getQualityColor } from 'utils/qualityColors';
import { resolveBlizzardIcon, resolveFallbackIcon } from 'utils/resolveIconPath';

interface WishlistSlotProps {
  slotKey: string;
  slotLabel: string;
  slotIcon: string;
  item: any;
  onClick: (slotKey: string) => void;
  isSelected: boolean;
  disabled?: boolean;
  tooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
  showLabels?: boolean;
  /** Pastille posée dans le coin de l'emplacement (vœu à revoir : SIMS-205). */
  marker?: ReactNode;
  /** Côté de l'icône en pixels (56 par défaut ; paperdoll compact de SIMS-250 : 40). */
  size?: number;
}

export function WishlistSlot({
  slotKey,
  slotLabel,
  slotIcon,
  item,
  onClick,
  isSelected,
  disabled,
  tooltipPosition = 'left',
  showLabels = true,
  marker,
  size = 56,
}: WishlistSlotProps) {
  if (slotKey.startsWith('spacer')) {
    return <div style={{ width: size, height: size }} />;
  }

  const hasItem = !!item?.itemId;
  const itemName = item?.name || item?.itemName;

  const isRightSide = tooltipPosition === 'left';

  return (
    <Group
      gap="xs"
      wrap="nowrap"
      align="center"
      style={{ flexDirection: isRightSide ? 'row' : 'row' }}
    >
      {showLabels && isRightSide && hasItem && (
        <Text
          c={getQualityColor(item.quality)}
          size="sm"
          fw={500}
          ta="right"
          bg="rgba(0,0,0,0.7)"
          px="xs"
          visibleFrom="lg"
          py={2}
          style={{
            textShadow: '1px 1px 1px rgba(0,0,0,1)',
            borderRadius: '4px',
          }}
        >
          {itemName}
        </Text>
      )}

      <Tooltip
        label={slotLabel}
        disabled={hasItem}
        position={isRightSide ? 'left' : 'right'}
        withArrow
        transitionProps={{ duration: 200 }}
      >
        <Box
          w={size}
          h={size}
          bg="dark-7"
          style={{
            cursor: disabled ? 'not-allowed' : 'pointer',
            position: 'relative',
            borderRadius: 4,
            border: '2px solid',
            borderColor: isSelected
              ? 'var(--mantine-color-blue-filled)'
              : hasItem
                ? getQualityColor(item.quality)
                : 'var(--mantine-color-dark-4)',
            overflow: 'hidden',
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0,
          }}
          onClick={() => !disabled && onClick(slotKey)}
        >
          <Image
            src={hasItem ? resolveBlizzardIcon(item.icon) : resolveBlizzardIcon(slotIcon)}
            fallbackSrc={hasItem ? resolveFallbackIcon(item.icon) : resolveFallbackIcon(slotIcon)}
            w="100%"
            h="100%"
            style={{
              filter: hasItem ? 'none' : 'grayscale(100%)',
              opacity: hasItem ? 1 : 0.6,
            }}
          />

          {hasItem && (
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                pointerEvents: 'auto',
              }}
            >
              <WowheadLink
                itemId={item.itemId}
                itemLevel={item.ilevel || item.itemLevel}
                style={{
                  display: 'block',
                  position: 'absolute',
                  inset: 0,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    cursor: 'inherit',
                  }}
                  aria-label={itemName}
                />
              </WowheadLink>
            </Box>
          )}
          {hasItem && marker}
        </Box>
      </Tooltip>

      {showLabels && !isRightSide && hasItem && (
        <Text
          c={getQualityColor(item.quality)}
          size="sm"
          visibleFrom="lg"
          fw={500}
          bg="rgba(0, 0, 0, 0.7)"
          px="xs"
          py={2}
          style={{
            textShadow: '1px 1px 1px rgba(0,0,0,1)',
            borderRadius: '4px',
          }}
        >
          {itemName}
        </Text>
      )}
    </Group>
  );
}
