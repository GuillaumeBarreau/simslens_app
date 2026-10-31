import { Button, Group, Stack, ThemeIcon } from '@mantine/core';
import {
  IconAlertTriangle,
  IconFilterOff,
  IconHeart,
  IconMoodEmpty,
  IconReportAnalytics,
  IconSearch,
} from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import type { Difficulty } from 'contexts/DifficultyContext';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { DroptimizerView, EmptyReason } from '../../droptimizerView';
import classes from '../../LootsOptimiserPage.module.css';

const DIFFICULTIES: Difficulty[] = ['mythic', 'heroic', 'normal'];

interface DroptimizerEmptyStateProps {
  reason: EmptyReason | 'error';
  view: DroptimizerView;
  difficulty: Difficulty;
  bossName: string | null;
  roleLabel: string;
  search: string;
  trackingPath: string;
  wishlistPath: string;
  onDifficulty: (difficulty: Difficulty) => void;
  onAllBosses: () => void;
  onResetRole: () => void;
  onClearSearch: () => void;
  onRetry: () => void;
}

export function DroptimizerEmptyState({
  reason,
  view,
  difficulty,
  bossName,
  roleLabel,
  search,
  trackingPath,
  wishlistPath,
  onDifficulty,
  onAllBosses,
  onResetRole,
  onClearSearch,
  onRetry,
}: DroptimizerEmptyStateProps) {
  const { t } = useTranslation(['droptimizer', 'common']);
  const difficultyLabel = (d: Difficulty) => t(`common:difficulties.${d}`);
  const otherDifficulties = DIFFICULTIES.filter((d) => d !== difficulty).map((d) => (
    <Button key={d} variant="default" onClick={() => onDifficulty(d)}>
      {t('empty.other_difficulty', { difficulty: difficultyLabel(d) })}
    </Button>
  ));
  const params = {
    difficulty: difficultyLabel(difficulty),
    boss: bossName ?? t('empty.boss_empty_selection'),
    role: roleLabel,
    query: search,
  };

  let icon: ReactNode = <IconMoodEmpty size={28} stroke={1.5} />;
  let title = '';
  let text = '';
  let actions: ReactNode = null;

  switch (reason) {
    case 'no_loot':
      title = t('empty.no_loot_title');
      text = t('empty.no_loot_text');
      break;
    case 'no_match':
      icon = <IconSearch size={28} stroke={1.5} />;
      title = t('empty.no_match_title');
      text = t('empty.no_match_text', params);
      actions = (
        <Button variant="default" onClick={onClearSearch}>
          {t('empty.no_match_action')}
        </Button>
      );
      break;
    case 'no_sims':
      icon = <IconReportAnalytics size={28} stroke={1.5} />;
      title = t('empty.no_sims_title', params);
      text = t('empty.no_sims_text');
      actions = (
        <>
          <Button component={Link} to={trackingPath} color="brand.5">
            {t('empty.no_sims_action')}
          </Button>
          {otherDifficulties}
        </>
      );
      break;
    case 'no_wishes':
      icon = <IconHeart size={28} stroke={1.5} />;
      title = t('empty.no_wishes_title', params);
      text = t('empty.no_wishes_text');
      actions = (
        <>
          <Button component={Link} to={wishlistPath} color="brand.5">
            {t('empty.no_wishes_action')}
          </Button>
          {otherDifficulties}
        </>
      );
      break;
    case 'boss_empty':
      title = t(`empty.boss_empty_${view}_title`);
      text = t(`empty.boss_empty_${view}_text`, params);
      actions = bossName ? (
        <Button variant="default" onClick={onAllBosses}>
          {t('empty.all_bosses_action')}
        </Button>
      ) : null;
      break;
    case 'role_filtered':
      icon = <IconFilterOff size={28} stroke={1.5} />;
      title = t('empty.role_filtered_title');
      text = t('empty.role_filtered_text', params);
      actions = (
        <Button variant="default" onClick={onResetRole}>
          {t('empty.role_filtered_action')}
        </Button>
      );
      break;
    case 'error':
      icon = <IconAlertTriangle size={28} stroke={1.5} />;
      title = t('empty.error_title');
      actions = (
        <Button variant="default" onClick={onRetry}>
          {t('empty.error_action')}
        </Button>
      );
      break;
  }

  return (
    <Stack align="center" gap="xs" py={48} px="md" ta="center" className={classes.list}>
      <ThemeIcon size={56} radius="xl" variant="default" color="gray">
        {icon}
      </ThemeIcon>
      <Text fw={600} size="lg">
        {title}
      </Text>
      {text && (
        <Text size="sm" c="dimmed" maw={460}>
          {text}
        </Text>
      )}
      {actions && (
        <Group gap="xs" justify="center" mt="xs">
          {actions}
        </Group>
      )}
    </Stack>
  );
}
