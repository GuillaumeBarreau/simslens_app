import { Box, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import React from 'react';

interface EmptyStateProps {
  title: string;
  description: React.ReactNode;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = IconSearch,
  action,
}) => {
  return (
    <Box py={60}>
      <Stack align="center" gap="md">
        <ThemeIcon
          size={64}
          radius="xl"
          variant="light"
          color="gray"
          style={{ border: '1px solid var(--mantine-color-app-6)' }}
        >
          <Icon size={32} stroke={1.5} />
        </ThemeIcon>
        <div style={{ textAlign: 'center' }}>
          <Title order={3} size="h3" mb="xs">
            {title}
          </Title>
          <Text c="dimmed" size="sm" maw={400} mx="auto">
            {description}
          </Text>
        </div>
        {action && <Box mt="sm">{action}</Box>}
      </Stack>
    </Box>
  );
};
