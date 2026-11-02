import { Anchor, Badge, Checkbox, Group, Paper, Radio, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type {
  AttunementDefinition,
  CharacterAttunements,
  Faction,
  SaveAttunementPayload,
} from 'services/attunement.service';

import { statusOf, stepsAfterToggle, wowheadQuestUrl } from '../attunementView';

interface MyAttunementCardProps {
  character: CharacterAttunements;
  definition: AttunementDefinition;
  wowheadBaseUrl: string;
  saving: boolean;
  onSave: (payload: SaveAttunementPayload) => void;
}

/** Un personnage du joueur : faction, quêtes cochées, statut « prêt ». */
export function MyAttunementCard({
  character,
  definition,
  wowheadBaseUrl,
  saving,
  onSave,
}: MyAttunementCardProps) {
  const { t } = useTranslation('attunements');
  const status = statusOf(character, definition.key);
  const faction = status?.faction ?? null;
  const chain = faction ? definition.chains[faction] : [];
  const completedSteps = status?.completedSteps ?? 0;

  const save = (nextFaction: Faction, steps: number) =>
    onSave({
      characterId: character.characterId,
      attunement: definition.key,
      faction: nextFaction,
      completedSteps: steps,
    });

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>{character.name}</Text>
          <Badge color={status?.completed ? 'green' : 'gray'}>
            {status?.completed
              ? t('status.ready', { raid: definition.raid })
              : t('status.not_ready')}
          </Badge>
        </Group>

        <Radio.Group
          label={t('faction.label')}
          description={faction ? undefined : t('faction.hint')}
          value={faction ?? ''}
          onChange={(value) => save(value as Faction, 0)}
        >
          <Group mt="xs">
            <Radio value="alliance" label={t('faction.alliance')} disabled={saving} />
            <Radio value="horde" label={t('faction.horde')} disabled={saving} />
          </Group>
        </Radio.Group>

        {faction && (
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              {t('progress', { done: completedSteps, total: chain.length })}
            </Text>
            {chain.map((step, index) => (
              <Checkbox
                key={step.questId}
                disabled={saving}
                checked={index < completedSteps}
                onChange={(event) =>
                  save(faction, stepsAfterToggle(index, event.currentTarget.checked))
                }
                label={
                  <Anchor
                    href={wowheadQuestUrl(step.questId, wowheadBaseUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                  >
                    {`${index + 1}. ${step.name}`}
                  </Anchor>
                }
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
