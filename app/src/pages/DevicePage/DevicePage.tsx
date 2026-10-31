import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Checkbox,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconDeviceDesktop, IconShield } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from 'contexts';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deviceAuthService } from 'services/deviceAuth.service';

function normalize(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatForDisplay(input: string) {
  const n = normalize(input);
  if (n.length <= 4) return n;
  return `${n.slice(0, 4)}-${n.slice(4, 8)}`;
}

export default function DevicePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const initialCode = searchParams.get('code') || '';
  const [rawCode, setRawCode] = useState(initialCode);
  const normalized = normalize(rawCode);
  const isComplete = normalized.length === 8;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/device?code=${normalized}`)}`, {
        replace: true,
      });
    }
  }, [authLoading, isAuthenticated, navigate, normalized]);

  const pendingQuery = useQuery({
    queryKey: ['device-pending', normalized],
    queryFn: () => deviceAuthService.getPending(normalized),
    enabled: isAuthenticated && isComplete,
    retry: false,
  });

  const [selectedRealmIds, setSelectedRealmIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (pendingQuery.data?.eligibleRealms) {
      setSelectedRealmIds(new Set(pendingQuery.data.eligibleRealms.map((r) => r.id)));
    }
  }, [pendingQuery.data]);

  const approveMutation = useMutation({
    mutationFn: () => deviceAuthService.approve(normalized, Array.from(selectedRealmIds)),
    onSuccess: () => {
      notifications.show({
        title: 'Appareil autorisé',
        message: 'Tu peux retourner sur le companion app, il va recevoir son token.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    },
    onError: (err: { response?: { data?: { error?: string } }; message?: string }) => {
      const code = err?.response?.data?.error;
      const map: Record<string, string> = {
        expired: "La demande d'autorisation a expiré, recommence depuis le companion.",
        already_consumed: 'Cette demande a déjà été utilisée.',
        already_approved: 'Cette demande a déjà été approuvée.',
        realm_ids_required: 'Sélectionne au moins un realm.',
      };
      notifications.show({
        title: 'Erreur',
        message: map[code || ''] || err?.message || "Impossible d'approuver la demande.",
        color: 'red',
      });
    },
  });

  const errorReason = useMemo(() => {
    if (!pendingQuery.error) return null;
    const code = (pendingQuery.error as { response?: { data?: { error?: string } } })?.response
      ?.data?.error;
    const map: Record<string, string> = {
      invalid_user_code: 'Ce code est invalide ou introuvable.',
      expired: "Ce code a expiré, recommence depuis l'application desktop.",
      already_consumed: 'Ce code a déjà été utilisé.',
      already_approved: 'Cette demande a déjà été approuvée.',
    };
    return map[code || ''] || 'Une erreur est survenue.';
  }, [pendingQuery.error]);

  if (authLoading || !isAuthenticated) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  const pending = pendingQuery.data;
  const approved = approveMutation.isSuccess;

  return (
    <Container size="sm" py={60}>
      <Stack gap="xl" align="center">
        <Stack align="center" gap="xs">
          <ThemeIcon size={64} radius="md" variant="light" color="blue">
            <IconDeviceDesktop size={36} />
          </ThemeIcon>
          <Title order={2}>Autoriser un appareil</Title>
          <Text c="dimmed" ta="center">
            Saisis le code affiché par l'application desktop pour lui donner accès à tes realms.
          </Text>
        </Stack>

        <Card shadow="sm" padding="xl" radius="md" withBorder w="100%">
          <Stack gap="md">
            <TextInput
              label="Code de l'appareil"
              placeholder="ABCD-EFGH"
              value={formatForDisplay(rawCode)}
              onChange={(e) => setRawCode(e.currentTarget.value)}
              size="md"
              disabled={approved}
              styles={{ input: { textTransform: 'uppercase', letterSpacing: 2 } }}
            />

            {!isComplete && (
              <Text size="xs" c="dimmed">
                8 caractères, le tiret est optionnel.
              </Text>
            )}

            {isComplete && pendingQuery.isLoading && (
              <Center>
                <Loader size="sm" />
              </Center>
            )}

            {errorReason && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" title="Code invalide">
                {errorReason}
              </Alert>
            )}

            {pending && !approved && (
              <Stack gap="md">
                <Alert icon={<IconCheck size={16} />} color="teal" title="Demande trouvée">
                  <Stack gap={4}>
                    {pending.deviceName && (
                      <Text size="sm">
                        Appareil : <strong>{pending.deviceName}</strong>
                      </Text>
                    )}
                    <Text size="xs" c="dimmed">
                      Expire le {new Date(pending.expiresAt).toLocaleString()}
                    </Text>
                  </Stack>
                </Alert>

                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    Realms accessibles depuis cet appareil
                  </Text>
                  {pending.eligibleRealms.length === 0 ? (
                    <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                      Tu n'es admin ou owner sur aucun realm — impossible d'autoriser cet appareil.
                    </Alert>
                  ) : (
                    pending.eligibleRealms.map((r) => (
                      <Checkbox
                        key={r.id}
                        checked={selectedRealmIds.has(r.id)}
                        onChange={(e) => {
                          const next = new Set(selectedRealmIds);
                          if (e.currentTarget.checked) next.add(r.id);
                          else next.delete(r.id);
                          setSelectedRealmIds(next);
                        }}
                        label={
                          <Group gap="xs">
                            <Text>{r.guildName}</Text>
                            <Badge size="xs" variant="light" color="blue">
                              {r.role}
                            </Badge>
                          </Group>
                        }
                      />
                    ))
                  )}
                </Stack>

                {pending.eligibleRealms.length > 0 && (
                  <Button
                    color="blue"
                    leftSection={<IconShield size={16} />}
                    onClick={() => approveMutation.mutate()}
                    loading={approveMutation.isPending}
                    disabled={selectedRealmIds.size === 0}
                    size="md"
                  >
                    Autoriser l'appareil
                  </Button>
                )}
              </Stack>
            )}

            {approved && (
              <Alert icon={<IconCheck size={16} />} color="green" title="C'est fait !">
                Tu peux fermer cet onglet. Le companion desktop va recevoir son token dans les
                prochaines secondes.
              </Alert>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
