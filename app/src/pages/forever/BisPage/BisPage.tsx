import { Alert, Container, Group, Select, Skeleton, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle } from '@tabler/icons-react';
import { useAuth, useRealmAccess } from 'contexts';
import { useBisList, useClassSpecializations, useSaveBisSlot, useUserRealm } from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Permission } from 'types/permissions';

import { hasAnyBisItem, resolveBisSpecId } from './bisList';
import { BisSlotEditor } from './components/BisSlotEditor';
import { BisSlotGrid } from './components/BisSlotGrid';

/**
 * Listes BiS WoW Forever (SIMS-065) : la liste retenue pour une spé et le palier
 * courant (guilde, sinon référence, en remontant les paliers), éditable par les
 * responsables du raid.
 */
export default function BisPage() {
  const { t } = useTranslation('bis');
  const { user, selectedCharacterId } = useAuth();
  const { hasPermission } = useRealmAccess();
  const { season } = useRouteParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editedSlot, setEditedSlot] = useState<string | null>(null);

  const { data: realm } = useUserRealm(user?.id ? String(user.id) : null);
  const realmId = realm?.id;
  const canEdit = hasPermission(Permission.MANAGE_RAID);

  const { data: classes, isLoading: classesLoading } = useClassSpecializations('forever');
  const specOptions = useMemo(
    () =>
      (classes ?? []).map((cls) => ({
        group: t(`roster:classes.${cls.name}`, { defaultValue: cls.name }),
        items: cls.specializations.map((spec) => ({
          value: String(spec.id),
          label: spec.label ?? spec.name,
        })),
      })),
    [classes, t],
  );

  const selectedCharacter = user?.linkedCharacters?.find((c) => c.id === selectedCharacterId);
  const characterSpecId =
    selectedCharacter?.specializationId ?? selectedCharacter?.specialization?.id;
  const specializationId = useMemo(
    () =>
      resolveBisSpecId(
        searchParams.get('specId'),
        characterSpecId,
        (classes ?? []).flatMap((cls) => cls.specializations.map((spec) => spec.id)),
      ),
    [searchParams, characterSpecId, classes],
  );

  const bis = useBisList(realmId, specializationId, season);
  const saveSlot = useSaveBisSlot(realmId);
  const slots = bis.data?.slots;
  const editedBisSlot = slots?.find((s) => s.slot === editedSlot);

  // Les liens Wowhead rendus après le chargement du script reçoivent leur tooltip.
  useEffect(() => {
    if (!slots) return;
    const timer = setTimeout(() => window.$WowheadPower?.refreshLinks(), 100);
    return () => clearTimeout(timer);
  }, [slots]);

  const handleSpecChange = (value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('specId', value);
    else next.delete('specId');
    setSearchParams(next, { replace: false });
    setEditedSlot(null);
  };

  const save = async (slot: string, items: { itemId: number; note?: string }[]) => {
    if (!specializationId || !season) return;
    try {
      await saveSlot.mutateAsync({ slot, payload: { specializationId, season, items } });
      notifications.show({
        message: items.length > 0 ? t('notifications.saved') : t('notifications.reset'),
        color: 'green',
      });
      setEditedSlot(null);
    } catch {
      notifications.show({ message: t('notifications.error'), color: 'red' });
    }
  };

  return (
    <Container size="xl" mt="xl" mb="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Stack gap={4}>
            <Title order={2}>{t('title')}</Title>
            <Text size="sm" c="dimmed">
              {t(canEdit ? 'subtitle_edit' : 'subtitle')}
            </Text>
          </Stack>
          {classesLoading ? (
            <Skeleton height={36} width={260} />
          ) : (
            <Select
              w={260}
              label={t('spec_label')}
              placeholder={t('spec_placeholder')}
              data={specOptions}
              value={specializationId ? String(specializationId) : null}
              onChange={handleSpecChange}
              searchable
              allowDeselect={false}
            />
          )}
        </Group>

        {!specializationId ? (
          !classesLoading && (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              {t('choose_spec')}
            </Alert>
          )
        ) : bis.isLoading ? (
          <Skeleton height={480} radius="md" />
        ) : bis.isError ? (
          <Alert color="red" variant="light">
            {t('load_error')}
          </Alert>
        ) : (
          <>
            {!hasAnyBisItem(slots) && (
              <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
                {t('empty')}
              </Alert>
            )}
            <BisSlotGrid
              slots={slots}
              season={season}
              onEditSlot={canEdit ? setEditedSlot : undefined}
            />
          </>
        )}
      </Stack>

      {canEdit && editedSlot && season && (
        <BisSlotEditor
          key={`${specializationId}-${editedSlot}`}
          slot={editedBisSlot ?? { slot: editedSlot, source: null, season: null, items: [] }}
          season={season}
          onClose={() => setEditedSlot(null)}
          onSave={(items) => save(editedSlot, items)}
          onReset={() => save(editedSlot, [])}
          isSaving={saveSlot.isPending}
        />
      )}
    </Container>
  );
}
