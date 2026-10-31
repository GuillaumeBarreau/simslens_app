import {
  ActionIcon,
  Button,
  Group,
  Progress,
  SimpleGrid,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character } from 'types/character.types';
import { normalizeClass } from 'utils';

import classes from '../RosterPage.module.css';
import {
  COMPLETENESS_ISSUES,
  type CompletenessFilter,
  type CompletenessIssue,
  type Composition,
  type RoleFilter,
  type RoleOrUnknown,
  ROLES,
} from '../rosterView';
import { characterSubtitle, classColorClass } from './characterSubtitle';

export const ROLE_COLOR: Record<RoleOrUnknown, string> = {
  tank: 'blue.5',
  healer: 'teal.6',
  melee: 'orange.6',
  ranged: 'grape.5',
  unknown: 'dark.3',
};

const cssColor = (mantineColor: string) => {
  const [name, shade] = mantineColor.split('.');
  return `var(--mantine-color-${name}-${shade})`;
};

const PENDING_PREVIEW = 3;

interface RosterSummaryProps {
  composition: Composition;
  completeness: Record<CompletenessIssue | 'incomplete', number>;
  pending: Character[];
  canApprove: boolean;
  guildRealm?: string;
  roleFilter: RoleFilter;
  classFilter: string;
  completenessFilter: CompletenessFilter;
  onRole: (role: RoleFilter) => void;
  onClass: (className: string) => void;
  onCompleteness: (filter: CompletenessFilter) => void;
  onApprove: (character: Character) => void;
  onReject: (character: Character) => void;
  onShowPending: () => void;
}

export function RosterSummary({
  composition,
  completeness,
  pending,
  canApprove,
  guildRealm,
  roleFilter,
  classFilter,
  completenessFilter,
  onRole,
  onClass,
  onCompleteness,
  onApprove,
  onReject,
  onShowPending,
}: RosterSummaryProps) {
  const { t } = useTranslation(['roster', 'common']);
  const roles: RoleOrUnknown[] = composition.roles.unknown > 0 ? [...ROLES, 'unknown'] : [...ROLES];
  const toggle = <T extends string>(current: T, value: T, all: T) =>
    current === value ? all : value;

  return (
    <SimpleGrid cols={{ base: 1, md: pending.length > 0 ? 3 : 2 }} spacing="md">
      <section className={classes.card} aria-label={t('page.summary.composition')}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <span className={classes.cardTitle}>{t('page.summary.composition')}</span>
          <Text size="xs" c="dimmed" className={classes.num}>
            {t('page.header.members', { count: composition.total })}
          </Text>
        </Group>

        <Progress.Root size={8} radius="xl">
          {roles.map((role) =>
            composition.roles[role] > 0 ? (
              <Tooltip
                key={role}
                label={`${t(`page.roles.${role}`)} : ${composition.roles[role]}`}
                withArrow
              >
                <Progress.Section
                  value={(composition.roles[role] / Math.max(composition.total, 1)) * 100}
                  color={ROLE_COLOR[role]}
                />
              </Tooltip>
            ) : null,
          )}
        </Progress.Root>

        <div className={classes.counters}>
          {roles.map((role) => (
            <UnstyledButton
              key={role}
              className={classes.counter}
              data-active={roleFilter === role || undefined}
              data-empty={composition.roles[role] === 0 || undefined}
              aria-pressed={roleFilter === role}
              onClick={() => onRole(toggle<RoleFilter>(roleFilter, role, 'all'))}
            >
              <span
                className={classes.dot}
                style={{ '--dot-color': cssColor(ROLE_COLOR[role]) } as CSSProperties}
              />
              {t(`page.roles.${role}`)}
              <span className={classes.count}>{composition.roles[role]}</span>
            </UnstyledButton>
          ))}
        </div>

        {composition.classes.length > 0 && (
          <div className={classes.classes} aria-label={t('page.summary.classes')}>
            {composition.classes.map(({ name, count }) => (
              <Tooltip key={name} label={t(`classes.${name}`, { defaultValue: name })} withArrow>
                <UnstyledButton
                  className={classes.classChip}
                  data-active={classFilter === name || undefined}
                  aria-pressed={classFilter === name}
                  aria-label={`${t(`classes.${name}`, { defaultValue: name })} : ${count}`}
                  onClick={() => onClass(toggle(classFilter, name, 'all'))}
                >
                  <img src={`/src/character/class/${normalizeClass(name)}-icon.svg`} alt="" />
                  {count}
                </UnstyledButton>
              </Tooltip>
            ))}
          </div>
        )}
      </section>

      <section className={classes.card} aria-label={t('page.summary.completeness')}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <span className={classes.cardTitle}>{t('page.summary.completeness')}</span>
          <Text size="xs" c="dimmed" className={classes.num}>
            {completeness.incomplete > 0
              ? t('page.summary.incomplete', { count: completeness.incomplete })
              : t('page.summary.complete')}
          </Text>
        </Group>
        <Tooltip
          label={t('page.summary.complete_count', {
            count: composition.total - completeness.incomplete,
            total: composition.total,
          })}
          withArrow
        >
          <Progress
            size={8}
            radius="xl"
            color="teal.6"
            value={
              ((composition.total - completeness.incomplete) / Math.max(composition.total, 1)) * 100
            }
          />
        </Tooltip>
        <Text size="xs" c="dimmed">
          {t('page.summary.completeness_hint')}
        </Text>
        <div className={classes.counters}>
          {COMPLETENESS_ISSUES.map((issue) => (
            <UnstyledButton
              key={issue}
              className={classes.counter}
              data-active={completenessFilter === issue || undefined}
              data-empty={completeness[issue] === 0 || undefined}
              aria-pressed={completenessFilter === issue}
              onClick={() =>
                onCompleteness(toggle<CompletenessFilter>(completenessFilter, issue, 'all'))
              }
            >
              {t(`page.completeness.${issue}`)}
              <span className={classes.count}>{completeness[issue]}</span>
            </UnstyledButton>
          ))}
        </div>
      </section>

      {pending.length > 0 && (
        <section className={classes.card} aria-label={t('page.summary.pending')}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <span className={classes.cardTitle}>{t('page.summary.pending')}</span>
            <Text size="xs" c="dimmed" className={classes.num}>
              {pending.length}
            </Text>
          </Group>
          <div>
            {pending.slice(0, PENDING_PREVIEW).map((character) => (
              <div key={character.id} className={classes.pendingRow}>
                <div className={classes.icons}>
                  <img
                    src={`/src/character/class/${normalizeClass(character.class)}-icon.svg`}
                    alt=""
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600} className={classColorClass(character.class)} truncate>
                    {character.name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {characterSubtitle(character, t, guildRealm)}
                  </Text>
                </div>
                {canApprove && (
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label={t('table.approve')} withArrow>
                      <ActionIcon
                        variant="light"
                        color="teal"
                        size="md"
                        aria-label={t('table.approve')}
                        onClick={() => onApprove(character)}
                      >
                        <IconCheck size={16} stroke={1.5} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t('table.reject')} withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="md"
                        aria-label={t('table.reject')}
                        onClick={() => onReject(character)}
                      >
                        <IconX size={16} stroke={1.5} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            onClick={onShowPending}
            style={{ alignSelf: 'flex-start' }}
          >
            {t('page.summary.show_pending', { count: pending.length })}
          </Button>
        </section>
      )}
    </SimpleGrid>
  );
}
