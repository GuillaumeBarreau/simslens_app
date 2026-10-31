import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
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
import { IconAlertCircle, IconCheck, IconShield, IconUsers } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { WOW_EXTENSION } from 'config/seasonConfig';
import { useAuth } from 'contexts';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { InviteCodeValidation } from 'services/invite.service';
import { inviteService } from 'services/invite.service';

export default function JoinAsGuestPage() {
  const { code: urlCode } = useParams() as { code?: string };
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  const [inputCode, setInputCode] = useState(urlCode ?? '');
  const [validation, setValidation] = useState<InviteCodeValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (urlCode) {
      handleValidate(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCode]);

  const handleValidate = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setIsValidating(true);
    try {
      const result = await inviteService.validateCode(trimmed);
      setValidation(result);
    } catch {
      setValidation({ valid: false, reason: 'error' });
    } finally {
      setIsValidating(false);
    }
  };

  const joinMutation = useMutation({
    mutationFn: () => inviteService.joinWithCode(inputCode.trim().toUpperCase()),
    onSuccess: async (data) => {
      await refetchUser();
      notifications.show({
        title: 'Bienvenue !',
        message: `Tu as rejoint ${data.realm.guildName} en tant que guest.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      navigate(`/${data.realm.guildName}/${WOW_EXTENSION}/my-activity`);
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Erreur',
        message: err?.response?.data?.message || 'Impossible de rejoindre ce realm.',
        color: 'red',
      });
    },
  });

  const validRealm = validation?.valid ? validation.realm : null;

  return (
    <Container size="sm" py={60}>
      <Stack gap="xl" align="center">
        <Stack align="center" gap="xs">
          <ThemeIcon size={64} radius="md" variant="light" color="teal">
            <IconShield size={36} />
          </ThemeIcon>
          <Title order={2}>Rejoindre en tant que guest</Title>
          <Text c="dimmed" ta="center">
            Saisis le code d&apos;invitation fourni par le responsable de la guilde.
          </Text>
        </Stack>

        <Card shadow="sm" padding="xl" radius="md" withBorder w="100%">
          <Stack gap="md">
            <TextInput
              label="Code d'invitation"
              placeholder="ex: AB3C7D2E"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.currentTarget.value);
                setValidation(null);
              }}
              size="md"
              styles={{ input: { textTransform: 'uppercase', letterSpacing: 2 } }}
            />

            {!validation && (
              <Button
                variant="default"
                onClick={() => handleValidate(inputCode)}
                loading={isValidating}
                disabled={!inputCode.trim()}
              >
                Vérifier le code
              </Button>
            )}

            {isValidating && (
              <Center>
                <Loader size="sm" />
              </Center>
            )}

            {validation && !validation.valid && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" title="Code invalide">
                {validation.reason === 'expired' && "Ce code d'invitation a expiré."}
                {validation.reason === 'max_uses_reached' &&
                  "Ce code d'invitation a déjà été utilisé le nombre maximum de fois."}
                {(validation.reason === 'invalid_code' || validation.reason === 'error') &&
                  'Ce code est invalide ou introuvable.'}
              </Alert>
            )}

            {validRealm && (
              <Stack gap="md">
                <Alert icon={<IconCheck size={16} />} color="teal" title="Code valide">
                  <Group gap="xs">
                    <Text size="sm">Tu vas rejoindre :</Text>
                    <Badge color="teal" variant="light" leftSection={<IconUsers size={12} />}>
                      {validRealm.guildName}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {validRealm.server} — {validRealm.region}
                    </Text>
                  </Group>
                </Alert>

                <Button
                  color="teal"
                  leftSection={<IconShield size={16} />}
                  onClick={() => joinMutation.mutate()}
                  loading={joinMutation.isPending}
                  size="md"
                >
                  Rejoindre {validRealm.guildName}
                </Button>
              </Stack>
            )}
          </Stack>
        </Card>

        <Button variant="subtle" c="dimmed" onClick={() => navigate('/redirect')}>
          Retour
        </Button>
      </Stack>
    </Container>
  );
}
