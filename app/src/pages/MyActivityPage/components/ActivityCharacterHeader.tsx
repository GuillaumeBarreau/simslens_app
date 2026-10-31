import { Avatar, Box, Button, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconHeart, IconMapPin, IconSettings, IconShield, IconSword } from '@tabler/icons-react';
import { DroptimizerUpdateButton, SimFreshness } from 'components/domain/droptimizer';
import { isFeatureEnabled } from 'config/featureFlags';
import { useSpecializationLabel } from 'hooks/useSpecializationLabel';
import { useTranslation } from 'react-i18next';
import type { Character } from 'types/character.types';
import { normalizeClass } from 'utils';

import { characterRenderUrl, type SimTodo } from '../activitySummary';
import classes from '../MyActivityPage.module.css';

interface ActivityCharacterHeaderProps {
  character: Character | undefined;
  sim: SimTodo;
  staleAfterDays: number;
  /** Absent : le bouton « Ma wishlist » est masqué (invités). */
  onOpenWishlist?: () => void;
  /** Absent : aucun réglage n'est disponible. */
  onOpenSettings?: () => void;
}

function capitalize(value: string | null | undefined): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * En-tête de « Mon activité » (SIMS-239) : identité du personnage aux couleurs
 * de sa classe, fraîcheur du sim et actions rapides.
 */
export function ActivityCharacterHeader({
  character,
  sim,
  staleAfterDays,
  onOpenWishlist,
  onOpenSettings,
}: ActivityCharacterHeaderProps) {
  const { t } = useTranslation('myActivity');
  const specializationLabel = useSpecializationLabel();
  const characterClass = normalizeClass(character?.class || '');
  const classIcon = characterClass ? `/src/character/class/${characterClass}-icon.svg` : null;
  const avatarUrl = characterRenderUrl(character?.thumbnail, character?.region);
  const renderUrl = characterRenderUrl(character?.thumbnail, character?.region, 'main-raw');
  const specName = specializationLabel(character?.specialization?.name ?? character?.spec);
  const showSimDate = isFeatureEnabled('sim-freshness') && sim.freshness !== 'unknown';

  return (
    <Box className={classes.hero} p={{ base: 'md', sm: 'xl' }}>
      {renderUrl && (
        <Box visibleFrom="md">
          <img className={classes.heroRender} src={renderUrl} alt="" aria-hidden="true" />
        </Box>
      )}

      <Group
        justify="space-between"
        align="center"
        gap="lg"
        wrap="wrap"
        style={{ position: 'relative' }}
      >
        <Group gap="lg" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box className={classes.avatarRing}>
            <Avatar src={avatarUrl} alt={character?.name} size={84} radius={999} bg="dark.8">
              {classIcon && <Image src={classIcon} w="60%" h="60%" alt="" />}
            </Avatar>
            {classIcon && avatarUrl && (
              <img className={classes.classBadge} src={classIcon} alt={character?.class} />
            )}
          </Box>

          <Stack gap={6} style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.12em' }}>
              {t('subtitle')}
            </Text>
            <Title
              order={1}
              fz={{ base: 26, sm: 34 }}
              lh={1.05}
              lineClamp={1}
              style={{ color: 'var(--accent)', wordBreak: 'break-all' }}
            >
              {character?.name || '—'}
            </Title>
            <Group gap={6} wrap="wrap">
              {specName && (
                <span className={classes.metaChip}>
                  <IconSword size={12} />
                  {specName}
                </span>
              )}
              {!!character?.ilvl && (
                <span className={classes.metaChip}>
                  <IconShield size={12} />
                  {t('header.ilvl', { ilvl: character.ilvl })}
                </span>
              )}
              {(character?.realm || character?.guildName) && (
                <span className={classes.metaChip}>
                  <IconMapPin size={12} />
                  {[
                    capitalize(character?.realm),
                    character?.guildName && `<${character.guildName}>`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </Group>
          </Stack>
        </Group>

        <Stack gap="xs" align="flex-start" style={{ maxWidth: '100%' }}>
          {showSimDate && (
            <Group gap={6} wrap="nowrap">
              <Text size="xs" c="dimmed">
                {t('header.last_sim')}
              </Text>
              <SimFreshness timestamp={sim.timestamp} staleAfterDays={staleAfterDays} />
            </Group>
          )}
          <Group gap="xs" wrap="wrap">
            {character && (
              <DroptimizerUpdateButton
                variant="full"
                characterName={character.name}
                mythicReport={character.reportsByDifficulty?.mythic}
                staleAfterDays={staleAfterDays}
              />
            )}
            {onOpenWishlist && (
              <Button
                variant="default"
                leftSection={<IconHeart size={16} />}
                onClick={onOpenWishlist}
              >
                {t('header.open_wishlist')}
              </Button>
            )}
            {onOpenSettings && (
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconSettings size={16} />}
                onClick={onOpenSettings}
              >
                {t('header.settings')}
              </Button>
            )}
          </Group>
        </Stack>
      </Group>
    </Box>
  );
}
