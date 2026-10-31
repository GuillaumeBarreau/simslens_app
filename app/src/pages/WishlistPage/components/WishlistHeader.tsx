import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Menu,
  Modal,
  Progress,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconChartDots3,
  IconCopy,
  IconLock,
} from '@tabler/icons-react';
import { useSpecializationLabel } from 'hooks/useSpecializationLabel';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CharacterSpecOption } from 'types/character.types';
import { getThumbnailUrl, normalizeClass } from 'utils';

import classes from '../WishlistPage.module.css';

interface WishlistHeaderProps {
  character?: { name?: string; class?: string; thumbnail?: string | null; region?: string | null };
  readOnly: boolean;
  /** Retour à sa propre wishlist quand on consulte celle d'un autre personnage. */
  onBackToMine?: () => void;
  specs?: CharacterSpecOption[];
  activeSpecId: number | null;
  onSpecChange: (specId: string) => void;
  progress: { filled: number; total: number; percent: number };
  /** Vœux à revoir (SIMS-205, sous `wishlist-insights`) ; absent : non affiché. */
  obsoleteCount?: number;
  /** Prochain emplacement vide, pour reprendre le parcours en un clic. */
  nextEmptySlotLabel?: string;
  onContinue?: () => void;
  onOpenTalents?: () => void;
  /** Copie depuis une autre spé du même personnage ; absent en lecture seule. */
  onCopyFromSpec?: (sourceSpecId: number) => Promise<unknown>;
  isCopying?: boolean;
}

/**
 * En-tête de la wishlist (SIMS-250) : personnage, spé (sélecteur visible),
 * progression, vœux à revoir et actions (reprendre, copier, talents).
 */
export function WishlistHeader({
  character,
  readOnly,
  onBackToMine,
  specs,
  activeSpecId,
  onSpecChange,
  progress,
  obsoleteCount,
  nextEmptySlotLabel,
  onContinue,
  onOpenTalents,
  onCopyFromSpec,
  isCopying = false,
}: WishlistHeaderProps) {
  const { t } = useTranslation('wishlist');
  const specializationLabel = useSpecializationLabel();
  const [copySource, setCopySource] = useState<CharacterSpecOption | null>(null);

  const characterClass = normalizeClass(character?.class || '');
  const classIcon = characterClass ? `/src/character/class/${characterClass}-icon.svg` : undefined;
  const avatarUrl = getThumbnailUrl({
    thumbnail: character?.thumbnail ?? undefined,
    region: character?.region ?? undefined,
  });
  const activeSpec = specs?.find((s) => s.id === activeSpecId);
  const otherSpecs = (specs ?? []).filter((s) => s.id !== activeSpecId);
  const specOptions = (specs ?? []).map((s) => ({
    value: String(s.id),
    label: s.isPrimary ? `${specializationLabel(s.name)} ★` : specializationLabel(s.name),
  }));
  const complete = progress.total > 0 && progress.filled >= progress.total;

  const confirmCopy = async () => {
    if (!copySource || !onCopyFromSpec) return;
    try {
      await onCopyFromSpec(copySource.id);
    } finally {
      setCopySource(null);
    }
  };

  return (
    <Box className={classes.header} p={{ base: 'md', sm: 'lg' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
          <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar src={avatarUrl} alt={character?.name} size={64} radius="md" bg="dark.8">
              {classIcon && <Image src={classIcon} w="70%" h="70%" alt="" />}
            </Avatar>
            <Stack gap={4} style={{ minWidth: 0 }}>
              <Group gap={8} wrap="nowrap">
                <Text
                  size="xs"
                  c="dimmed"
                  tt="uppercase"
                  fw={700}
                  style={{ letterSpacing: '0.12em' }}
                >
                  {t('header.subtitle')}
                </Text>
                {readOnly && (
                  <Badge
                    size="xs"
                    variant="default"
                    leftSection={<IconLock size={10} />}
                    style={{ textTransform: 'none' }}
                  >
                    {t('page.read_only_badge')}
                  </Badge>
                )}
              </Group>
              <Title
                order={1}
                fz={{ base: 24, sm: 30 }}
                lh={1.1}
                lineClamp={1}
                style={{ color: 'var(--accent)' }}
              >
                {character?.name || '—'}
              </Title>
              <Text size="sm" c="dimmed">
                {readOnly
                  ? t('read_only_alert', { name: character?.name || '—' })
                  : t('subtitle_edit')}
              </Text>
            </Stack>
          </Group>

          <Group gap="xs" wrap="wrap">
            {onBackToMine && (
              <Button
                variant="default"
                leftSection={<IconArrowLeft size={16} />}
                onClick={onBackToMine}
              >
                {t('page.back_to_mine')}
              </Button>
            )}
            {onCopyFromSpec && otherSpecs.length > 0 && (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Button
                    variant="default"
                    leftSection={<IconCopy size={16} />}
                    loading={isCopying}
                  >
                    {t('page.copy_btn')}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{t('page.copy_menu_title')}</Menu.Label>
                  {otherSpecs.map((spec) => (
                    <Menu.Item key={spec.id} onClick={() => setCopySource(spec)}>
                      {specializationLabel(spec.name)}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}
            {onOpenTalents && (
              <Button
                variant="default"
                leftSection={<IconChartDots3 size={16} />}
                onClick={onOpenTalents}
              >
                {t('talents.open_btn')}
              </Button>
            )}
          </Group>
        </Group>

        <Group gap="xl" align="flex-end" wrap="wrap">
          {specs && specs.length > 0 && activeSpecId != null && (
            <Stack gap={6} style={{ minWidth: 0 }}>
              <Text size="xs" c="dimmed" fw={600}>
                {t('page.spec_label')}
              </Text>
              {specs.length > 1 ? (
                <>
                  <Box visibleFrom="sm">
                    <SegmentedControl
                      size="sm"
                      value={String(activeSpecId)}
                      onChange={onSpecChange}
                      data={specOptions}
                    />
                  </Box>
                  <Box hiddenFrom="sm">
                    <Select
                      size="sm"
                      allowDeselect={false}
                      aria-label={t('page.spec_label')}
                      value={String(activeSpecId)}
                      onChange={(value) => value && onSpecChange(value)}
                      data={specOptions}
                    />
                  </Box>
                </>
              ) : (
                <Text fw={600}>{specializationLabel(activeSpec?.name)}</Text>
              )}
            </Stack>
          )}

          <Stack gap={6} style={{ flex: '1 1 260px', minWidth: 220 }}>
            <Group justify="space-between" align="baseline" gap="xs">
              <Text size="xs" c="dimmed" fw={600}>
                {t('page.progress_label')}
              </Text>
              <Group gap={8} align="baseline" wrap="nowrap">
                <span className={classes.progressValue}>
                  {t('page.progress_value', { filled: progress.filled, total: progress.total })}
                </span>
              </Group>
            </Group>
            <Progress
              value={progress.percent}
              size="md"
              radius="xl"
              color={complete ? 'teal' : 'brand'}
              aria-label={t('page.progress_label')}
            />
            <Group gap="xs" justify="space-between" wrap="wrap">
              <Text size="xs" c={complete ? 'teal' : 'dimmed'}>
                {complete
                  ? t('page.progress_complete')
                  : t('page.progress_left', { count: progress.total - progress.filled })}
              </Text>
              {!!obsoleteCount && (
                <Tooltip label={t('page.obsolete_hint')} withArrow multiline maw={280}>
                  <Badge
                    size="sm"
                    variant="light"
                    color="orange"
                    leftSection={<IconAlertTriangle size={12} />}
                    style={{ textTransform: 'none', cursor: 'help' }}
                  >
                    {t('page.obsolete_count', { count: obsoleteCount })}
                  </Badge>
                </Tooltip>
              )}
            </Group>
          </Stack>

          {onContinue && nextEmptySlotLabel && (
            <Button rightSection={<IconArrowRight size={16} />} onClick={onContinue}>
              {t('page.continue_btn', { slot: nextEmptySlotLabel })}
            </Button>
          )}
        </Group>
      </Stack>

      <Modal
        opened={!!copySource}
        onClose={() => setCopySource(null)}
        title={t('page.copy_confirm_title')}
        centered
      >
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconAlertTriangle
              color="var(--mantine-color-yellow-6)"
              size={22}
              style={{ flexShrink: 0 }}
            />
            <Text size="sm">
              {t('page.copy_confirm', {
                target: specializationLabel(activeSpec?.name),
                source: specializationLabel(copySource?.name),
              })}
            </Text>
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCopySource(null)}>
              {t('roster.cancel')}
            </Button>
            <Button loading={isCopying} onClick={confirmCopy}>
              {t('roster.confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
