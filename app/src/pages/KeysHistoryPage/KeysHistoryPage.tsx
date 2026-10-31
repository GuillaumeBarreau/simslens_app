import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Card,
  Collapse,
  Container,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconCalendarStats,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconKey,
  IconTrendingUp,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'components/design-system/atoms';
import { useAuth } from 'contexts/AuthContext';
import { useUserRealm } from 'hooks/queries';
import { type CSSProperties, Fragment, useMemo, useState } from 'react';
import api from 'services/api';
import { normalizeClass } from 'utils';

import { API_VERSION } from '../../config/apiConstants';

interface KeyRun {
  id: number;
  dungeon: string;
  shortName: string | null;
  keystoneLevel: number;
  completedAt: string;
  score: number | null;
  numUpgrades: number | null;
  clearTimeMs: number | null;
  parTimeMs: number | null;
  raiderIoUrl: string | null;
  isTimed: boolean;
}

interface KeyHistoryCharacter {
  id: number;
  name: string;
  class: string | number;
  realm: string;
  thumbnail: string | null;
  specialization: { id: number; name: string; role: string } | null;
  keyCount: number;
  runs: KeyRun[];
}

interface KeyHistoryResponse {
  weeks: string[];
  weekStart: string;
  weekEnd: string;
  minLevel: number;
  characters: KeyHistoryCharacter[];
}

const PARIS_TZ = 'Europe/Paris';

function formatParisDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatParisShort(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatWeekLabel(weekStartIso: string): string {
  const start = new Date(weekStartIso);
  const end = new Date(start.getTime() + 7 * 86400000);
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    day: '2-digit',
    month: 'short',
  });
  return `${fmt.format(start)} → ${fmt.format(end)}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function CharacterRow({
  character,
  idx,
}: {
  character: KeyHistoryCharacter;
  idx: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const runs = useMemo(
    () =>
      [...character.runs].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      ),
    [character.runs],
  );
  const timed = runs.filter((r) => r.isTimed).length;
  const depleted = runs.length - timed;
  const best = runs.reduce((max, r) => (r.keystoneLevel > max ? r.keystoneLevel : max), 0);
  const className = normalizeClass(character.class);
  const rowBg = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
  const canExpand = runs.length > 0;

  return (
    <Fragment>
      <Table.Tr
        style={{
          background: rowBg,
          height: '48px',
          cursor: canExpand ? 'pointer' : 'default',
        }}
        onClick={() => canExpand && setExpanded((v) => !v)}
      >
        <Table.Td style={{ width: 'var(--first-col-width)' }}>
          <img
            src={`/src/character/class/${className}-icon.svg`}
            alt={`${character.class} icon`}
            style={{ width: '24px', height: '24px' }}
          />
        </Table.Td>

        <Table.Td style={{ width: 'var(--first-col-width)' }}>
          {character.specialization?.name && (
            <Tooltip label={character.specialization.name}>
              <img
                src={`/src/character/spec/${character.specialization.name
                  .toLowerCase()
                  .replace(/ /g, '_')}_${character.class}.webp`}
                alt=""
                style={{ width: '24px', height: '24px' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </Tooltip>
          )}
        </Table.Td>

        <Table.Td style={{ width: 'var(--wide-col-width)' }}>
          <Group gap={6} wrap="nowrap">
            <Text fw={600} className={`class-${character.class}`} size="xs">
              {character.name}
            </Text>
            <Text size="xs" c="dimmed">
              {character.realm}
            </Text>
          </Group>
        </Table.Td>

        <Table.Td>
          <Badge
            color={character.keyCount >= 8 ? 'teal.8' : character.keyCount >= 4 ? 'brand' : 'gray.7'}
            variant="light"
            radius="sm"
            size="lg"
          >
            {character.keyCount}
          </Badge>
        </Table.Td>

        <Table.Td>
          <Group gap={6} wrap="nowrap">
            <Tooltip label="Timed">
              <Badge
                color="teal.7"
                variant="light"
                size="sm"
                leftSection={<IconCheck size={10} />}
              >
                {timed}
              </Badge>
            </Tooltip>
            <Tooltip label="Dépletted">
              <Badge color="red.6" variant="light" size="sm" leftSection={<IconX size={10} />}>
                {depleted}
              </Badge>
            </Tooltip>
          </Group>
        </Table.Td>

        <Table.Td>
          {best > 0 ? (
            <Badge color="violet" variant="light" size="md" radius="sm">
              +{best}
            </Badge>
          ) : (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
        </Table.Td>

        <Table.Td style={{ width: 40, textAlign: 'center' }}>
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            disabled={!canExpand}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </ActionIcon>
        </Table.Td>
      </Table.Tr>
      {canExpand && (
        <Table.Tr style={{ background: 'transparent' }}>
          <Table.Td colSpan={7} p={0} style={{ border: 'none' }}>
            <Collapse in={expanded}>
              <Box px="md" py="sm" bg="app.8">
                <Table withRowBorders={false}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>
                        <Text variant="section-label">Donjon</Text>
                      </Table.Th>
                      <Table.Th>
                        <Text variant="section-label">Niveau</Text>
                      </Table.Th>
                      <Table.Th>
                        <Text variant="section-label">Statut</Text>
                      </Table.Th>
                      <Table.Th>
                        <Text variant="section-label">Temps</Text>
                      </Table.Th>
                      <Table.Th>
                        <Text variant="section-label">Score</Text>
                      </Table.Th>
                      <Table.Th>
                        <Text variant="section-label">Date</Text>
                      </Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {runs.map((r) => (
                      <Table.Tr key={r.id}>
                        <Table.Td>
                          <Text size="xs" fw={500}>
                            {r.shortName ?? r.dungeon}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="violet" variant="light" size="sm" radius="sm">
                            +{r.keystoneLevel}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {r.isTimed ? (
                            <Badge
                              color="teal.7"
                              variant="light"
                              size="sm"
                              leftSection={<IconCheck size={10} />}
                            >
                              {r.numUpgrades ? `+${r.numUpgrades}` : 'timed'}
                            </Badge>
                          ) : (
                            <Badge
                              color="red.6"
                              variant="light"
                              size="sm"
                              leftSection={<IconX size={10} />}
                            >
                              dépletted
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {r.clearTimeMs ? (
                            <Text size="xs" c={r.isTimed ? 'teal.5' : 'red.5'}>
                              {formatDuration(r.clearTimeMs)}
                              {r.parTimeMs ? ` / ${formatDuration(r.parTimeMs)}` : ''}
                            </Text>
                          ) : (
                            <Text size="xs" c="dimmed">
                              —
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {r.score ? r.score.toFixed(1) : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {formatParisShort(r.completedAt)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {r.raiderIoUrl ? (
                            <Anchor
                              href={r.raiderIoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              c="dimmed"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconExternalLink size={14} />
                            </Anchor>
                          ) : null}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            </Collapse>
          </Table.Td>
        </Table.Tr>
      )}
    </Fragment>
  );
}

export default function KeysHistoryPage() {
  const { user } = useAuth();
  const { data: currentRealm } = useUserRealm(user?.id ? String(user.id) : null);
  const realmId = currentRealm?.id;
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['character', 'keys', 'history', realmId, selectedWeek],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('realmId', String(realmId));
      if (selectedWeek) params.set('weekStart', selectedWeek);
      const res = await api.get<KeyHistoryResponse>(
        `${API_VERSION}/character/keys/history?${params.toString()}`,
      );
      return res.data;
    },
    enabled: !!realmId,
    staleTime: 60_000,
  });

  const weekOptions = useMemo(() => {
    if (!data?.weeks) return [];
    return [...data.weeks].reverse().map((iso) => ({
      value: iso,
      label: formatWeekLabel(iso),
    }));
  }, [data?.weeks]);

  const characters = useMemo(
    () =>
      data?.characters
        ? [...data.characters].sort(
            (a, b) => b.keyCount - a.keyCount || a.name.localeCompare(b.name),
          )
        : [],
    [data?.characters],
  );

  const totals = useMemo(() => {
    let keys = 0;
    let timed = 0;
    let depleted = 0;
    let best = 0;
    let active = 0;
    for (const c of characters) {
      if (c.keyCount > 0) active += 1;
      for (const r of c.runs) {
        keys += 1;
        if (r.isTimed) timed += 1;
        else depleted += 1;
        if (r.keystoneLevel > best) best = r.keystoneLevel;
      }
    }
    return { keys, timed, depleted, best, active };
  }, [characters]);

  if (error) {
    return (
      <Container mt="xl" mb="xl" size="xl">
        <Alert color="red" title="Erreur">
          {(error as Error).message ?? 'Erreur de chargement'}
        </Alert>
      </Container>
    );
  }

  const currentValue = selectedWeek ?? data?.weekStart ?? null;

  return (
    <Container mt="xl" mb="xl" size="xl">
      <Stack gap="lg">
        <Stack gap="xs">
          <Group gap="md">
            <ThemeIcon
              size="xl"
              variant="gradient"
              gradient={{ from: 'violet', to: 'blue' }}
              radius="md"
            >
              <IconCalendarStats size={28} />
            </ThemeIcon>
            <div>
              <Text variant="section-label" fw={600}>
                Mythic+
              </Text>
              <Title order={2}>Historique des keys</Title>
            </div>
          </Group>

          <Group justify="space-between" align="end" w="100%">
            <Text size="sm" c="dimmed">
              Runs complétés (timed ou dépletés, niveau ≥ {data?.minLevel ?? 10}), de mercredi
              05:00 à mercredi 05:00 (Paris). Synchronisé toutes les heures depuis Raider.IO.
            </Text>
            <Select
              placeholder="Sélectionner une semaine"
              data={weekOptions}
              value={currentValue}
              onChange={(v) => setSelectedWeek(v)}
              searchable
              w={260}
              disabled={weekOptions.length === 0}
            />
          </Group>
        </Stack>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Card
            padding="md"
            radius="md"
            withBorder
            style={{
              borderLeft: '4px solid var(--mantine-color-violet-5)',
              backgroundColor: 'var(--mantine-color-app-7)',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text variant="section-label">Total keys</Text>
                <Text variant="stat-value">{totals.keys}</Text>
              </div>
              <ThemeIcon size="lg" variant="light" color="violet" radius="md">
                <IconKey size={20} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            padding="md"
            radius="md"
            withBorder
            style={{
              borderLeft: '4px solid var(--mantine-color-teal-5)',
              backgroundColor: 'var(--mantine-color-app-7)',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text variant="section-label">Timed</Text>
                <Text variant="stat-value">{totals.timed}</Text>
              </div>
              <ThemeIcon size="lg" variant="light" color="teal" radius="md">
                <IconCheck size={20} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            padding="md"
            radius="md"
            withBorder
            style={{
              borderLeft: '4px solid var(--mantine-color-red-5)',
              backgroundColor: 'var(--mantine-color-app-7)',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text variant="section-label">Dépletted</Text>
                <Text variant="stat-value">{totals.depleted}</Text>
              </div>
              <ThemeIcon size="lg" variant="light" color="red" radius="md">
                <IconX size={20} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            padding="md"
            radius="md"
            withBorder
            style={{
              borderLeft: '4px solid var(--mantine-color-brand-5)',
              backgroundColor: 'var(--mantine-color-app-7)',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text variant="section-label">Joueurs actifs</Text>
                <Text variant="stat-value">
                  {totals.active}
                  {totals.best > 0 && (
                    <Text span size="xs" c="dimmed" ml={8}>
                      best +{totals.best}
                    </Text>
                  )}
                </Text>
              </div>
              <ThemeIcon size="lg" variant="light" color="brand" radius="md">
                <IconUsers size={20} />
              </ThemeIcon>
            </Group>
          </Card>
        </SimpleGrid>

        {data && (
          <Group justify="space-between">
            <Group gap="xs" c="dimmed">
              <IconTrendingUp size={14} />
              <Text size="xs" c="dimmed">
                Semaine du {formatParisDate(data.weekStart)} au {formatParisDate(data.weekEnd)}
              </Text>
            </Group>
          </Group>
        )}

        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : characters.length === 0 ? (
          <Card padding="xl" radius="md" withBorder>
            <Stack align="center" gap="xs" py="xl">
              <ThemeIcon size="xl" variant="light" color="gray" radius="md">
                <IconKey size={24} />
              </ThemeIcon>
              <Text c="dimmed">Aucune key sur cette semaine.</Text>
            </Stack>
          </Card>
        ) : (
          <Table
            striped
            withRowBorders={false}
            bg="app.8"
            style={
              {
                tableLayout: 'fixed',
                '--first-col-width': '60px',
                '--wide-col-width': '240px',
              } as CSSProperties
            }
          >
            <Table.Thead bg="app.8">
              <Table.Tr>
                <Table.Th style={{ width: 'var(--first-col-width)' }} />
                <Table.Th style={{ width: 'var(--first-col-width)' }}>
                  <Text variant="section-label">Spé</Text>
                </Table.Th>
                <Table.Th style={{ width: 'var(--wide-col-width)' }}>
                  <Text variant="section-label">Joueur</Text>
                </Table.Th>
                <Table.Th>
                  <Text variant="section-label">Keys</Text>
                </Table.Th>
                <Table.Th>
                  <Text variant="section-label">Timed / Dépletted</Text>
                </Table.Th>
                <Table.Th>
                  <Text variant="section-label">Meilleur</Text>
                </Table.Th>
                <Table.Th style={{ width: 40 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody c="app.1">
              {characters.map((c, idx) => (
                <CharacterRow key={c.id} character={c} idx={idx} />
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Container>
  );
}
