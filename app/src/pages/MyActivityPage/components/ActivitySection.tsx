import { Box, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { ReactNode } from 'react';

import classes from '../MyActivityPage.module.css';

interface ActivitySectionProps {
  /** Ancre visée par le bandeau « À faire ». */
  id?: string;
  icon: ReactNode;
  /** Couleur Mantine de l'icône. */
  color?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Contrôles à droite du titre. */
  actions?: ReactNode;
  children: ReactNode;
}

/** Bloc de la page : titre avec icône, description, contrôles, contenu. */
export function ActivitySection({
  id,
  icon,
  color = 'brand',
  title,
  description,
  actions,
  children,
}: ActivitySectionProps) {
  return (
    <Box component="section" id={id} className={`${classes.section} ${classes.anchor}`} p="lg">
      <Group justify="space-between" align="flex-start" gap="sm" mb="md">
        <Group gap="sm" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
          <ThemeIcon size={36} radius="md" variant="light" color={color}>
            {icon}
          </ThemeIcon>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Title order={4} fw={700} lh={1.2}>
              {title}
            </Title>
            {description && (
              <Text size="xs" c="dimmed">
                {description}
              </Text>
            )}
          </Stack>
        </Group>
        {actions}
      </Group>
      {children}
    </Box>
  );
}

interface ActivityEmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
}

/** État vide d'une section : une illustration, un texte, une action utile. */
export function ActivityEmptyState({ icon, title, text, action }: ActivityEmptyStateProps) {
  return (
    <Stack align="center" justify="center" gap="xs" py="lg" px="md" ta="center" flex={1}>
      <ThemeIcon
        size={56}
        radius="xl"
        variant="transparent"
        color="gray"
        className={classes.emptyIcon}
      >
        {icon}
      </ThemeIcon>
      <Text fw={600}>{title}</Text>
      {text && (
        <Text size="sm" c="dimmed" maw={360}>
          {text}
        </Text>
      )}
      {action && <Box mt={4}>{action}</Box>}
    </Stack>
  );
}
