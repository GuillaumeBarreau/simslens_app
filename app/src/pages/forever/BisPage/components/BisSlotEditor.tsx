import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BisItem, BisSlot } from 'services/bis.service';

import {
  addBisItem,
  type AddBisItemError,
  MAX_BIS_ITEMS_PER_SLOT,
  moveBisItem,
  toSaveItems,
} from '../bisList';

interface BisSlotEditorProps {
  slot: BisSlot;
  /** Palier édité : seule une liste de la guilde de ce palier peut être retirée. */
  season: string;
  onClose: () => void;
  /** Liste ordonnée à enregistrer pour la guilde. */
  onSave: (items: { itemId: number; note?: string }[]) => void;
  /** Supprime la liste de la guilde : l'emplacement revient à la référence. */
  onReset: () => void;
  isSaving: boolean;
}

/**
 * Édition d'un emplacement par un responsable du raid : ajout par ID ou URL Wowhead,
 * note, ordre, suppression. Rien n'est envoyé avant « Enregistrer ».
 */
export function BisSlotEditor({
  slot,
  season,
  onClose,
  onSave,
  onReset,
  isSaving,
}: BisSlotEditorProps) {
  const { t } = useTranslation('bis');
  const [items, setItems] = useState<BisItem[]>(slot.items);
  const [itemInput, setItemInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [addError, setAddError] = useState<AddBisItemError | null>(null);

  const label = t(`slots.${slot.slot}`, { defaultValue: slot.slot });
  const isFull = items.length >= MAX_BIS_ITEMS_PER_SLOT;

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    const result = addBisItem(items, itemInput, noteInput);
    if (result.error) {
      setAddError(result.error);
      return;
    }
    setItems(result.items);
    setItemInput('');
    setNoteInput('');
    setAddError(null);
  };

  const setNote = (index: number, note: string) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, note } : item)));

  return (
    <Modal opened onClose={onClose} title={t('editor.title', { slot: label })} size="lg">
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          {t('editor.help', { max: MAX_BIS_ITEMS_PER_SLOT })}
        </Text>

        {items.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('editor.empty')}
          </Text>
        ) : (
          <Stack gap="xs">
            {items.map((item, index) => (
              <Group key={item.itemId} gap="xs" wrap="nowrap" align="center">
                <Badge
                  size="sm"
                  circle
                  variant={index === 0 ? 'filled' : 'default'}
                  color={index === 0 ? 'yellow' : undefined}
                >
                  {index + 1}
                </Badge>
                <Text size="sm" w={180} truncate>
                  <WowheadLink itemId={item.itemId} game="forever" renameLink enableLink>
                    {t('item_fallback', { id: item.itemId })}
                  </WowheadLink>
                </Text>
                <TextInput
                  size="xs"
                  style={{ flex: 1 }}
                  placeholder={t('editor.note_placeholder')}
                  aria-label={t('editor.note_for', { id: item.itemId })}
                  maxLength={200}
                  value={item.note ?? ''}
                  onChange={(event) => setNote(index, event.currentTarget.value)}
                />
                <Tooltip label={t('editor.move_up')}>
                  <ActionIcon
                    variant="subtle"
                    aria-label={t('editor.move_up_item', { id: item.itemId })}
                    disabled={index === 0}
                    onClick={() => setItems((current) => moveBisItem(current, index, -1))}
                  >
                    <IconArrowUp size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={t('editor.move_down')}>
                  <ActionIcon
                    variant="subtle"
                    aria-label={t('editor.move_down_item', { id: item.itemId })}
                    disabled={index === items.length - 1}
                    onClick={() => setItems((current) => moveBisItem(current, index, 1))}
                  >
                    <IconArrowDown size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={t('editor.remove')}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t('editor.remove_item', { id: item.itemId })}
                    onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ))}
          </Stack>
        )}

        <form onSubmit={handleAdd}>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <TextInput
              size="xs"
              style={{ flex: 1 }}
              label={t('editor.item_label')}
              placeholder="https://www.wowhead.com/forever/item=19019"
              value={itemInput}
              disabled={isFull}
              error={addError ? t(`editor.errors.${addError}`) : undefined}
              onChange={(event) => {
                setItemInput(event.currentTarget.value);
                setAddError(null);
              }}
            />
            <TextInput
              size="xs"
              style={{ flex: 1 }}
              label={t('editor.note_label')}
              placeholder={t('editor.note_placeholder')}
              maxLength={200}
              value={noteInput}
              disabled={isFull}
              onChange={(event) => setNoteInput(event.currentTarget.value)}
            />
            <Button
              type="submit"
              size="xs"
              mt={22}
              leftSection={<IconPlus size={14} />}
              disabled={isFull || !itemInput.trim()}
            >
              {t('editor.add')}
            </Button>
          </Group>
        </form>

        <Group justify="space-between" mt="sm">
          {slot.source === 'guild' && slot.season === season ? (
            <Button variant="subtle" color="orange" onClick={onReset} loading={isSaving}>
              {t('editor.reset')}
            </Button>
          ) : (
            <span />
          )}
          <Group gap="xs">
            <Button variant="default" onClick={onClose} disabled={isSaving}>
              {t('editor.cancel')}
            </Button>
            <Button onClick={() => onSave(toSaveItems(items))} loading={isSaving}>
              {t('editor.save')}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
