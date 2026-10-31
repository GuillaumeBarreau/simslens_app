import { Alert, Button, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBell,
  IconBellRinging,
  IconBrandDiscord,
  IconFolder,
  IconLock,
  IconServer,
  IconWorld,
} from '@tabler/icons-react';
import { Select } from 'components/design-system/atoms';
import { SettingsGroup, SettingsRow } from 'components/design-system/organisms/SettingsGroup';
import { buildDiscordBotInviteUrl } from 'config/externalServices';
import { isFeatureEnabled } from 'config/featureFlags';
import { useAuth } from 'contexts';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { realmService } from 'services/realm.service';
import { timeZoneOptions } from 'utils/calendarFeed';

/** Fuseau par défaut d'un royaume, comme côté serveur (SIMS-204). */
const DEFAULT_REALM_TIME_ZONE = 'Europe/Paris';

/** Lien d'invitation du bot ; `null` (ligne masquée) sans `VITE_DISCORD_CLIENT_ID`. */
const DISCORD_BOT_INVITE_URL = buildDiscordBotInviteUrl(import.meta.env.VITE_DISCORD_CLIENT_ID);

export function DiscordSettingsView() {
  const { t } = useTranslation('discordSettings');
  const [loading, setLoading] = useState(false);
  const [discordGuildIdInput, setDiscordGuildIdInput] = useState('');
  const [discordRaidCategoryIdInput, setDiscordRaidCategoryIdInput] = useState('');
  const [signupLockHours, setSignupLockHours] = useState<number>(24);
  const [signupReminderHours, setSignupReminderHours] = useState<number>(2);
  const [confirmReminderHours, setConfirmReminderHours] = useState<number>(0);
  const [timezone, setTimezone] = useState<string>(DEFAULT_REALM_TIME_ZONE);
  const showTimezone = isFeatureEnabled('realm-timezone');
  const timezones = useMemo(() => timeZoneOptions(timezone), [timezone]);

  const { user, selectedCharacterId } = useAuth();
  const realmId =
    user?.linkedCharacters?.find((c) => c.id === selectedCharacterId)?.realmId || null;

  useEffect(() => {
    const loadSettings = async () => {
      if (!realmId) return;
      try {
        setLoading(true);
        const realm = await realmService.getRealm(realmId);
        setDiscordGuildIdInput(realm.discordGuildId ?? '');
        setDiscordRaidCategoryIdInput(realm.discordRaidCategoryId ?? '');
        setSignupLockHours(realm.signupLockHours ?? 24);
        setSignupReminderHours(realm.signupReminderHours ?? 2);
        setConfirmReminderHours(realm.confirmReminderHours ?? 0);
        setTimezone(realm.timezone || DEFAULT_REALM_TIME_ZONE);
      } catch (error) {
        console.error('Error loading Discord settings:', error);
        notifications.show({
          title: t('notifications.load_error_title'),
          message: t('notifications.load_error_message'),
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    if (realmId) {
      loadSettings();
    }
  }, [realmId, t]);

  const handleSave = async () => {
    if (!realmId) return;
    try {
      setLoading(true);
      await realmService.updateSettings(realmId, {
        discordGuildId: discordGuildIdInput.trim() || null,
        discordRaidCategoryId: discordRaidCategoryIdInput.trim() || null,
        signupLockHours,
        signupReminderHours,
        confirmReminderHours,
        ...(showTimezone ? { timezone } : {}),
      });
      notifications.show({
        title: t('notifications.success_title'),
        message: t('notifications.success_message'),
        color: 'green',
      });
    } catch (error) {
      console.error('Error saving Discord settings:', error);
      const apiError = error as { response?: { data?: { error?: string } } } | null;
      notifications.show({
        title: t('notifications.save_error_title'),
        message: apiError?.response?.data?.error || t('notifications.save_error_message'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!realmId || (loading && !discordGuildIdInput && !discordRaidCategoryIdInput)) {
    return <Text>{t('loading')}</Text>;
  }

  return (
    <Stack gap="lg" maw={800}>
      <Alert color="brand.5" variant="light">
        <Text size="sm">{t('info')}</Text>
      </Alert>

      <SettingsGroup title={t('sections.connection')}>
        {DISCORD_BOT_INVITE_URL && (
          <SettingsRow
            icon={<IconBrandDiscord size={20} stroke={1.5} />}
            title={t('invite_bot_row.label')}
            description={t('invite_bot_row.description')}
            control={
              <Button
                component="a"
                href={DISCORD_BOT_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                color="brand.5"
                size="sm"
              >
                {t('invite_bot')}
              </Button>
            }
          />
        )}
        <SettingsRow
          icon={<IconServer size={20} stroke={1.5} />}
          title={t('guild_id.label')}
          description={t('guild_id.description')}
          labelFor="discord-guild-id"
          controlWidth={240}
          control={
            <TextInput
              id="discord-guild-id"
              value={discordGuildIdInput}
              onChange={(e) => setDiscordGuildIdInput(e.target.value)}
              placeholder={t('guild_id.placeholder')}
            />
          }
        />
        <SettingsRow
          icon={<IconFolder size={20} stroke={1.5} />}
          title={t('category_id.label')}
          description={t('category_id.description')}
          labelFor="discord-category-id"
          controlWidth={240}
          control={
            <TextInput
              id="discord-category-id"
              value={discordRaidCategoryIdInput}
              onChange={(e) => setDiscordRaidCategoryIdInput(e.target.value)}
              placeholder={t('category_id.placeholder')}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title={t('sections.signups')}>
        <SettingsRow
          icon={<IconLock size={20} stroke={1.5} />}
          title={t('lock_hours.label')}
          description={t('lock_hours.description')}
          labelFor="discord-lock-hours"
          controlWidth={120}
          control={
            <NumberInput
              id="discord-lock-hours"
              value={signupLockHours}
              onChange={(v) => setSignupLockHours(typeof v === 'number' ? v : 0)}
              min={0}
              max={720}
              step={1}
            />
          }
        />
        <SettingsRow
          icon={<IconBell size={20} stroke={1.5} />}
          title={t('reminder_hours.label')}
          description={t('reminder_hours.description')}
          labelFor="discord-reminder-hours"
          controlWidth={120}
          control={
            <NumberInput
              id="discord-reminder-hours"
              value={signupReminderHours}
              onChange={(v) => setSignupReminderHours(typeof v === 'number' ? v : 0)}
              min={0}
              max={signupLockHours}
              step={1}
            />
          }
        />
        {isFeatureEnabled('raid-confirm-reminder') && (
          <SettingsRow
            icon={<IconBellRinging size={20} stroke={1.5} />}
            title={t('confirm_reminder_hours.label')}
            description={t('confirm_reminder_hours.description')}
            labelFor="discord-confirm-reminder-hours"
            controlWidth={120}
            control={
              <NumberInput
                id="discord-confirm-reminder-hours"
                value={confirmReminderHours}
                onChange={(v) => setConfirmReminderHours(typeof v === 'number' ? v : 0)}
                min={0}
                max={720}
                step={1}
              />
            }
          />
        )}
        {showTimezone && (
          <SettingsRow
            icon={<IconWorld size={20} stroke={1.5} />}
            title={t('timezone.label')}
            description={t('timezone.description')}
            labelFor="discord-timezone"
            controlWidth={240}
            control={
              <Select
                id="discord-timezone"
                placeholder={t('timezone.placeholder')}
                data={timezones}
                value={timezone}
                onChange={(v) => v && setTimezone(v)}
                searchable
                allowDeselect={false}
                nothingFoundMessage="—"
                size="sm"
              />
            }
          />
        )}
      </SettingsGroup>

      <Group justify="flex-start">
        <Button onClick={handleSave} loading={loading} color="brand.5" size="md">
          {t('save')}
        </Button>
      </Group>
    </Stack>
  );
}
