import { Box, Button, Flex, Tooltip } from '@mantine/core';
import { useRouteParams } from 'hooks/useRouteParams';
import React, { useCallback } from 'react';
import { resolveIconPath } from 'utils/resolveIconPath';

type BossImageCardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type BossImageCardVariant = 'button' | 'div';

interface BossImageCardProps {
  boss: any;
  idx: number;
  size?: BossImageCardSize;
  variant?: BossImageCardVariant;
  isSelected?: boolean;
  isCompleted?: boolean;
  completedAt?: string;
  onSelect: (idx: number) => void;
  fluid?: boolean;
}

const SIZE_MAP: Record<BossImageCardSize, { imageSize: number; padding: string }> = {
  xs: { imageSize: 36, padding: 'xs' },
  sm: { imageSize: 44, padding: 'sm' },
  md: { imageSize: 56, padding: 'md' },
  lg: { imageSize: 72, padding: 'lg' },
  xl: { imageSize: 80, padding: 'xl' },
};

export function BossImageCard({
  boss,
  idx,
  size = 'md',
  variant = 'button',
  isSelected = false,
  isCompleted = false,
  completedAt,
  onSelect,
  fluid = false,
}: BossImageCardProps): React.ReactElement {
  const { extension, season } = useRouteParams();
  const handleClick = useCallback(() => {
    onSelect(idx);
  }, [idx, onSelect]);

  const { imageSize } = SIZE_MAP[size];

  const iconPath = resolveIconPath(boss.icon, extension, season);

  const tooltipContent = (
    <Flex style={{ width: fluid ? '100%' : 'auto' }}>
      {variant === 'button' ? (
        <Button
          p={0}
          m={0}
          variant={isSelected ? 'filled' : 'outline'}
          onClick={handleClick}
          h={fluid ? 'auto' : imageSize}
          w={fluid ? '100%' : imageSize}
          style={{
            opacity: isCompleted ? 0.5 : 1,
            filter: isCompleted ? 'grayscale(100%)' : 'none',
            borderWidth: 2,
            borderColor: isSelected ? 'var(--mantine-color-blue-8)' : 'var(--mantine-color-gray-8)',
            aspectRatio: fluid ? '1 / 1' : undefined,
          }}
        >
          <img
            src={iconPath}
            alt={boss.name}
            style={{
              width: '100%',
              height: '100%',
              padding: 4,
            }}
          />
        </Button>
      ) : (
        <Box
          onClick={handleClick}
          w={fluid ? '100%' : imageSize}
          h={fluid ? 'auto' : imageSize}
          p={0}
          m={0}
          style={{
            backgroundColor: isSelected
              ? 'var(--mantine-color-blue-1)'
              : 'var(--mantine-color-gray-4)',
            borderWidth: 2,
            borderStyle: 'solid',
            borderRadius: 8,
            opacity: isCompleted ? 0.4 : 1,
            filter: isCompleted ? 'grayscale(100%)' : 'none',
            aspectRatio: fluid ? '1 / 1' : undefined,
          }}
        >
          <img
            src={iconPath}
            alt={boss.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </Box>
      )}
    </Flex>
  );

  return (
    <Tooltip
      label={isCompleted ? `Tué à ${completedAt}` : 'Boss disponible'}
      withArrow
      openDelay={500}
    >
      {tooltipContent}
    </Tooltip>
  );
}
