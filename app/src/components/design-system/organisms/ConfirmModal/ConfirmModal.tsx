import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import React, { type ReactNode } from 'react';

import { Modal } from '../Modal';

export interface ConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  alert?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  alert,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  isLoading = false,
}) => {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg">
      <Stack gap="lg" p="lg">
        {alert && (
          <Alert color="brand" variant="light">
            {alert}
          </Alert>
        )}
        <Text size="sm" c="dimmed">
          {message}
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} color="brand.6" c="white">
            {cancelLabel}
          </Button>
          <Button color="brand.6" onClick={onConfirm} loading={isLoading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
