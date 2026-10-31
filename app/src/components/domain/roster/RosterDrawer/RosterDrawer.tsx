import { Button, Group, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconEdit, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import {
  useClassSpecializations,
  useCreateCharacter,
  useDeleteCharacter,
  useRegions,
  useUpdateCharacter,
} from 'hooks/queries';
import { useSpecializationLabel } from 'hooks/useSpecializationLabel';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { specializationsOfClass } from 'utils/specializations';

import { Select } from '../../../design-system/atoms/Select';
import { Drawer } from '../../../design-system/organisms/Drawer';

interface Region {
  name: string;
  servers?: { slug: string; name: string }[];
}

interface AxiosErrorLike {
  response?: { data?: { message?: string } };
  message?: string;
}

interface Character {
  id: number;
  name: string;
  class: string | number;
  realm: string;
  region?: string | null;
  spec?: string | null;
  specialization?: {
    name: string;
  };
  discordTag?: string | null;
  hasDiscord?: boolean;
  lastModified?: number | string;
  thumbnail?: string | null;
}

interface RosterDrawerProps {
  opened: boolean;
  onClose: () => void;
  onCharacterAdded: () => void;
  onCharacterRemoved: () => void;
  onCharacterUpdated: () => void;
  editingCharacter: Character | null;
  realmId?: number;
}

const RosterDrawer: React.FC<RosterDrawerProps> = ({
  opened,
  onClose,
  onCharacterAdded,
  onCharacterRemoved,
  onCharacterUpdated,
  editingCharacter,
  realmId,
}) => {
  const { t } = useTranslation('roster');

  const createCharacterMutation = useCreateCharacter();
  const updateCharacterMutation = useUpdateCharacter();
  const deleteCharacterMutation = useDeleteCharacter();

  const isEditMode = editingCharacter !== null;
  const [serverOptions, setServerOptions] = useState<{ value: string; label: string }[]>([]);

  const addForm = useForm({
    initialValues: {
      name: '',
      class: '',
      realm: '',
      spec: '',
      region: 'EU',
    },
    validate: {
      name: (value) => (value.length < 2 ? t('drawer.fields.name.error') : null),
      class: (value) => (!value ? t('drawer.fields.class.error') : null),
      realm: (value) => (value.length < 2 ? t('drawer.fields.realm.error') : null),
      spec: (value) => (!value ? t('drawer.fields.spec.error') : null),
    },
  });

  useEffect(() => {
    if (editingCharacter) {
      addForm.setValues({
        name: editingCharacter.name || '',
        class: String(editingCharacter.class) || '',
        realm: editingCharacter.realm || '',
        spec: editingCharacter.specialization?.name || editingCharacter.spec || '',
        region: editingCharacter.region || 'EU',
      });
    } else {
      addForm.reset();
    }
    // Mantine's setValues/reset are stable (useCallback); depend on the whole
    // form object would loop since it is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCharacter, addForm.setValues, addForm.reset]);

  // Spés servies par l'API (SIMS-212) ; la valeur reste le nom anglais, que le
  // serveur résout dans la classe, le libellé est traduit.
  const { data: classSpecializations } = useClassSpecializations();
  const specializationLabel = useSpecializationLabel();
  const specOptions = React.useMemo(
    () =>
      specializationsOfClass(classSpecializations, addForm.values.class).map((s) => ({
        value: s.name,
        label: specializationLabel(s.name),
      })),
    [classSpecializations, addForm.values.class, specializationLabel],
  );

  useEffect(() => {
    // Liste pas encore chargée : ne pas vider la spé du personnage édité.
    if (!classSpecializations) return;
    if (addForm.values.class && addForm.values.spec) {
      const validSpecs = specOptions.map((o) => o.value);
      if (!validSpecs.includes(addForm.values.spec)) {
        addForm.setFieldValue('spec', '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    classSpecializations,
    addForm.values.class,
    addForm.values.spec,
    specOptions,
    addForm.setFieldValue,
  ]);

  const { data: regionsData } = useRegions() as { data: Region[] | undefined };
  const regionOptions = regionsData?.map((r) => ({
    value: r.name,
    label: r.name,
  }));

  useEffect(() => {
    if (!regionsData) return;
    const selectedRegion = regionsData.find((r) => r.name === addForm.values.region);
    if (selectedRegion?.servers) {
      const opts = selectedRegion.servers.map((s) => ({ value: s.slug, label: s.name }));
      setServerOptions(opts);
    } else {
      setServerOptions([]);
    }
  }, [addForm.values.region, regionsData]);

  const classOptions = [
    { value: 'warrior', label: t('classes.warrior') },
    { value: 'paladin', label: t('classes.paladin') },
    { value: 'hunter', label: t('classes.hunter') },
    { value: 'rogue', label: t('classes.rogue') },
    { value: 'priest', label: t('classes.priest') },
    { value: 'death_knight', label: t('classes.death_knight') },
    { value: 'shaman', label: t('classes.shaman') },
    { value: 'mage', label: t('classes.mage') },
    { value: 'warlock', label: t('classes.warlock') },
    { value: 'monk', label: t('classes.monk') },
    { value: 'druid', label: t('classes.druid') },
    { value: 'demon_hunter', label: t('classes.demon_hunter') },
    { value: 'evoker', label: t('classes.evoker') },
  ];

  const handleAddCharacter = async (values: typeof addForm.values) => {
    if (isEditMode && editingCharacter) {
      updateCharacterMutation.mutate(
        {
          id: editingCharacter.id,
          payload: {
            name: values.name,
            class: values.class,
            realm: values.realm,
            region: values.region,
            spec: values.spec,
            discordTag: editingCharacter.discordTag ?? '',
            realmId,
          },
        },
        {
          onSuccess: () => {
            notifications.show({
              position: 'bottom-center',
              title: t('notifications.success_title'),
              message: t('drawer.notifications.update_success', { name: values.name }),
              color: 'green',
              icon: <IconCheck size={16} />,
            });
            addForm.reset();
            onCharacterUpdated();
          },
          onError: (error: unknown) => {
            const axiosErr = error as AxiosErrorLike;
            notifications.show({
              position: 'bottom-center',
              title: t('notifications.error_title'),
              message: axiosErr.response?.data?.message || t('drawer.notifications.update_error'),
              color: 'red',
              icon: <IconX size={16} />,
            });
          },
        },
      );
    } else {
      createCharacterMutation.mutate(
        {
          name: values.name,
          class: values.class,
          realm: values.realm,
          region: values.region,
          lastModified: Date.now(),
          spec: values.spec,
          realmId,
        },
        {
          onSuccess: () => {
            notifications.show({
              title: t('notifications.success_title'),
              message: t('drawer.notifications.add_success', { name: values.name }),
              color: 'green',
              icon: <IconCheck size={16} />,
            });
            addForm.reset();
            onCharacterAdded();
          },
          onError: (error: unknown) => {
            const axiosErr = error as AxiosErrorLike;
            notifications.show({
              position: 'bottom-center',
              title: t('notifications.error_title'),
              message: axiosErr.response?.data?.message || t('drawer.notifications.add_error'),
              color: 'red',
              icon: <IconX size={16} />,
            });
          },
        },
      );
    }
  };

  const handleRemoveCharacter = async (characterId: number, characterName: string) => {
    deleteCharacterMutation.mutate(
      { id: characterId, realmId },
      {
        onSuccess: () => {
          notifications.show({
            position: 'bottom-center',
            title: t('notifications.success_title'),
            message: t('drawer.notifications.remove_success', { name: characterName }),
            color: 'green',
            icon: <IconCheck size={16} />,
          });
          onCharacterRemoved();
        },
        onError: (error: unknown) => {
          const axiosErr = error as AxiosErrorLike;
          notifications.show({
            position: 'bottom-center',
            title: t('notifications.error_title'),
            message: axiosErr.response?.data?.message || t('drawer.notifications.remove_error'),
            color: 'red',
            icon: <IconX size={16} />,
          });
        },
      },
    );
  };

  return (
    <Drawer opened={opened} onClose={onClose} title={t('drawer.title')} position="right" size="lg">
      <Stack gap="xl">
        <Title order={3} mb="md">
          <Group gap="xs">
            {isEditMode ? <IconEdit size={20} /> : <IconPlus size={20} />}
            {isEditMode ? t('drawer.edit_title') : t('drawer.add_title')}
          </Group>
        </Title>

        <form onSubmit={addForm.onSubmit(handleAddCharacter)}>
          <Stack gap="md">
            <TextInput
              label={t('drawer.fields.name.label')}
              placeholder={t('drawer.fields.name.placeholder')}
              {...addForm.getInputProps('name')}
              required
            />

            <Group grow>
              <Select
                label={t('drawer.fields.class.label')}
                placeholder={t('drawer.fields.class.placeholder')}
                data={classOptions}
                {...addForm.getInputProps('class')}
                required
              />
            </Group>

            <Group grow>
              <Select
                label={t('drawer.fields.realm.label')}
                placeholder={t('drawer.fields.realm.placeholder')}
                data={serverOptions}
                searchable
                {...addForm.getInputProps('realm')}
                required
              />

              <Select
                label={t('drawer.fields.region.label')}
                data={regionOptions ?? []}
                {...addForm.getInputProps('region')}
                required
              />

              <Select
                label={t('drawer.fields.spec.label')}
                placeholder={t('drawer.fields.spec.placeholder', {
                  defaultValue: 'Select specialization',
                })}
                data={specOptions}
                {...addForm.getInputProps('spec')}
                required
                disabled={!addForm.values.class}
              />
            </Group>

            <Group justify="space-between">
              {isEditMode && (
                <Button
                  color="red"
                  variant="light"
                  loading={deleteCharacterMutation.isPending}
                  onClick={() => handleRemoveCharacter(editingCharacter.id, editingCharacter.name)}
                  leftSection={<IconTrash size={16} />}
                >
                  {t('table.delete')}
                </Button>
              )}

              <Button
                bg="brand.5"
                type="submit"
                loading={createCharacterMutation.isPending || updateCharacterMutation.isPending}
                leftSection={isEditMode ? <IconCheck size={16} /> : <IconPlus size={16} />}
                style={{ flex: 1, marginLeft: isEditMode ? 16 : 0 }}
              >
                {isEditMode ? t('drawer.buttons.update') : t('drawer.buttons.add')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Drawer>
  );
};

export default RosterDrawer;
