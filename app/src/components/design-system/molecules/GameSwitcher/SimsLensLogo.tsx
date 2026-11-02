import { Group, Text } from '@mantine/core';

interface SimsLensLogoProps {
  /** Couleur de la loupe (variable CSS Mantine), selon le jeu courant. */
  color: string;
}

/** Logo SimsLens : une loupe en SVG inline suivie du nom, sans image externe. */
export function SimsLensLogo({ color }: SimsLensLogoProps) {
  return (
    <Group gap={6} wrap="nowrap">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="10" cy="10" r="6.5" fill="none" stroke={color} strokeWidth="2.5" />
        <path d="M15 15 L21 21" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path
          d="M7 11.5 L9.5 8.5 L11 10.5 L13 7.5"
          fill="none"
          stroke="var(--mantine-color-app-0)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <Text component="span" fw={800} size="lg" c="app.0" style={{ letterSpacing: '0.02em' }}>
        SimsLens
      </Text>
    </Group>
  );
}
