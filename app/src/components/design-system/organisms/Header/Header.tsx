import {
  ActionIcon,
  Box,
  Button,
  Center,
  Flex,
  Group,
  HoverCard,
  Menu,
  Select,
  SimpleGrid,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCalendarStats,
  IconChartBar,
  IconChevronDown,
  IconClock,
  IconFileImport,
  IconHeart,
  IconKey,
  IconLanguage,
  IconLogout,
  IconMap,
  IconScale,
  IconSettings,
  IconShield,
  IconSword,
  IconUsers,
} from '@tabler/icons-react';
import { isFeatureEnabled } from 'config/featureFlags';
import { filterByCapability, type GameCapability } from 'config/games';
import { EXTENSION_SEASONS, VALID_EXTENSIONS } from 'config/seasonConfig';
import { useAuth, useRealmAccess } from 'contexts';
import { useGame } from 'hooks/useGame';
import { useRealmSync } from 'hooks/useRealmSync';
import { STORAGE_KEY_EXTENSION, STORAGE_KEY_SEASON, useRouteParams } from 'hooks/useRouteParams';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Permission } from 'types/permissions';

import { ContactUs } from '../../../domain/contact/ContactUs/ContactUs';
import classes from './Header.module.css';

const FlagIcon = ({ lang }: { lang: string }) => {
  if (lang === 'fr') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width="20" height="14">
        <rect width="3" height="2" fill="#ED2939" />
        <rect width="2" height="2" fill="#fff" />
        <rect width="1" height="2" fill="#002395" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="20" height="10">
      <clipPath id="s">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
};

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language.split('-')[0];

  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" color="app.0" size="lg">
          <IconLanguage size={22} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          onClick={() => changeLang('fr')}
          bg={currentLang === 'fr' ? 'var(--mantine-color-brand-9)' : undefined}
          leftSection={<FlagIcon lang="fr" />}
        >
          {t('common:languages.fr')}
        </Menu.Item>
        <Menu.Item
          onClick={() => changeLang('en')}
          bg={currentLang === 'en' ? 'var(--mantine-color-brand-9)' : undefined}
          leftSection={<FlagIcon lang="en" />}
        >
          {t('common:languages.en')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { extension, guild, season } = useRouteParams();

  useRealmSync();

  const location = useLocation();
  const { guild: routeGuild } = useParams();
  const { hasPermission } = useRealmAccess();
  const { has } = useGame();

  const showNav = !!routeGuild;

  const isActive = (path: string) => {
    const currentPath = decodeURIComponent(location.pathname);
    const isEventRosterPage =
      currentPath.includes('/raid/event/') && currentPath.includes('/roster');

    if (path.includes('/raid')) return currentPath.includes('/raid');
    if (path.includes('/dungeons')) return currentPath.includes('/dungeons');
    if (path.includes('/roster')) {
      if (isEventRosterPage) return false;
      return currentPath.includes('/roster');
    }
    if (path.includes('/boss')) return currentPath.includes('/boss');
    if (path.includes('/tracking')) return currentPath.includes('/tracking');
    if (path.includes('/wishlist')) return currentPath.includes('/wishlist');
    if (path.includes('/my-activity')) return currentPath.includes('/my-activity');
    if (path.includes('/history')) return currentPath.includes('/history');
    return currentPath === path;
  };

  const isMegaMenuActive = () => {
    const currentPath = decodeURIComponent(location.pathname);
    return (
      currentPath.includes('/tracking') ||
      currentPath.includes('/boss') ||
      currentPath.includes('/wishlist') ||
      currentPath.includes('/raid') ||
      currentPath.includes('/dungeons') ||
      currentPath.includes('/history')
    );
  };

  interface MegaItem {
    icon: React.ElementType;
    label: string;
    description: string;
    path: string;
    visible: boolean;
    /** Capacité de jeu requise : l'entrée disparaît si le jeu courant ne l'a pas. */
    capability?: GameCapability;
  }

  const visibleMegaItems: MegaItem[] = [
    {
      icon: IconChartBar,
      label: t('common:navigation.tracking'),
      description: t('common:navigation.tracking_desc', 'Track your guild roster progress'),
      path: `/${guild}/${extension}/tracking`,
      visible: hasPermission(Permission.VIEW_ROSTER),
    },
    {
      icon: IconSword,
      label: t('common:navigation.loot_optimizer'),
      description: t(
        'common:navigation.loot_optimizer_desc',
        'Optimize loot with Droptimizer sims',
      ),
      path: `/${guild}/${extension}/${season}/boss/0`,
      visible: hasPermission(Permission.MANAGE_RAID),
      capability: 'droptimizer' as const,
    },
    {
      icon: IconHeart,
      label: t('common:navigation.wishlist'),
      description: t('common:navigation.wishlist_desc', 'Manage your loot wishlist'),
      path: `/${guild}/${extension}/wishlist`,
      visible: hasPermission(Permission.VIEW_ROSTER),
    },
    {
      icon: IconShield,
      label: t('common:navigation.raid'),
      description: t('common:navigation.raid_desc', 'Raid events and signups'),
      path: `/${guild}/${extension}/raid`,
      visible: true,
    },
    {
      icon: IconMap,
      label: t('common:navigation.dungeons'),
      description: t('common:navigation.dungeons_desc', 'Mythic+ dungeon runs'),
      path: `/${guild}/${extension}/dungeons`,
      visible: true,
      capability: 'mythicPlus' as const,
    },
    {
      icon: IconKey,
      label: t('common:navigation.attunements'),
      description: t('common:navigation.attunements_desc'),
      path: `/${guild}/${extension}/attunements`,
      visible: hasPermission(Permission.VIEW_ROSTER),
      capability: 'attunements' as const,
    },
    {
      icon: IconClock,
      label: t('common:navigation.history'),
      description: t('common:navigation.history_desc', 'Activity log and history'),
      path: `/${guild}/${extension}/history`,
      visible: hasPermission(Permission.VIEW_ACTIVITY_LOG),
    },
    {
      icon: IconCalendarStats,
      label: t('common:navigation.attendance', 'Attendance'),
      description: t('common:navigation.attendance_desc', 'Player presence statistics'),
      path: `/${guild}/${extension}/attendance`,
      visible: hasPermission(Permission.MANAGE_SIGNUPS),
    },
    {
      icon: IconScale,
      label: t('common:navigation.loot_equity'),
      description: t('common:navigation.loot_equity_desc'),
      path: `/${guild}/${extension}/loot-equity`,
      visible: hasPermission(Permission.ASSIGN_LOOT) && isFeatureEnabled('loot-equity'),
    },
    {
      icon: IconFileImport,
      label: t('common:navigation.import', 'Import loots'),
      description: t('common:navigation.import_desc', 'Import loot data from RCLootCouncil'),
      path: `/${guild}/${extension}/import`,
      visible: hasPermission(Permission.IMPORT_SIMC),
    },
  ].filter((item) => item.visible);
  const megaItems = filterByCapability(visibleMegaItems, has);

  const megaLinks = megaItems.map((item) => (
    <UnstyledButton
      key={item.path}
      className={`${classes.subLink} ${isActive(item.path) ? classes.subLinkActive : ''}`}
      onClick={() => navigate(item.path)}
    >
      <Group wrap="nowrap" align="flex-start">
        <ThemeIcon size={34} variant="default" radius="md">
          <item.icon size={20} color="var(--mantine-color-brand-4)" />
        </ThemeIcon>
        <div>
          <Text className={classes.subLinkTitle}>{item.label}</Text>
          <Text className={classes.subLinkDesc}>{item.description}</Text>
        </div>
      </Group>
    </UnstyledButton>
  ));

  return (
    <Flex
      bg="app.8"
      style={{
        borderBottom: '1px solid #2f2f2f',
        padding: '8px 16px',
      }}
    >
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Group gap={0}>{import.meta.env.DEV && showNav && <ExtensionSelector />}</Group>

        <Group gap={0} justify="center">
          {showNav && (
            <>
              <Button
                variant="subtle"
                color={isActive(`/${guild}/${extension}/my-activity`) ? 'brand.5' : 'app.1'}
                onClick={() => navigate(`/${guild}/${extension}/my-activity`)}
              >
                {t('common:navigation.my_activity')}
              </Button>

              <Button
                variant="subtle"
                color={isActive(`/${guild}/${extension}/roster`) ? 'brand.5' : 'app.1'}
                onClick={() => navigate(`/${guild}/${extension}/roster`)}
              >
                {t('common:navigation.roster')}
              </Button>

              {megaItems.length > 0 && (
                <HoverCard
                  width={520}
                  position="bottom"
                  radius="md"
                  shadow="md"
                  withinPortal
                  openDelay={50}
                  closeDelay={100}
                >
                  <HoverCard.Target>
                    <button
                      type="button"
                      className={`${classes.megaLink} ${isMegaMenuActive() ? classes.megaLinkActive : ''}`}
                    >
                      <Center inline>
                        <Box component="span" mr={4}>
                          Features
                        </Box>
                        <IconChevronDown size={14} />
                      </Center>
                    </button>
                  </HoverCard.Target>

                  <HoverCard.Dropdown
                    bg="dark.8"
                    style={{ border: '1px solid var(--mantine-color-dark-5)' }}
                  >
                    <SimpleGrid cols={2} spacing={4}>
                      {megaLinks}
                    </SimpleGrid>
                  </HoverCard.Dropdown>
                </HoverCard>
              )}
            </>
          )}
        </Group>

        <Group justify="flex-end">
          <ContactUs />
          <CharacterSelector />
          <AuthProfile />
          <SettingsLink />
          <LanguageSwitcher />
        </Group>
      </Box>
    </Flex>
  );
}

function ExtensionSelector() {
  const { extension, season } = useRouteParams();
  const navigate = useNavigate();
  const location = useLocation();

  const switchTo = (newExtension: string, newSeason: string) => {
    localStorage.setItem(STORAGE_KEY_EXTENSION, newExtension);
    localStorage.setItem(STORAGE_KEY_SEASON, newSeason);

    const parts = location.pathname.split('/');
    const hasSeason = parts[3]?.startsWith('season-');

    if (hasSeason) {
      parts[2] = newExtension;
      parts[3] = newSeason;
    } else {
      parts[2] = newExtension;
    }

    navigate(parts.join('/'));
  };

  const displayName = (ext: string) => (ext === 'The-War-Within' ? 'The War Within' : ext);

  return (
    <Menu shadow="md" width={220} position="bottom-start">
      <Menu.Target>
        <Button
          variant="subtle"
          color="brand.5"
          rightSection={<IconChevronDown size={14} />}
          size="xs"
          styles={{ label: { fontWeight: 700 } }}
        >
          {displayName(extension)}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        {VALID_EXTENSIONS.map((ext, i) => {
          const seasons = EXTENSION_SEASONS[ext] ?? [];
          const isActiveExt = ext === extension;
          return (
            <React.Fragment key={ext}>
              {i > 0 && <Menu.Divider />}
              <Menu.Label>{displayName(ext)}</Menu.Label>
              {seasons.map((s) => {
                const isActiveSeason = isActiveExt && s === season;
                return (
                  <Menu.Item
                    key={`${ext}-${s}`}
                    onClick={() => switchTo(ext, s)}
                    bg={isActiveSeason ? 'var(--mantine-color-brand-9)' : undefined}
                    style={{ paddingLeft: 24 }}
                  >
                    {s}
                  </Menu.Item>
                );
              })}
            </React.Fragment>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

function CharacterSelector() {
  const { user, selectedCharacterId, setSelectedCharacter } = useAuth();
  const navigate = useNavigate();
  const { guild: currentGuild } = useRouteParams();
  const location = useLocation();
  const linkedCharacters = useMemo(() => user?.linkedCharacters || [], [user?.linkedCharacters]);

  useEffect(() => {
    if (!selectedCharacterId && linkedCharacters.length > 0) {
      setSelectedCharacter(linkedCharacters[0].id);
    }
  }, [linkedCharacters, selectedCharacterId, setSelectedCharacter]);

  if (linkedCharacters.length === 0) return null;

  if (linkedCharacters.length === 1) {
    return (
      <Text size="sm" c="dimmed" style={{ marginRight: 8 }}>
        {linkedCharacters[0].name}
      </Text>
    );
  }

  const handleChange = (value: string | null) => {
    if (!value) return;
    const charId = parseInt(value, 10);
    const selectedChar = linkedCharacters.find((c) => c.id === charId);

    if (selectedChar?.guildName && selectedChar.guildName !== currentGuild) {
      const currentPath = location.pathname;
      const pathParts = currentPath.split('/');
      if (pathParts.length >= 2 && pathParts[1] === currentGuild) {
        pathParts[1] = selectedChar.guildName;
        navigate(pathParts.join('/'));
      }
    }

    setSelectedCharacter(charId);
  };

  return (
    <Select
      value={selectedCharacterId?.toString()}
      onChange={handleChange}
      data={linkedCharacters.map((char) => ({
        value: char.id.toString(),
        label: char.name,
      }))}
      w={150}
      size="sm"
      allowDeselect={false}
    />
  );
}

function AuthProfile() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return (
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button
            variant="subtle"
            color="app.2"
            c="app.0"
            rightSection={<IconChevronDown size={14} />}
          >
            {user.battletag || t('common:user_fallback')}
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item leftSection={<IconUsers size={16} />} onClick={() => navigate('/sync')}>
            {t('common:navigation.sync_characters')}
          </Menu.Item>
          <Menu.Item leftSection={<IconLogout size={16} />} onClick={logout}>
            {t('common:navigation.logout')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return null;
}

function SettingsLink() {
  const navigate = useNavigate();
  const { guild, extension } = useRouteParams();
  const { hasPermission } = useRealmAccess();

  const canAccessSettings =
    hasPermission(Permission.MANAGE_REALM) || hasPermission(Permission.MANAGE_RAID);

  if (!canAccessSettings || !guild || !extension) {
    return null;
  }

  return (
    <Tooltip label="Settings">
      <ActionIcon
        variant="subtle"
        color="app.0"
        size="lg"
        onClick={() => navigate(`/${guild}/${extension}/settings`)}
      >
        <IconSettings size={22} />
      </ActionIcon>
    </Tooltip>
  );
}
