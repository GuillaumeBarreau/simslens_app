import { Modal as MantineModal, ModalProps as MantineModalProps } from '@mantine/core';
import React from 'react';

export interface ModalProps extends Omit<MantineModalProps, 'opened'> {
  opened: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  centered?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  opened,
  onClose,
  title,
  children,
  size = 'md',
  centered = true,
  closeOnClickOutside = true,
  closeOnEscape = true,
  ...props
}) => {
  return (
    <MantineModal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      centered={centered}
      closeOnClickOutside={closeOnClickOutside}
      closeOnEscape={closeOnEscape}
      {...props}
    >
      {children}
    </MantineModal>
  );
};
