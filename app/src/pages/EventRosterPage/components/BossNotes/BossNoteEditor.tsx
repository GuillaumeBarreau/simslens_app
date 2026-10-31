import { ActionIcon, Button, Group, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { BossNote, SaveBossNotePayload } from 'services/bossNote.service';

/** Bornes alignées sur le serveur (boss_note.validation.ts). */
export const MAX_CONTENT_LENGTH = 10_000;
export const MAX_TASK_LENGTH = 200;
export const MAX_ASSIGNMENTS = 40;

export interface BossHolder {
  characterId: number;
  name: string;
}

interface BossNoteEditorProps {
  note: BossNote | undefined;
  /** Titulaires du boss : seuls assignables. */
  holders: BossHolder[];
  isSaving: boolean;
  onSave: (payload: SaveBossNotePayload) => void;
  onCancel: () => void;
}

interface AssignmentRow {
  characterId: string | null;
  task: string;
}

interface FormValues {
  content: string;
  assignments: AssignmentRow[];
}

/**
 * Saisie de la note d'un boss et de ses assignations (titulaire → tâche).
 * Une assignation dont le personnage a quitté le roster du boss n'est pas
 * reprise : l'enregistrer serait refusé par le serveur.
 */
export function BossNoteEditor({ note, holders, isSaving, onSave, onCancel }: BossNoteEditorProps) {
  const { t } = useTranslation('eventRoster');

  const form = useForm<FormValues>({
    initialValues: {
      content: note?.content ?? '',
      assignments: (note?.assignments ?? [])
        .filter((a) => a.isHolder)
        .map((a) => ({ characterId: String(a.characterId), task: a.task })),
    },
    validate: {
      content: (value) =>
        value.length > MAX_CONTENT_LENGTH
          ? t('bossNotes.errors.contentTooLong', { max: MAX_CONTENT_LENGTH })
          : null,
      assignments: {
        characterId: (value) => (value ? null : t('bossNotes.errors.playerRequired')),
        task: (value) => {
          if (!value.trim()) return t('bossNotes.errors.taskRequired');
          if (value.length > MAX_TASK_LENGTH) {
            return t('bossNotes.errors.taskTooLong', { max: MAX_TASK_LENGTH });
          }
          return null;
        },
      },
    },
  });

  const holderOptions = holders.map((h) => ({ value: String(h.characterId), label: h.name }));

  const handleSubmit = (values: FormValues) => {
    onSave({
      content: values.content,
      assignments: values.assignments.map((a) => ({
        characterId: Number(a.characterId),
        task: a.task.trim(),
      })),
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Textarea
          label={t('bossNotes.contentLabel')}
          description={t('bossNotes.contentHint')}
          autosize
          minRows={6}
          maxRows={18}
          disabled={isSaving}
          {...form.getInputProps('content')}
        />

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {t('bossNotes.assignmentsTitle')}
          </Text>
          {holders.length === 0 && (
            <Text size="xs" c="dimmed">
              {t('bossNotes.noHolders')}
            </Text>
          )}
          {form.values.assignments.map((_, index) => (
            <Group key={form.key(`assignments.${index}`)} gap="xs" align="flex-start" wrap="nowrap">
              <Select
                aria-label={t('bossNotes.playerLabel')}
                placeholder={t('bossNotes.playerLabel')}
                data={holderOptions}
                searchable
                disabled={isSaving}
                w={180}
                {...form.getInputProps(`assignments.${index}.characterId`)}
              />
              <TextInput
                aria-label={t('bossNotes.taskLabel')}
                placeholder={t('bossNotes.taskPlaceholder')}
                disabled={isSaving}
                style={{ flex: 1 }}
                {...form.getInputProps(`assignments.${index}.task`)}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                mt={4}
                aria-label={t('bossNotes.removeAssignment')}
                disabled={isSaving}
                onClick={() => form.removeListItem('assignments', index)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Group>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconPlus size={14} />}
              disabled={
                isSaving ||
                holders.length === 0 ||
                form.values.assignments.length >= MAX_ASSIGNMENTS
              }
              onClick={() => form.insertListItem('assignments', { characterId: null, task: '' })}
            >
              {t('bossNotes.addAssignment')}
            </Button>
          </Group>
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onCancel} disabled={isSaving}>
            {t('bossNotes.cancel')}
          </Button>
          <Button type="submit" loading={isSaving}>
            {t('bossNotes.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
