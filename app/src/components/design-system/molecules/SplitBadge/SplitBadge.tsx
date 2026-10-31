import { Badge, Tooltip } from '@mantine/core';
import React from 'react';

export interface SplitBadgeProps {
  label?: string;
}

export const SplitBadge: React.FC<SplitBadgeProps> = ({
  label = 'Assigné dans un autre raid sur la même tranche horaire',
}) => {
  return (
    <Tooltip label={label} withinPortal>
      <Badge
        size="xs"
        variant="light"
        color="orange"
        style={{ height: 16, fontSize: '9px', padding: '0 4px', cursor: 'help' }}
      >
        ⚔ Split
      </Badge>
    </Tooltip>
  );
};
