import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Group,
  Loader,
  ScrollArea,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconSearch, IconUsersGroup } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchGuildRoster, importGuildMembers } from 'services/api';

import { Drawer } from '../../../design-system/organisms/Drawer';

interface GuildMember {
  name: string;
  realm: string;
  classId: number;
  level: number;
  rank: number;
}

interface GuildImportDrawerProps {
  opened: boolean;
  onClose: () => void;
  realm: string;
  guild: string;
  region?: string;
  realmId?: number;
  initialData?: GuildMember[];
  onImportSuccess?: () => void;
}

const CLASS_COLORS: Record<number, string> = {
  1: '#C79C6E', // Warrior
  2: '#F58CBA', // Paladin
  3: '#ABD473', // Hunter
  4: '#FFF569', // Rogue
  5: '#FFFFFF', // Priest
  6: '#C41F3B', // DK
  7: '#0070DE', // Shaman
  8: '#40C7EB', // Mage
  9: '#8787ED', // Warlock
  10: '#00FF96', // Monk
  11: '#FF7D0A', // Druid
  12: '#A330C9', // DH
  13: '#33937F', // Evoker
};

const CLASS_SLUGS: Record<number, string> = {
  1: 'warrior',
  2: 'paladin',
  3: 'hunter',
  4: 'rogue',
  5: 'priest',
  6: 'death_knight',
  7: 'shaman',
  8: 'mage',
  9: 'warlock',
  10: 'monk',
  11: 'druid',
  12: 'demon_hunter',
  13: 'evoker',
};

export function GuildImportDrawer({
  opened,
  onClose,
  realm,
  guild,
  region = 'eu',
  realmId,
  initialData,
  onImportSuccess,
}: GuildImportDrawerProps) {
  const { t } = useTranslation('sync');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedItems, setOpenedItems] = useState<string[]>([]);

  const [dataState, dispatchData] = useReducer(
    (state: { roster: GuildMember[]; selection: string[]; searchQuery: string }, action: any) => {
      if (action.type === 'init')
        return { ...state, searchQuery: '', roster: action.roster, selection: [] };
      if (action.type === 'clearSearch') return { ...state, searchQuery: '' };
      if (action.type === 'setRosterAndSelection')
        return { ...state, roster: action.roster, selection: action.selection };
      if (action.type === 'setSearchQuery') return { ...state, searchQuery: action.payload };
      if (action.type === 'setSelection')
        return {
          ...state,
          selection:
            typeof action.payload === 'function' ? action.payload(state.selection) : action.payload,
        };
      return state;
    },
    { roster: [], selection: [], searchQuery: '' },
  );

  const { roster, selection, searchQuery } = dataState;

  const groupedRoster = useMemo(() => {
    const groups: Record<number, GuildMember[]> = {};
    roster.forEach((m: GuildMember) => {
      if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }
      if (!groups[m.rank]) groups[m.rank] = [];
      groups[m.rank].push(m);
    });
    return groups;
  }, [roster, searchQuery]);

  const sortedRanks = useMemo(() => {
    return Object.keys(groupedRoster)
      .map(Number)
      .sort((a, b) => a - b);
  }, [groupedRoster]);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGuildRoster(realm, guild, region, realmId);
      const sorted = data.sort(
        (a: GuildMember, b: GuildMember) => a.rank - b.rank || a.name.localeCompare(b.name),
      );
      dispatchData({ type: 'setRosterAndSelection', roster: sorted, selection: [] });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch roster');
    } finally {
      setLoading(false);
    }
  }, [realm, guild, region, realmId]);

  useEffect(() => {
    let isMounted = true;

    if (opened) {
      if (initialData && initialData.length > 0) {
        const sorted = [...initialData].sort(
          (a, b) => a.rank - b.rank || a.name.localeCompare(b.name),
        );
        if (isMounted) {
          dispatchData({ type: 'init', roster: sorted });
        }
      } else {
        if (isMounted) {
          dispatchData({ type: 'clearSearch' });
        }
        if (realm && guild) {
          loadRoster();
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [opened, realm, guild, initialData, loadRoster]);

  useEffect(() => {
    let isMounted = true;

    if (sortedRanks.length > 0 && isMounted) {
      setOpenedItems(sortedRanks.map(String));
    }

    return () => {
      isMounted = false;
    };
  }, [sortedRanks]);

  const getMemberId = (member: GuildMember) => `${member.name}-${member.realm}`;

  const toggleMember = (member: GuildMember) => {
    const id = getMemberId(member);
    dispatchData({
      type: 'setSelection',
      payload: (current: string[]) =>
        current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    });
  };

  const toggleRank = (_rank: number, members: GuildMember[]) => {
    const memberIds = members.map(getMemberId);
    const allSelected = memberIds.every((id) => selection.includes(id));

    if (allSelected) {
      dispatchData({
        type: 'setSelection',
        payload: (current: string[]) => current.filter((id) => !memberIds.includes(id)),
      });
    } else {
      dispatchData({
        type: 'setSelection',
        payload: (current: string[]) => {
          const newSet = new Set(current);
          memberIds.forEach((id) => newSet.add(id));
          return Array.from(newSet);
        },
      });
    }
  };

  const isRankSelected = (members: GuildMember[]) => {
    return members.every((m) => selection.includes(getMemberId(m)));
  };

  const isRankIndeterminate = (members: GuildMember[]) => {
    const selectedCount = members.filter((m) => selection.includes(getMemberId(m))).length;
    return selectedCount > 0 && selectedCount < members.length;
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const selectedMembers = roster.filter((m: GuildMember) => selection.includes(getMemberId(m)));
      const res = await importGuildMembers(selectedMembers, region, realmId);
      notifications.show({
        title: t('import.notifications.complete_title'),
        message: t('import.notifications.complete_message', {
          imported: res.imported,
          skipped: res.details.length - res.imported - res.failed,
          failed: res.failed,
        }),
        color: res.failed > 0 ? 'yellow' : 'green',
        icon: <IconCheck size={16} />,
      });
      onImportSuccess?.();
      onClose();
    } catch (err: unknown) {
      notifications.show({
        title: t('import.notifications.failed_title'),
        message: (err as Error).message,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setImporting(false);
    }
  };

  const currentSelectionCount = selection.length;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Flex align="center" gap="sm">
          <IconUsersGroup size={24} color="var(--mantine-color-grape-4)" />
          <Box>
            <Text fw={700} size="lg" c="app.0">
              {t('import.title')}
            </Text>
            <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
              {guild}
            </Text>
          </Box>
        </Flex>
      }
      position="right"
      size="lg"
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      styles={{
        content: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--mantine-color-app-7)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-app-7)',
          borderBottom: '1px solid var(--mantine-color-app-7)',
        },
        body: { flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
      }}
    >
      {error && (
        <Alert color="red" title="Error" m="md" icon={<IconAlertCircle size={16} />}>
          {error}
          <Button variant="white" color="red" size="xs" ml="md" onClick={loadRoster}>
            {t('import.retry')}
          </Button>
        </Alert>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader color="grape" type="dots" />
        </div>
      ) : (
        <Flex direction="column" style={{ height: '100%', overflow: 'hidden' }}>
          <Box p="md" bg="app.7">
            <TextInput
              placeholder="Filter by name..."
              value={searchQuery}
              onChange={(e) =>
                dispatchData({ type: 'setSearchQuery', payload: e.currentTarget.value })
              }
              leftSection={<IconSearch size={16} />}
              mb="sm"
            />

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {currentSelectionCount} selected
                {searchQuery && ` (filtered from ${roster.length})`}
              </Text>
              <Group gap="xs">
                <Button
                  variant="light"
                  color="gray"
                  size="xs"
                  onClick={() => {
                    const visibleIds = Object.values(groupedRoster).flat().map(getMemberId);
                    dispatchData({ type: 'setSelection', payload: visibleIds });
                  }}
                  styles={{
                    root: {
                      backgroundColor: 'var(--mantine-color-app-7)',
                      color: 'var(--mantine-color-app-1)',
                    },
                  }}
                >
                  {t('import.select_all')}
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => dispatchData({ type: 'setSelection', payload: [] })}
                  c="dimmed"
                >
                  {t('import.clear')}
                </Button>
              </Group>
            </Group>
          </Box>

          <ScrollArea
            style={{ flex: 1, backgroundColor: 'var(--mantine-color-app-7)' }}
            type="always"
            offsetScrollbars
          >
            <Box p="md">
              {Object.keys(groupedRoster).length === 0 ? (
                <Text ta="center" c="dimmed" py="xl">
                  {searchQuery ? 'No members found matching filter' : 'No members found'}
                </Text>
              ) : (
                <Accordion
                  multiple
                  value={openedItems}
                  onChange={setOpenedItems}
                  styles={{
                    item: {
                      backgroundColor: 'var(--mantine-color-app-9)',
                      border: '1px solid var(--mantine-color-app-7)',
                      marginBottom: 8,
                      borderRadius: 4,
                    },
                    control: { minHeight: 48 },
                    label: { padding: 0 },
                    content: { padding: 0, backgroundColor: 'var(--mantine-color-app-8)' },
                  }}
                >
                  {sortedRanks.map((rank) => {
                    const members = groupedRoster[rank];
                    if (!members || members.length === 0) return null;
                    const isSelected = isRankSelected(members);
                    const isIndeterminate = isRankIndeterminate(members);

                    return (
                      <Accordion.Item key={rank} value={String(rank)}>
                        <Accordion.Control>
                          <Flex align="center" gap="md">
                            <Checkbox
                              checked={isSelected}
                              indeterminate={isIndeterminate}
                              onChange={() => toggleRank(rank, members)}
                              onClick={(e) => e.stopPropagation()}
                              classNames={{ input: 'custom-checkbox' }}
                              color="grape"
                            />
                            <Text fw={700} c="app.1">
                              {t('import.rank', { rank })}
                            </Text>
                            <Badge
                              size="sm"
                              variant="filled"
                              color="dark"
                              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                            >
                              {members.length}
                            </Badge>
                          </Flex>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Table verticalSpacing="xs" highlightOnHover>
                            <Table.Tbody>
                              {members.map((member, idx) => (
                                <Table.Tr
                                  key={`${member.name}-${member.realm}-${idx}`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => toggleMember(member)}
                                >
                                  <Table.Td w={40} pl="md">
                                    <Checkbox
                                      checked={selection.includes(getMemberId(member))}
                                      readOnly
                                      color="grape"
                                      style={{ pointerEvents: 'none' }}
                                    />
                                  </Table.Td>
                                  <Table.Td>
                                    <Group gap="sm">
                                      <img
                                        src={`/src/character/class/${CLASS_SLUGS[member.classId]}-icon.svg`}
                                        alt={CLASS_SLUGS[member.classId]}
                                        width={24}
                                        height={24}
                                        style={{ borderRadius: 4 }}
                                      />
                                      <Box>
                                        <Text
                                          fw={600}
                                          style={{
                                            color:
                                              CLASS_COLORS[member.classId] ||
                                              'var(--mantine-color-gray-5)',
                                          }}
                                        >
                                          {member.name}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                          {member.realm}
                                        </Text>
                                      </Box>
                                    </Group>
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }} w={80}>
                                    <Text size="xs" c="dimmed">
                                      Lvl {member.level}
                                    </Text>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </Accordion.Panel>
                      </Accordion.Item>
                    );
                  })}
                </Accordion>
              )}
            </Box>
          </ScrollArea>

          <Box
            p="md"
            style={{
              borderTop: '1px solid var(--mantine-color-app-7)',
              background: 'var(--mantine-color-app-7)',
              flexShrink: 0,
            }}
          >
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={onClose}>
                {t('import.cancel')}
              </Button>
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={selection.length === 0}
                color="grape"
                variant="filled"
              >
                {t('import.import_selected', { count: selection.length })}
              </Button>
            </Group>
          </Box>
        </Flex>
      )}
    </Drawer>
  );
}
