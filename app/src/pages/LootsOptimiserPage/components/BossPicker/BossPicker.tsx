import { Image, Tooltip, UnstyledButton } from '@mantine/core';
import { IconLayoutGrid } from '@tabler/icons-react';
import { useRouteParams } from 'hooks/useRouteParams';
import { useTranslation } from 'react-i18next';
import type { Boss } from 'types/raid';
import { resolveIconPath } from 'utils/resolveIconPath';

import type { DroptimizerView } from '../../droptimizerView';
import classes from '../../LootsOptimiserPage.module.css';

interface BossPickerProps {
  bosses: Boss[];
  activeIndex: number;
  counts: number[] | null;
  view: DroptimizerView;
  onSelect: (index: number) => void;
}

function CountBadge({ count }: { count: number | null | undefined }) {
  if (!count) return null;
  return <span className={classes.bossCount}>{count}</span>;
}

export function BossPicker({ bosses, activeIndex, counts, view, onSelect }: BossPickerProps) {
  const { t } = useTranslation('droptimizer');
  const { extension, season } = useRouteParams();
  const total = counts ? counts.reduce((sum, n) => sum + n, 0) : null;
  const tooltip = (name: string, count: number | null | undefined) =>
    count === null || count === undefined ? name : t(`page.boss_tooltip_${view}`, { name, count });

  return (
    <nav className={classes.bossStrip} aria-label={t('page.boss_picker')}>
      <Tooltip label={tooltip(t('page.all_bosses'), total)} withArrow>
        <UnstyledButton
          className={classes.bossButton}
          data-active={activeIndex === -1 || undefined}
          aria-current={activeIndex === -1 ? 'page' : undefined}
          onClick={() => onSelect(-1)}
        >
          <span className={classes.bossVisual}>
            <span className={classes.bossAll}>
              <IconLayoutGrid size={24} stroke={1.5} />
            </span>
            <CountBadge count={total} />
          </span>
          <span className={classes.bossName}>{t('page.all_short')}</span>
        </UnstyledButton>
      </Tooltip>
      {bosses.map((boss, index) => (
        <Tooltip
          key={boss.id ?? boss.name}
          label={`${index + 1}. ${tooltip(boss.name, counts?.[index])}`}
          withArrow
        >
          <UnstyledButton
            className={classes.bossButton}
            data-active={activeIndex === index || undefined}
            aria-current={activeIndex === index ? 'page' : undefined}
            onClick={() => onSelect(index)}
          >
            <span className={classes.bossVisual}>
              {boss.icon ? (
                <Image
                  src={resolveIconPath(boss.icon, extension, season)}
                  alt=""
                  className={classes.bossPortrait}
                />
              ) : (
                <span className={classes.bossAll}>{index + 1}</span>
              )}
              <CountBadge count={counts?.[index]} />
            </span>
            <span className={classes.bossName}>{boss.name}</span>
          </UnstyledButton>
        </Tooltip>
      ))}
    </nav>
  );
}
