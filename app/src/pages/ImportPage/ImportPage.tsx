import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  FileInput,
  Group,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconFileImport, IconUpload } from '@tabler/icons-react';
import { useCallback, useMemo, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from 'services/api';

import { API_IMPORT, API_VERSION } from '../../config/apiConstants';
import { EXTENSION_SEASONS, VALID_EXTENSIONS } from '../../config/seasonConfig';
import { useAuth, useRealmAccess } from '../../contexts';
import { useUserRealm } from '../../hooks/queries';
import { useRouteParams } from '../../hooks/useRouteParams';
import { Permission } from '../../types/permissions';
import { initialState, reducer } from './ImportPage.reducers';
import type { SlimRow } from './utils';
import { detectDelimiter, parseRCLCText, rowsToSlim } from './utils';

export default function ImportPage() {
  const { hasPermission } = useRealmAccess();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canImport = hasPermission(Permission.IMPORT_SIMC);

  const { extension: routeExtension, season: routeSeason } = useRouteParams();
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const realmId = realmData?.id ?? null;

  const [selectedExtension, setSelectedExtension] = useState<string>(routeExtension);
  const [selectedSeason, setSelectedSeason] = useState<string>(routeSeason);

  const extensionOptions = VALID_EXTENSIONS.map((e) => ({ value: e, label: e }));
  const seasonOptions = (EXTENSION_SEASONS[selectedExtension] ?? []).map((s) => ({
    value: s,
    label: s,
  }));

  const [state, dispatch] = useReducer(reducer, initialState);
  const { csvText, rowsAll, status, detectedDelimiter, fileName, skippedPlayers } = state;

  const handleFile = useCallback((file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      dispatch({ type: 'SET_CSV_TEXT', payload: text });
      const sample = text.slice(0, 4000);
      const delim = detectDelimiter(sample);
      dispatch({ type: 'SET_DETECTED_DELIMITER', payload: delim });
      dispatch({ type: 'SET_FILE_NAME', payload: file.name || 'uploaded.csv' });

      const rows = parseRCLCText(text);
      if (rows.length === 0) {
        dispatch({ type: 'SET_STATUS', payload: 'Fichier vide ou format invalide' });
        dispatch({ type: 'SET_ROWS_ALL', payload: [] });
        return;
      }

      const slim = rowsToSlim(rows);
      dispatch({ type: 'SET_ROWS_ALL', payload: slim });
      dispatch({ type: 'SET_STATUS', payload: `${slim.length} lignes parsées` });
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const handleUpload = useCallback(async () => {
    if (rowsAll.length === 0) return;
    try {
      dispatch({ type: 'SET_STATUS', payload: 'Envoi en cours...' });
      // apiClient : envoie la session (l'upload exige la permission import_simc).
      const { data } = await api.post(`${API_VERSION}${API_IMPORT}upload`, {
        filename: fileName || 'uploaded.csv',
        rows: rowsAll,
        realmId,
        extension: selectedExtension,
        season: selectedSeason,
      });
      dispatch({ type: 'SET_STATUS', payload: `Import OK (id=${data.importID})` });
      dispatch({ type: 'SET_SKIPPED_PLAYERS', payload: data.skippedPlayers ?? [] });
      notifications.show({
        title: 'Import réussi',
        message: `${data.importedCount} loots importés`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (e: unknown) {
      // apiClient rejette avec le corps de la réponse ({ error }) ou une Error réseau.
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e && 'error' in e
            ? String((e as { error: unknown }).error)
            : JSON.stringify(e);
      dispatch({ type: 'SET_STATUS', payload: `Erreur: ${msg}` });
      notifications.show({ title: 'Erreur serveur', message: msg, color: 'red' });
    }
  }, [fileName, realmId, rowsAll, selectedExtension, selectedSeason]);

  const allowedResponses = useMemo(
    () => ['Upgrade', 'Best in Slot', 'Minor Upgrade', 'Transmog', 'Proc', 'Off-spec'],
    [],
  );

  const isValidResponse = useCallback(
    (val?: string) => !!val && allowedResponses.includes(val),
    [allowedResponses],
  );

  const invalidCount = useMemo(
    () => rowsAll.filter((r) => !isValidResponse(String(r.response))).length,
    [rowsAll, isValidResponse],
  );

  const updateRow = useCallback((index: number, updated: Partial<SlimRow>) => {
    dispatch({ type: 'UPDATE_ROW', payload: { index, updated } });
  }, []);

  const headers = useMemo<(keyof SlimRow)[]>(
    () => ['player', 'date', 'itemID', 'response', 'instance', 'owner'],
    [],
  );

  if (!canImport) {
    navigate('/');
    return null;
  }

  const hasInvalid = invalidCount > 0;
  const canSubmit = !!csvText && !hasInvalid && rowsAll.length > 0;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group gap="md">
          <ThemeIcon size={44} radius="md" variant="light" color="brand">
            <IconFileImport size={24} />
          </ThemeIcon>
          <div>
            <Title order={2}>Import de loots</Title>
            <Text size="sm" c="dimmed">
              Importez les données de distribution depuis RCLootCouncil (.csv / .txt)
            </Text>
          </div>
        </Group>

        <Box
          p="lg"
          style={{
            background: 'var(--mantine-color-app-8)',
            borderRadius: 8,
            border: '1px solid #2f2f2f',
          }}
        >
          <Stack gap="md">
            <Text size="sm" fw={600} c="dimmed" tt="uppercase" lts={1}>
              Configuration
            </Text>

            <Group grow>
              <Select
                label="Extension"
                value={selectedExtension}
                data={extensionOptions}
                onChange={(v) => {
                  if (!v) return;
                  setSelectedExtension(v);
                  setSelectedSeason(EXTENSION_SEASONS[v]?.[0] ?? '');
                }}
                styles={{
                  input: { background: 'var(--mantine-color-app-7)', border: '1px solid #2f2f2f' },
                }}
              />
              <Select
                label="Saison"
                value={selectedSeason}
                data={seasonOptions}
                onChange={(v) => {
                  if (!v) return;
                  setSelectedSeason(v);
                }}
                styles={{
                  input: { background: 'var(--mantine-color-app-7)', border: '1px solid #2f2f2f' },
                }}
              />
            </Group>
          </Stack>
        </Box>

        <Box
          p="lg"
          style={{
            background: 'var(--mantine-color-app-8)',
            borderRadius: 8,
            border: '1px solid #2f2f2f',
          }}
        >
          <Stack gap="md">
            <Text size="sm" fw={600} c="dimmed" tt="uppercase" lts={1}>
              Fichier source
            </Text>

            <FileInput
              accept=".csv,.txt"
              onChange={handleFile}
              placeholder="Sélectionner un fichier .txt depuis RCLootCouncil"
              leftSection={<IconUpload size={16} />}
              styles={{
                input: {
                  background: 'var(--mantine-color-app-7)',
                  border: '1px solid #2f2f2f',
                },
              }}
            />

            {rowsAll.length > 0 && (
              <Group gap="sm">
                <Badge variant="light" color="brand">
                  {rowsAll.length} lignes
                </Badge>
                {detectedDelimiter && (
                  <Badge variant="outline" color="gray">
                    Délimiteur :{' '}
                    {detectedDelimiter === '\t'
                      ? 'tabulation'
                      : detectedDelimiter === ';'
                        ? 'point-virgule'
                        : 'virgule'}
                  </Badge>
                )}
                {hasInvalid ? (
                  <Badge variant="light" color="yellow">
                    {invalidCount} réponse{invalidCount > 1 ? 's' : ''} à corriger
                  </Badge>
                ) : (
                  <Badge variant="light" color="green">
                    Prêt à importer
                  </Badge>
                )}
              </Group>
            )}

            {hasInvalid && (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                color="yellow"
                variant="light"
                title="Réponses non reconnues"
              >
                <Text size="sm">
                  {invalidCount} ligne{invalidCount > 1 ? 's ont' : ' a'} une valeur de
                  «&nbsp;response&nbsp;» non reconnue. Corrigez-les dans le tableau ci-dessous avant
                  d&apos;envoyer.
                </Text>
              </Alert>
            )}

            <Group>
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={handleUpload}
                disabled={!canSubmit}
              >
                Importer
              </Button>
              {status && (
                <Text size="sm" c="dimmed">
                  {status}
                </Text>
              )}
            </Group>
          </Stack>
        </Box>

        {skippedPlayers.length > 0 && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="orange"
            variant="light"
            title={`${skippedPlayers.length} joueur${skippedPlayers.length > 1 ? 's' : ''} introuvable${skippedPlayers.length > 1 ? 's' : ''} dans la guilde`}
          >
            <Text size="sm" mb="xs">
              Les loots de ces personnages n&apos;ont pas été importés :
            </Text>
            <Group gap="xs">
              {skippedPlayers.map((p) => (
                <Badge key={p} variant="outline" color="orange" size="sm">
                  {p}
                </Badge>
              ))}
            </Group>
          </Alert>
        )}

        {rowsAll.length > 0 && (
          <Box
            style={{
              background: 'var(--mantine-color-app-8)',
              borderRadius: 8,
              border: '1px solid #2f2f2f',
              overflow: 'hidden',
            }}
          >
            <Box px="lg" py="md" style={{ borderBottom: '1px solid #2f2f2f' }}>
              <Text size="sm" fw={600} c="dimmed" tt="uppercase" lts={1}>
                Prévisualisation — {Math.min(rowsAll.length, 200)} / {rowsAll.length} lignes
              </Text>
            </Box>

            <ScrollArea type="auto" scrollbarSize={8}>
              <Table verticalSpacing="xs" fz="sm" style={{ minWidth: 700 }}>
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: '1px solid #2f2f2f' }}>
                    {headers.map((h) => (
                      <Table.Th key={h} c="dimmed" style={{ fontWeight: 500 }}>
                        {h}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rowsAll.slice(0, 200).map((r, idx) => (
                    <Table.Tr
                      key={`${r.player}-${r.date}-${r.time}-${r.itemID}`}
                      style={{
                        borderBottom: '1px solid #1f1f1f',
                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                      }}
                    >
                      {headers.map((h) => {
                        if (h === 'response') {
                          const val = String(r.response ?? '');
                          if (!isValidResponse(val)) {
                            return (
                              <Table.Td key={h}>
                                <Select
                                  data={allowedResponses}
                                  value={null}
                                  onChange={(v) => updateRow(idx, { response: v || '' })}
                                  placeholder={`"${val}"`}
                                  size="xs"
                                  style={{ minWidth: 180 }}
                                  styles={{
                                    input: { borderColor: 'var(--mantine-color-yellow-6)' },
                                  }}
                                />
                              </Table.Td>
                            );
                          }
                          return (
                            <Table.Td key={h}>
                              <Badge variant="light" color="brand" size="sm">
                                {val}
                              </Badge>
                            </Table.Td>
                          );
                        }
                        return (
                          <Table.Td key={h} c="dimmed">
                            {r[h]}
                          </Table.Td>
                        );
                      })}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
