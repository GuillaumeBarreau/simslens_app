import { Group, Paper } from '@mantine/core';
import React, { ReactNode } from 'react';

export interface ListRowProps {
  leftSection: ReactNode;
  leftSectionWidth?: number;
  bg?: string;
  p?: string | number;
  h?: string | number;
  children: ReactNode;
}

export const ListRow: React.FC<ListRowProps> = ({
  leftSection,
  leftSectionWidth = 300,
  bg = 'app.7',
  p = 'sm',
  h,
  children,
}) => {
  return (
    <Paper
      p={p}
      radius="md"
      withBorder
      bg={bg}
      h={h}
      style={h ? { overflow: 'hidden' } : undefined}
    >
      <Group align="center" wrap="nowrap" h="100%">
        <Group style={{ width: leftSectionWidth, flexShrink: 0 }} align="center">
          {leftSection}
        </Group>

        <Group gap="sm" style={{ flex: 1 }} align="flex-start" wrap="wrap">
          {children}
        </Group>
      </Group>
    </Paper>
  );
};
