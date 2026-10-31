import { Alert, Button, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBolt,
  IconBrain,
  IconCrosshair,
  IconFlame,
  IconHandStop,
  IconHeart,
  IconHourglass,
  IconPaw,
  IconSparkles,
  IconSpeakerphone,
  IconStopwatch,
  IconTarget,
  IconUsers,
  IconWind,
} from '@tabler/icons-react';
import {
  SettingsGroup,
  SettingsRow,
  SettingsSwitchRow,
} from 'components/design-system/organisms/SettingsGroup';
import { isFeatureEnabled } from 'config/featureFlags';
import { useAuth } from 'contexts';
import { useUpdateValidationSettings } from 'hooks/queries';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SIM_STALE_AFTER_DAYS_MAX,
  SIM_STALE_AFTER_DAYS_MIN,
  ValidationSettings,
  validationSettingsService,
} from 'services/validationSettings.service';
import { REPORT_STALE_DAYS } from 'utils/droptimizer';

export function ValidationSettingsView() {
  const { t } = useTranslation('validationSettings');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ValidationSettings | null>(null);
  const [fightStylesInput, setFightStylesInput] = useState('');
  // Seuil de péremption des sims, sous le drapeau de la fraîcheur (SIMS-228).
  const showSimFreshness = isFeatureEnabled('sim-freshness');

  const { user, selectedCharacterId } = useAuth();
  const realmId =
    user?.linkedCharacters?.find((c) => c.id === selectedCharacterId)?.realmId || null;
  const updateSettings = useUpdateValidationSettings(realmId);

  const raidBuffsConfig = [
    { key: 'bloodlust', label: t('raid_buffs.bloodlust'), icon: IconFlame },
    { key: 'arcaneIntellect', label: t('raid_buffs.arcaneIntellect'), icon: IconBrain },
    { key: 'fortitude', label: t('raid_buffs.fortitude'), icon: IconHeart },
    { key: 'battleShout', label: t('raid_buffs.battleShout'), icon: IconSpeakerphone },
    { key: 'mysticTouch', label: t('raid_buffs.mysticTouch'), icon: IconHandStop },
    { key: 'chaosBrand', label: t('raid_buffs.chaosBrand'), icon: IconSparkles },
    { key: 'skyfury', label: t('raid_buffs.skyfury'), icon: IconWind },
    { key: 'markOfTheWild', label: t('raid_buffs.markOfTheWild'), icon: IconPaw },
    { key: 'huntersMark', label: t('raid_buffs.huntersMark'), icon: IconCrosshair },
    { key: 'powerInfusion', label: t('raid_buffs.powerInfusion'), icon: IconBolt },
  ] as const;

  const handleBuffChange = (
    buffKey: keyof ValidationSettings['raidBuffsConfig'],
    checked: boolean,
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      raidBuffsConfig: {
        ...settings.raidBuffsConfig,
        [buffKey]: checked,
      },
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (!realmId) return;

      try {
        setLoading(true);
        const data = await validationSettingsService.getSettings(realmId);
        setSettings(data);
        setFightStylesInput(data.allowedFightStyles.join(', '));
      } catch (error) {
        console.error('Error loading validation settings:', error);
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
    if (!settings || !realmId) return;

    try {
      setLoading(true);

      const allowedFightStyles = fightStylesInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (allowedFightStyles.length === 0) {
        notifications.show({
          title: t('notifications.validation_error_title'),
          message: t('notifications.validation_error_message'),
          color: 'red',
        });
        return;
      }

      // Enregistré via la mutation : la lecture du seuil (roster, suivi) est
      // rafraîchie aussitôt.
      await updateSettings.mutateAsync({
        allowedFightStyles,
        fightLength: settings.fightLength,
        enemyCount: settings.enemyCount,
        raidBuffsConfig: settings.raidBuffsConfig,
        ...(showSimFreshness && settings.simStaleAfterDays !== undefined
          ? { simStaleAfterDays: settings.simStaleAfterDays }
          : {}),
      });

      notifications.show({
        title: t('notifications.success_title'),
        message: t('notifications.success_message'),
        color: 'green',
      });
    } catch (error) {
      console.error('Error saving validation settings:', error);
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

  if (!realmId || (loading && !settings)) {
    return <Text>{t('loading')}</Text>;
  }

  if (!settings) return null;

  return (
    <Stack gap="lg" maw={800}>
      {settings.isDefault && (
        <Alert color="brand.5" variant="light">
          <Text size="sm">{t('default_notice')}</Text>
        </Alert>
      )}

      <SettingsGroup title={t('simulation_title')}>
        <SettingsRow
          icon={<IconTarget size={20} stroke={1.5} />}
          title={t('fight_styles.label')}
          description={t('fight_styles.description')}
          labelFor="validation-fight-styles"
          controlWidth={260}
          control={
            <TextInput
              id="validation-fight-styles"
              value={fightStylesInput}
              onChange={(e) => setFightStylesInput(e.target.value)}
              placeholder={t('fight_styles.placeholder')}
              required
            />
          }
        />
        <SettingsRow
          icon={<IconStopwatch size={20} stroke={1.5} />}
          title={t('fight_length.label')}
          description={t('fight_length.description')}
          labelFor="validation-fight-length"
          controlWidth={140}
          control={
            <NumberInput
              id="validation-fight-length"
              value={settings.fightLength}
              onChange={(value) =>
                setSettings({ ...settings, fightLength: typeof value === 'number' ? value : 300 })
              }
              min={1}
              required
            />
          }
        />
        <SettingsRow
          icon={<IconUsers size={20} stroke={1.5} />}
          title={t('enemy_count.label')}
          description={t('enemy_count.description')}
          labelFor="validation-enemy-count"
          controlWidth={140}
          control={
            <NumberInput
              id="validation-enemy-count"
              value={settings.enemyCount}
              onChange={(value) =>
                setSettings({ ...settings, enemyCount: typeof value === 'number' ? value : 1 })
              }
              min={1}
              required
            />
          }
        />
      </SettingsGroup>

      {showSimFreshness && (
        <SettingsGroup title={t('sim_freshness.title')}>
          <SettingsRow
            icon={<IconHourglass size={20} stroke={1.5} />}
            title={t('sim_freshness.label')}
            description={t('sim_freshness.description', {
              min: SIM_STALE_AFTER_DAYS_MIN,
              max: SIM_STALE_AFTER_DAYS_MAX,
            })}
            labelFor="validation-sim-stale-after-days"
            controlWidth={140}
            control={
              <NumberInput
                id="validation-sim-stale-after-days"
                value={settings.simStaleAfterDays ?? REPORT_STALE_DAYS}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    simStaleAfterDays: typeof value === 'number' ? value : REPORT_STALE_DAYS,
                  })
                }
                min={SIM_STALE_AFTER_DAYS_MIN}
                max={SIM_STALE_AFTER_DAYS_MAX}
                clampBehavior="strict"
                allowDecimal={false}
                allowNegative={false}
                suffix={` ${t('sim_freshness.unit')}`}
                required
              />
            }
          />
        </SettingsGroup>
      )}

      <SettingsGroup title={t('raid_buffs.title')}>
        {raidBuffsConfig.map((buff) => (
          <SettingsSwitchRow
            key={buff.key}
            icon={<buff.icon size={20} stroke={1.5} />}
            title={buff.label}
            description={t(`raid_buffs.providers.${buff.key}`)}
            checked={settings.raidBuffsConfig[buff.key]}
            onChange={(checked) => handleBuffChange(buff.key, checked)}
          />
        ))}
      </SettingsGroup>

      <Group justify="flex-start">
        <Button onClick={handleSave} loading={loading} size="md" color="brand.5">
          {t('save')}
        </Button>
      </Group>
    </Stack>
  );
}
