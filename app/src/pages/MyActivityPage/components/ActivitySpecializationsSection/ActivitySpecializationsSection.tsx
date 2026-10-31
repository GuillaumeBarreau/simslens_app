import { Badge, Button, Card, Checkbox, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconUserCog } from '@tabler/icons-react';
import { Select } from 'components/design-system/atoms/Select';
import { useCharacterSpecializations, useUpdateCharacterSpecializations } from 'hooks/queries';
import { useSpecializationLabel } from 'hooks/useSpecializationLabel';
import { useTranslation } from 'react-i18next';
import type { CharacterSpecializations } from 'types/character.types';
import { buildSpecializationsPayload, offSpecsWithoutPrimary } from 'utils/specializations';

interface ActivitySpecializationsSectionProps {
  characterId: number;
}

/**
 * « Mes spécialisations » (SIMS-212) : le joueur choisit sa spé principale et
 * ses off-specs parmi les spés de sa classe, et voit les spés pour lesquelles un
 * sim a été importé.
 */
export function ActivitySpecializationsSection({
  characterId,
}: ActivitySpecializationsSectionProps) {
  const { t } = useTranslation('myActivity');
  const { data, isLoading } = useCharacterSpecializations(characterId);

  return (
    <Card withBorder radius="md" p="md">
      <Group gap="xs" mb="xs">
        <IconUserCog size={18} />
        <Title order={4}>{t('specializations.title')}</Title>
      </Group>
      <Text size="sm" c="dimmed" mb="sm">
        {t('specializations.description')}
      </Text>

      {isLoading || !data ? (
        <Skeleton h={160} radius="sm" />
      ) : (
        <SpecializationsForm
          // Repart des valeurs enregistrées après chaque sauvegarde.
          key={`${data.characterId}:${data.primarySpecializationId}:${data.offSpecializationIds.join(',')}`}
          specializations={data}
        />
      )}
    </Card>
  );
}

interface SpecializationsFormProps {
  specializations: CharacterSpecializations;
}

export function SpecializationsForm({ specializations }: SpecializationsFormProps) {
  const { t } = useTranslation('myActivity');
  const specializationLabel = useSpecializationLabel();
  const update = useUpdateCharacterSpecializations();

  const form = useForm({
    initialValues: {
      primary: specializations.primarySpecializationId
        ? String(specializations.primarySpecializationId)
        : null,
      offSpecs: specializations.offSpecializationIds.map(String),
    },
  });

  const primaryId = form.values.primary ? Number(form.values.primary) : null;
  const offSpecIds = form.values.offSpecs.map(Number);
  const simmed = specializations.specializations.filter((s) => s.hasSimData);

  const handlePrimaryChange = (value: string | null) => {
    if (!value) return;
    form.setValues({
      primary: value,
      offSpecs: offSpecsWithoutPrimary(offSpecIds, Number(value)).map(String),
    });
  };

  const handleSubmit = async () => {
    try {
      await update.mutateAsync({
        characterId: specializations.characterId,
        payload: buildSpecializationsPayload(
          specializations.primarySpecializationId,
          primaryId,
          offSpecIds,
        ),
      });
      notifications.show({
        message: t('specializations.saved'),
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      const e = error as { response?: { data?: { message?: string } }; message?: string } | null;
      notifications.show({
        title: t('specializations.error_title'),
        message: e?.response?.data?.message || e?.message || t('specializations.error'),
        color: 'red',
      });
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <Select
          label={t('specializations.primary_label')}
          placeholder={t('specializations.primary_placeholder')}
          size="sm"
          allowDeselect={false}
          data={specializations.specializations.map((s) => ({
            value: String(s.id),
            label: specializationLabel(s.name),
          }))}
          value={form.values.primary}
          onChange={handlePrimaryChange}
        />

        <Checkbox.Group
          label={t('specializations.offspecs_label')}
          description={t('specializations.offspecs_description')}
          {...form.getInputProps('offSpecs')}
        >
          <Stack gap={6} mt={6}>
            {specializations.specializations
              .filter((s) => s.id !== primaryId)
              .map((s) => (
                <Checkbox key={s.id} value={String(s.id)} label={specializationLabel(s.name)} />
              ))}
          </Stack>
        </Checkbox.Group>

        <div>
          <Text size="sm" fw={500}>
            {t('specializations.sim_data_label')}
          </Text>
          {simmed.length > 0 ? (
            <Group gap={6} mt={4}>
              {simmed.map((s) => (
                <Badge key={s.id} variant="light" color="teal">
                  {specializationLabel(s.name)}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text size="xs" c="dimmed">
              {t('specializations.sim_data_empty')}
            </Text>
          )}
        </div>

        <Group justify="flex-end">
          <Button
            type="submit"
            size="xs"
            color="brand.5"
            loading={update.isPending}
            disabled={!form.isDirty()}
          >
            {t('specializations.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
