import { Button, Checkbox, Group, Modal, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconUserPlus } from '@tabler/icons-react';
import { Select } from 'components/design-system/atoms/Select';
import { useAddOwnCharacter, useClassSpecializations } from 'hooks/queries';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character, ClassSpecializations, Specialization } from 'types/character.types';
import { specializationsOfClass } from 'utils/specializations';

import {
  addOwnCharacterErrorKey,
  type AddOwnCharacterValues,
  buildAddOwnCharacterPayload,
  gameSpecializationKey,
  isValidOwnCharacterName,
  OWN_CHARACTER_NAME_MAX,
} from './addOwnCharacter.utils';

interface AddOwnCharacterModalProps {
  opened: boolean;
  onClose: () => void;
  /** Guilde WoW Forever du joueur. */
  realmId: number;
  /** Personnage créé : l'appelant peut le sélectionner. */
  onAdded?: (character: Character) => void;
}

/**
 * « Ajouter mon personnage » (SIMS-050) : dans une guilde WoW Forever, sans API
 * Blizzard, le joueur saisit lui-même son personnage. Classes et spés viennent du
 * registre Forever (`?game=forever`), affichées avec leur libellé propre au jeu.
 */
export function AddOwnCharacterModal({
  opened,
  onClose,
  realmId,
  onAdded,
}: AddOwnCharacterModalProps) {
  const { t } = useTranslation('roster');
  const { data: classes, isLoading } = useClassSpecializations('forever');

  return (
    <Modal opened={opened} onClose={onClose} title={t('own_character.title')} centered>
      {isLoading || !classes ? (
        <Skeleton h={220} radius="sm" />
      ) : (
        <AddOwnCharacterForm
          realmId={realmId}
          classes={classes}
          onAdded={(character) => {
            onAdded?.(character);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

interface AddOwnCharacterFormProps {
  realmId: number;
  classes: ClassSpecializations[];
  onAdded: (character: Character) => void;
}

export function AddOwnCharacterForm({ realmId, classes, onAdded }: AddOwnCharacterFormProps) {
  const { t } = useTranslation(['roster', 'common']);
  const addOwn = useAddOwnCharacter();

  const form = useForm<AddOwnCharacterValues>({
    initialValues: { name: '', class: '', specializationId: null, offSpecializationIds: [] },
    validate: {
      name: (value) =>
        isValidOwnCharacterName(value)
          ? null
          : t('own_character.fields.name.error', { max: OWN_CHARACTER_NAME_MAX }),
      class: (value) => (value ? null : t('own_character.fields.class.error')),
    },
  });

  const specLabel = useCallback(
    (spec: Specialization) => {
      const label = spec.label ?? spec.name;
      return t(`common:specializations.${gameSpecializationKey(label)}`, { defaultValue: label });
    },
    [t],
  );

  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: c.name,
        label: t(`classes.${c.name}`, { defaultValue: c.name }),
      })),
    [classes, t],
  );
  const specs = specializationsOfClass(classes, form.values.class);
  const primaryId = form.values.specializationId;

  const handleClassChange = (value: string | null) => {
    form.setValues({ class: value ?? '', specializationId: null, offSpecializationIds: [] });
  };

  const handlePrimaryChange = (value: string | null) => {
    form.setValues({
      specializationId: value,
      offSpecializationIds: form.values.offSpecializationIds.filter((id) => id !== value),
    });
  };

  const handleSubmit = async (values: AddOwnCharacterValues) => {
    try {
      const character = await addOwn.mutateAsync(buildAddOwnCharacterPayload(realmId, values));
      notifications.show({
        title: t('notifications.success_title'),
        message: t('own_character.success', { name: character.name }),
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      form.reset();
      onAdded(character);
    } catch (error) {
      const key = addOwnCharacterErrorKey(error);
      const e = error as { message?: string } | null;
      notifications.show({
        title: t('notifications.error_title'),
        message: key ? t(key) : e?.message || t('own_character.errors.generic'),
        color: 'red',
      });
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('own_character.description')}
        </Text>

        <TextInput
          label={t('own_character.fields.name.label')}
          description={t('own_character.fields.name.description')}
          placeholder={t('own_character.fields.name.placeholder')}
          maxLength={OWN_CHARACTER_NAME_MAX}
          disabled={addOwn.isPending}
          required
          {...form.getInputProps('name')}
        />

        <Select
          label={t('own_character.fields.class.label')}
          placeholder={t('own_character.fields.class.placeholder')}
          data={classOptions}
          disabled={addOwn.isPending}
          required
          {...form.getInputProps('class')}
          onChange={handleClassChange}
        />

        <Select
          label={t('own_character.fields.spec.label')}
          placeholder={t('own_character.fields.spec.placeholder')}
          data={specs.map((s) => ({ value: String(s.id), label: specLabel(s) }))}
          disabled={!form.values.class || addOwn.isPending}
          clearable
          {...form.getInputProps('specializationId')}
          onChange={handlePrimaryChange}
        />

        {specs.length > 1 && (
          <Checkbox.Group
            label={t('own_character.fields.offspecs.label')}
            description={t('own_character.fields.offspecs.description')}
            {...form.getInputProps('offSpecializationIds')}
          >
            <Stack gap={6} mt={6}>
              {specs
                .filter((s) => String(s.id) !== primaryId)
                .map((s) => (
                  <Checkbox
                    key={s.id}
                    value={String(s.id)}
                    label={specLabel(s)}
                    disabled={addOwn.isPending}
                  />
                ))}
            </Stack>
          </Checkbox.Group>
        )}

        <Group justify="flex-end">
          <Button
            type="submit"
            color="brand.5"
            leftSection={<IconUserPlus size={16} />}
            loading={addOwn.isPending}
          >
            {t('own_character.submit')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
