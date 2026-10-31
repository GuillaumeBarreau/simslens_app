import {
  ActionIcon,
  Alert,
  Button,
  Card,
  CopyButton,
  Group,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCalendarEvent, IconCheck, IconCopy } from '@tabler/icons-react';
import { ConfirmModal } from 'components/design-system/organisms';
import { API_BASE_URL } from 'config/apiConstants';
import dayjs from 'dayjs';
import {
  useCalendarFeedStatus,
  useRegenerateCalendarFeed,
  useRevokeCalendarFeed,
} from 'hooks/queries';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { browserTimeZone, buildCalendarFeedUrl, toWebcalUrl } from 'utils/calendarFeed';

type PendingAction = 'regenerate' | 'revoke' | null;

/**
 * Flux iCal du joueur (SIMS-204) : une URL privée à ajouter à son agenda,
 * régénérable ou révocable. Le lien n'est affiché qu'à sa création, le
 * serveur n'en gardant que l'empreinte.
 */
export function ActivityCalendarFeedSection() {
  const { t } = useTranslation('myActivity');
  const { data: status, isLoading } = useCalendarFeedStatus();
  const regenerate = useRegenerateCalendarFeed();
  const revoke = useRevokeCalendarFeed();
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  const showError = (error: unknown) => {
    const e = error as { response?: { data?: { message?: string } }; message?: string } | null;
    notifications.show({
      title: t('calendar_feed.error_title'),
      message: e?.response?.data?.message || e?.message || t('calendar_feed.error'),
      color: 'red',
    });
  };

  const handleRegenerate = async () => {
    try {
      const { token } = await regenerate.mutateAsync();
      setFeedUrl(buildCalendarFeedUrl(API_BASE_URL, token, window.location.origin));
      setPending(null);
    } catch (error) {
      showError(error);
    }
  };

  const handleRevoke = async () => {
    try {
      await revoke.mutateAsync();
      setFeedUrl(null);
      setPending(null);
      notifications.show({ message: t('calendar_feed.revoked'), color: 'green' });
    } catch (error) {
      showError(error);
    }
  };

  const formatDate = (value: string | null | undefined) =>
    value ? dayjs(value).format('D MMM YYYY · HH:mm') : t('calendar_feed.never');

  return (
    <Card withBorder radius="md" p="md">
      <Group gap="xs" mb="xs">
        <IconCalendarEvent size={18} />
        <Title order={4}>{t('calendar_feed.title')}</Title>
      </Group>
      <Text size="sm" c="dimmed" mb="sm">
        {t('calendar_feed.description')}
      </Text>

      {isLoading ? (
        <Skeleton h={72} radius="sm" />
      ) : (
        <Stack gap="sm">
          {feedUrl && (
            <>
              <Alert color="yellow" variant="light">
                <Text size="sm">{t('calendar_feed.copy_now')}</Text>
              </Alert>
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  value={feedUrl}
                  readOnly
                  aria-label={t('calendar_feed.url_label')}
                  style={{ flex: 1 }}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <CopyButton value={feedUrl}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? t('calendar_feed.copied') : t('calendar_feed.copy')}>
                      <ActionIcon
                        variant="light"
                        color={copied ? 'green' : 'brand.5'}
                        size="lg"
                        onClick={copy}
                        aria-label={t('calendar_feed.copy')}
                      >
                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Button
                component="a"
                href={toWebcalUrl(feedUrl)}
                variant="light"
                color="brand.5"
                size="xs"
              >
                {t('calendar_feed.subscribe')}
              </Button>
            </>
          )}

          {status?.active && !feedUrl && (
            <Text size="sm">
              {t('calendar_feed.active', {
                createdAt: formatDate(status.createdAt),
                lastUsedAt: formatDate(status.lastUsedAt),
              })}
            </Text>
          )}

          <Group gap="xs">
            {status?.active ? (
              <>
                <Button size="xs" color="brand.5" onClick={() => setPending('regenerate')}>
                  {t('calendar_feed.regenerate')}
                </Button>
                <Button size="xs" variant="subtle" color="red" onClick={() => setPending('revoke')}>
                  {t('calendar_feed.revoke')}
                </Button>
              </>
            ) : (
              <Button
                size="xs"
                color="brand.5"
                onClick={handleRegenerate}
                loading={regenerate.isPending}
              >
                {t('calendar_feed.create')}
              </Button>
            )}
          </Group>

          <Text size="xs" c="dimmed">
            {t('calendar_feed.time_zone', { timeZone: browserTimeZone() })}
          </Text>
        </Stack>
      )}

      <ConfirmModal
        opened={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={pending === 'revoke' ? handleRevoke : handleRegenerate}
        title={
          pending === 'revoke'
            ? t('calendar_feed.revoke_confirm_title')
            : t('calendar_feed.regenerate_confirm_title')
        }
        message={t('calendar_feed.confirm_message')}
        confirmLabel={
          pending === 'revoke' ? t('calendar_feed.revoke') : t('calendar_feed.regenerate')
        }
        cancelLabel={t('calendar_feed.cancel')}
        isLoading={regenerate.isPending || revoke.isPending}
      />
    </Card>
  );
}
