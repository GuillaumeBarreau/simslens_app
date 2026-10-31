import { Drawer as MantineDrawer, DrawerProps as MantineDrawerProps } from '@mantine/core';
import React from 'react';

export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';

export interface DrawerProps extends Omit<MantineDrawerProps, 'opened' | 'position'> {
  opened: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  position?: DrawerPosition;
  size?: string | number;
}

export const Drawer: React.FC<DrawerProps> = ({
  opened,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
  ...props
}) => {
  return (
    <MantineDrawer
      opened={opened}
      onClose={onClose}
      title={title}
      position={position}
      size={size}
      {...props}
    >
      {children}
    </MantineDrawer>
  );
};
