import { Badge, Button, CopyButton, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy, IconPencil } from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import { useTranslation } from 'react-i18next';
import type { BossNote } from 'services/bossNote.service';

import { formatBossNoteText } from './bossNotes.utils';
import { MarkdownLite } from './MarkdownLite';

interface BossNoteViewProps {
  bossName: string;
  note: BossNote | undefined;
  /** Absent pour qui ne peut pas modifier la note. */
  onEdit?: () => void;
}

const getClassColor = (className: string | null) => {
  if (!className) return undefined;
  const key = className.toLowerCase().replace(/\s+/g, '_');
  return classColors[key as keyof typeof classColors] || undefined;
};

/**
 * Note et assignations d'un boss, en lecture, avec copie du texte pour
 * Discord ou une note MRT (SIMS-206).
 */
export function BossNoteView({ bossName, note, onEdit }: BossNoteViewProps) {
  const { t } = useTranslation('eventRoster');
  const content = note?.content.trim() ?? '';
  const assignments = note?.assignments ?? [];
  const isEmpty = content === '' && assignments.length === 0;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={700}>{bossName}</Text>
        <Group gap="xs">
          {!isEmpty && (
            <CopyButton
              value={formatBossNoteText(
                bossName,
                { content, assignments },
                t('bossNotes.assignmentsTitle'),
              )}
            >
              {({ copied, copy }) => (
                <Tooltip label={t('bossNotes.copyHint')} withArrow>
                  <Button
                    size="xs"
                    variant="light"
                    color={copied ? 'teal' : 'gray'}
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    onClick={copy}
                  >
                    {copied ? t('bossNotes.copied') : t('bossNotes.copy')}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          )}
          {onEdit && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPencil size={14} />}
              onClick={onEdit}
            >
              {t('bossNotes.edit')}
            </Button>
          )}
        </Group>
      </Group>

      {isEmpty ? (
        <Text size="sm" c="dimmed">
          {t('bossNotes.empty')}
        </Text>
      ) : (
        <>
          {content !== '' && (
            <Paper withBorder p="sm" radius="md">
              <MarkdownLite content={content} />
            </Paper>
          )}
          {assignments.length > 0 && (
            <Stack gap={4}>
              <Text size="sm" fw={600}>
                {t('bossNotes.assignmentsTitle')}
              </Text>
              {assignments.map((assignment) => (
                <Group key={`${assignment.position}-${assignment.characterId}`} gap="xs">
                  <Text
                    size="sm"
                    fw={600}
                    c={getClassColor(assignment.characterClass)}
                    td={assignment.isHolder ? undefined : 'line-through'}
                  >
                    {assignment.characterName}
                  </Text>
                  <Text size="sm">{assignment.task}</Text>
                  {!assignment.isHolder && (
                    <Badge size="xs" color="orange" variant="light">
                      {t('bossNotes.notHolder')}
                    </Badge>
                  )}
                </Group>
              ))}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
