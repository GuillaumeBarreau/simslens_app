import { Alert, Group, List, Stack, Text, Tooltip } from '@mantine/core';
import { IconEyeOff } from '@tabler/icons-react';
import { useSpecializationLabel } from 'hooks/useSpecializationLabel';
import { useTranslation } from 'react-i18next';
import type { RosterHiddenSpecWishlists } from 'types/character.types';

/**
 * Wishlists que la vue roster n'affiche pas (SIMS-212) : celles des autres spés
 * que la spé affichée, en général des off-specs. Elles sont signalées au lieu
 * d'être masquées en silence.
 */

/** Personnages dont aucune ligne n'est affichée : wishlist remplie seulement hors spé. */
export function withoutShownWishlist(
  hidden: RosterHiddenSpecWishlists[] | undefined,
  shownCharacterIds: Set<number>,
): RosterHiddenSpecWishlists[] {
  return (hidden ?? []).filter((entry) => !shownCharacterIds.has(entry.character.id));
}

function useHiddenSpecLines() {
  const { t } = useTranslation('wishlist');
  const specializationLabel = useSpecializationLabel();
  return (entry: RosterHiddenSpecWishlists) =>
    entry.hiddenSpecializations.map((spec) => {
      const line = t('roster_hidden_spec_item', {
        spec: specializationLabel(spec.name) || `#${spec.id}`,
        count: spec.itemCount,
      });
      return spec.isDeclaredOffSpec ? `${line} (${t('roster_hidden_spec_offspec')})` : line;
    });
}

/** Mention sous le nom d'un personnage affiché, détail au survol. */
export function HiddenSpecWishlistsHint({ entry }: { entry: RosterHiddenSpecWishlists }) {
  const { t } = useTranslation('wishlist');
  const lines = useHiddenSpecLines()(entry);
  const count = entry.hiddenSpecializations.reduce((sum, spec) => sum + spec.itemCount, 0);

  return (
    <Tooltip
      withArrow
      multiline
      maw={280}
      label={
        <Stack gap={2}>
          <Text size="xs">{t('roster_hidden_specs_hint')}</Text>
          {lines.map((line) => (
            <Text key={line} size="xs">
              {line}
            </Text>
          ))}
        </Stack>
      }
    >
      <Group gap={4} wrap="nowrap">
        <IconEyeOff size={12} color="var(--mantine-color-blue-4)" />
        <Text size="xs" c="blue.4">
          {t('roster_hidden_specs', { count })}
        </Text>
      </Group>
    </Tooltip>
  );
}

/** Personnages absents de la vue : rien dans la wishlist de leur spé principale. */
export function HiddenOnlyWishlistsAlert({ entries }: { entries: RosterHiddenSpecWishlists[] }) {
  const { t } = useTranslation('wishlist');
  const hiddenLines = useHiddenSpecLines();
  if (entries.length === 0) return null;

  return (
    <Alert
      variant="light"
      color="blue"
      icon={<IconEyeOff size={18} />}
      title={t('roster_hidden_only_title')}
    >
      <Text size="sm" mb={4}>
        {t('roster_hidden_only_desc')}
      </Text>
      <List size="sm">
        {entries.map((entry) => (
          <List.Item key={entry.character.id}>
            <Text span fw={600} size="sm">
              {entry.character.name}
            </Text>{' '}
            — {hiddenLines(entry).join(', ')}
          </List.Item>
        ))}
      </List>
    </Alert>
  );
}
