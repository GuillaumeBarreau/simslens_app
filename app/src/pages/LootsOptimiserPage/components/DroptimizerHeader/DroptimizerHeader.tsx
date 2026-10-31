import { Box, Group, Image, Stack, Title } from '@mantine/core';
import { IconLayoutGrid } from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { DifficultySelector } from 'components/domain/roster/DifficultySelector';
import type { Difficulty } from 'contexts/DifficultyContext';
import { useRouteParams } from 'hooks/useRouteParams';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Boss } from 'types/raid';
import { resolveIconPath } from 'utils/resolveIconPath';

import type { DroptimizerView } from '../../droptimizerView';
import classes from '../../LootsOptimiserPage.module.css';

interface DroptimizerHeaderProps {
  boss: Boss | null;
  bossIndex: number;
  raidName: string | null;
  itemCount: number;
  interestingCount: number | null;
  view: DroptimizerView;
  difficulty: Difficulty;
  onDifficulty: (difficulty: Difficulty) => void;
  actions?: ReactNode;
}

export function DroptimizerHeader({
  boss,
  bossIndex,
  raidName,
  itemCount,
  interestingCount,
  view,
  difficulty,
  onDifficulty,
  actions,
}: DroptimizerHeaderProps) {
  const { t } = useTranslation('droptimizer');
  const { extension, season } = useRouteParams();

  const details = [
    boss ? t('page.boss_order', { order: bossIndex + 1 }) : t('page.all_description'),
    t('page.items', { count: itemCount }),
    interestingCount !== null ? t(`page.interesting_${view}`, { count: interestingCount }) : null,
  ].filter(Boolean);

  return (
    <Box className={classes.panel} p="lg">
      <Group justify="space-between" align="center" gap="md">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          {boss?.icon ? (
            <Image
              src={resolveIconPath(boss.icon, extension, season)}
              alt=""
              className={classes.bossThumb}
            />
          ) : (
            <span className={`${classes.bossThumb} ${classes.bossThumbIcon}`}>
              <IconLayoutGrid size={26} stroke={1.5} />
            </span>
          )}
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text variant="section-label">
              {[t('page.label'), raidName].filter(Boolean).join(' · ')}
            </Text>
            <Title order={2} lineClamp={1}>
              {boss ? boss.name : t('page.all_bosses')}
            </Title>
            <Text size="sm" c="dimmed" className={classes.num}>
              {details.join(' · ')}
            </Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <DifficultySelector difficulty={difficulty} setDifficulty={onDifficulty} />
          {actions}
        </Group>
      </Group>
    </Box>
  );
}
