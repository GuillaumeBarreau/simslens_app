import { Text } from '@mantine/core';

interface ActorLabelProps {
  characterName: string;
}

export function ActorLabel({ characterName }: ActorLabelProps) {
  return (
    <Text component="span" fw={700} c="app.0">
      {characterName}
    </Text>
  );
}
