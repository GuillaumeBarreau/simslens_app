import { Alert, Drawer, Select, Skeleton, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useBossNotes, useSaveBossNote } from 'hooks/queries';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SaveBossNotePayload } from 'services/bossNote.service';
import type { RosterAssignment } from 'services/roster.service';

import type { BossHolder } from './BossNoteEditor';
import { BossNoteEditor } from './BossNoteEditor';
import { BossNoteView } from './BossNoteView';

interface BossNotesDrawerProps {
  opened: boolean;
  onClose: () => void;
  eventId: number;
  realmId: number;
  bosses: { id: number; name: string }[];
  /** Placements du roster de l'événement, tous boss confondus. */
  assignments: RosterAssignment[];
  canEdit: boolean;
}

/** Titulaires d'un boss, par nom. */
export function holdersOfBoss(assignments: RosterAssignment[], bossId: number): BossHolder[] {
  const byId = new Map<number, BossHolder>();
  for (const a of assignments) {
    if (a.bossId !== bossId || byId.has(a.characterId)) continue;
    byId.set(a.characterId, {
      characterId: a.characterId,
      name: a.character?.name ?? `#${a.characterId}`,
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Notes de stratégie et assignations par boss, rattachées au roster de
 * l'événement (SIMS-206). Lecture pour tous, saisie pour les officiers.
 */
export function BossNotesDrawer({
  opened,
  onClose,
  eventId,
  realmId,
  bosses,
  assignments,
  canEdit,
}: BossNotesDrawerProps) {
  const { t } = useTranslation('eventRoster');
  const { data: notes = [], isLoading, isError } = useBossNotes(eventId, realmId, opened);
  const saveNote = useSaveBossNote(eventId, realmId);
  const [selectedBossId, setSelectedBossId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  const bossId = selectedBossId ?? bosses[0]?.id ?? null;
  const boss = bosses.find((b) => b.id === bossId);
  const note = notes.find((n) => n.bossId === bossId);
  const holders = useMemo(
    () => (bossId === null ? [] : holdersOfBoss(assignments, bossId)),
    [assignments, bossId],
  );

  const selectBoss = (value: string | null) => {
    setSelectedBossId(value ? Number(value) : null);
    setEditing(false);
  };

  const handleSave = (payload: SaveBossNotePayload) => {
    if (bossId === null) return;
    saveNote.mutate(
      { bossId, payload },
      {
        onSuccess: () => {
          notifications.show({ color: 'green', message: t('bossNotes.saved') });
          setEditing(false);
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { message?: string } } };
          notifications.show({
            color: 'red',
            title: t('bossNotes.saveError'),
            message: err.response?.data?.message ?? '',
          });
        },
      },
    );
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      title={t('bossNotes.title')}
    >
      <Stack gap="md">
        <Select
          label={t('bossNotes.bossLabel')}
          data={bosses.map((b) => ({ value: String(b.id), label: b.name }))}
          value={bossId === null ? null : String(bossId)}
          onChange={selectBoss}
          allowDeselect={false}
        />

        {isError && (
          <Alert color="red" variant="light">
            {t('bossNotes.loadError')}
          </Alert>
        )}

        {isLoading ? (
          <Skeleton h={200} radius="md" />
        ) : (
          boss &&
          (editing && canEdit ? (
            <BossNoteEditor
              key={boss.id}
              note={note}
              holders={holders}
              isSaving={saveNote.isPending}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <BossNoteView
              bossName={boss.name}
              note={note}
              onEdit={canEdit ? () => setEditing(true) : undefined}
            />
          ))
        )}
      </Stack>
    </Drawer>
  );
}
