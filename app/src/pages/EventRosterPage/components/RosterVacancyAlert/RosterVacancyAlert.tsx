import { Alert, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconArrowsExchange } from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import { useTranslation } from 'react-i18next';
import type { RosterReplacement, RosterVacancy } from 'services/roster.service';

interface RosterVacancyAlertProps {
  vacancies: RosterVacancy[];
  bossNames: Map<number, string>;
  onReplace: (vacancy: RosterVacancy, replacement: RosterReplacement) => void;
  /** Place en cours de remplacement (`bossId:characterId`), pour bloquer les boutons. */
  pendingKey: string | null;
}

export const vacancyKey = (vacancy: Pick<RosterVacancy, 'bossId' | 'characterId'>) =>
  `${vacancy.bossId}:${vacancy.characterId}`;

const getClassColor = (className: string | null | undefined) => {
  if (!className) return undefined;
  const key = className.toLowerCase().replace(/\s+/g, '_');
  return classColors[key as keyof typeof classColors] || undefined;
};

/**
 * Places libérées par un titulaire passé en absent, avec 3 remplaçants
 * classés et un remplacement en un clic (SIMS-142).
 */
export function RosterVacancyAlert({
  vacancies,
  bossNames,
  onReplace,
  pendingKey,
}: RosterVacancyAlertProps) {
  const { t } = useTranslation('eventRoster');

  if (vacancies.length === 0) return null;

  const buffLabel = (key: string) => t(`validationSettings:raid_buffs.${key}`);

  return (
    <Alert
      color="orange"
      variant="light"
      icon={<IconAlertTriangle size={18} />}
      title={t('vacancies.title', { count: vacancies.length })}
    >
      <Stack gap="sm">
        {vacancies.map((vacancy) => {
          const key = vacancyKey(vacancy);
          return (
            <Paper key={key} withBorder p="sm" radius="md" data-testid={`vacancy-${key}`}>
              <Stack gap={6}>
                <Text size="sm">
                  {t('vacancies.vacancy', {
                    boss: bossNames.get(vacancy.bossId) ?? `#${vacancy.bossId}`,
                    name: vacancy.characterName,
                    role: t(`vacancies.roles.${vacancy.role}`),
                  })}
                </Text>
                {vacancy.lostBuffs.length > 0 && (
                  <Text size="xs" c="orange">
                    {t('vacancies.lostBuffs', {
                      buffs: vacancy.lostBuffs.map(buffLabel).join(', '),
                    })}
                  </Text>
                )}
                {vacancy.replacements.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    {t('vacancies.noReplacement')}
                  </Text>
                ) : (
                  vacancy.replacements.map((replacement, index) => (
                    <Group key={replacement.characterId} justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="wrap">
                        <Text size="sm" c="dimmed" w={18}>
                          {index + 1}.
                        </Text>
                        <Text size="sm" fw={600} c={getClassColor(replacement.class)}>
                          {replacement.name}
                        </Text>
                        {replacement.spec && (
                          <Text size="xs" c="dimmed">
                            {replacement.spec}
                          </Text>
                        )}
                        {replacement.missingSpecialization && (
                          <Badge size="xs" color="yellow" variant="light">
                            {t('vacancies.missingSpec')}
                          </Badge>
                        )}
                        {!replacement.isPrimaryRole && (
                          <Badge size="xs" color="gray" variant="outline">
                            {t('vacancies.offspec')}
                          </Badge>
                        )}
                        {replacement.coveredBuffs.map((buff) => (
                          <Badge key={buff} size="xs" color="teal" variant="light">
                            {buffLabel(buff)}
                          </Badge>
                        ))}
                        {replacement.bisCount > 0 && (
                          <Badge size="xs" color="grape" variant="light">
                            {t('vacancies.bis', { count: replacement.bisCount })}
                          </Badge>
                        )}
                      </Group>
                      <Button
                        size="compact-xs"
                        variant="light"
                        leftSection={<IconArrowsExchange size={14} />}
                        loading={pendingKey === key}
                        disabled={pendingKey !== null && pendingKey !== key}
                        onClick={() => onReplace(vacancy, replacement)}
                      >
                        {t('vacancies.replace')}
                      </Button>
                    </Group>
                  ))
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Alert>
  );
}
