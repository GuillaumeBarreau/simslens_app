import { Badge, Group, Menu, UnstyledButton } from '@mantine/core';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { realmHomePath } from 'components/RequireRealm/realmPath';
import { isFeatureEnabled } from 'config/featureFlags';
import { type GameId, GAMES } from 'config/games';
import { useAuth } from 'contexts';
import { useFetchRealmList, useUserRealm } from 'hooks/queries';
import { useGame } from 'hooks/useGame';
import { useRouteParams } from 'hooks/useRouteParams';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  collectUserGuilds,
  readLastGuild,
  rememberLastGuild,
  resolveGameDestination,
  type UserGuild,
} from './gameDestination';
import { SimsLensLogo } from './SimsLensLogo';

/** Couleur d'accent de chaque jeu, prise dans les palettes du thème Mantine. */
const GAME_ACCENT: Record<GameId, string> = {
  retail: 'brand',
  forever: 'orange',
};

const GAME_ORDER: GameId[] = ['retail', 'forever'];

const accentVar = (game: GameId) => `var(--mantine-color-${GAME_ACCENT[game]}-5)`;

/**
 * Logo SimsLens et sélecteur de jeu (Retail / Forever) en haut à gauche de l'en-tête.
 * Sans le flag `forever`, le logo seul ramène à l'accueil de la guilde courante.
 */
export function GameSwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { game } = useGame();
  const { guild } = useRouteParams();
  const { user } = useAuth();
  const { data: checkedRealm } = useUserRealm(user?.id ? String(user.id) : null, {
    enabled: !!user,
  });
  const fetchRealmList = useFetchRealmList();
  const foreverEnabled = isFeatureEnabled('forever');

  useEffect(() => {
    if (guild) rememberLastGuild(game, guild);
  }, [game, guild]);

  const gameLabel = (id: GameId) => t(`common:${GAMES[id].labelKey}`);
  const homePath = guild ? realmHomePath(guild, game) : '/';

  if (!foreverEnabled) {
    return (
      <UnstyledButton
        onClick={() => navigate(homePath)}
        aria-label={t('common:game_switcher.home')}
        px={4}
      >
        <SimsLensLogo color={accentVar(game)} />
      </UnstyledButton>
    );
  }

  const selectGame = async (target: GameId) => {
    let userGuilds: UserGuild[] | null = null;
    try {
      userGuilds = collectUserGuilds(user, await fetchRealmList(), checkedRealm);
    } catch {
      // Liste indisponible : on s'en tient à la guilde mémorisée.
      userGuilds = null;
    }
    navigate(resolveGameDestination(target, readLastGuild(target), userGuilds));
  };

  return (
    <Menu shadow="md" width={220} position="bottom-start">
      <Menu.Target>
        <UnstyledButton
          aria-label={t('common:game_switcher.label', { game: gameLabel(game) })}
          px={4}
        >
          <Group gap={8} wrap="nowrap">
            <SimsLensLogo color={accentVar(game)} />
            <Badge color={GAME_ACCENT[game]} variant="light" size="sm">
              {gameLabel(game)}
            </Badge>
            <IconChevronDown size={14} aria-hidden="true" />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{t('common:game_switcher.title')}</Menu.Label>
        {GAME_ORDER.map((id) => (
          <Menu.Item
            key={id}
            onClick={() => {
              void selectGame(id);
            }}
            aria-current={id === game ? 'true' : undefined}
            leftSection={
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: accentVar(id),
                }}
              />
            }
            rightSection={id === game ? <IconCheck size={14} aria-hidden="true" /> : undefined}
          >
            {gameLabel(id)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
