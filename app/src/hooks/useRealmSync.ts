import { useAuth } from 'contexts';
import { useEffect } from 'react';

import { useRouteParams } from './useRouteParams';

/**
 * Hook to automatically sync the selected character when navigating to a realm
 * This ensures that the lastVisitedRealm is always up to date
 */
export function useRealmSync() {
  const { user, setSelectedCharacter, selectedCharacterId } = useAuth();
  const { guild } = useRouteParams();

  useEffect(() => {
    if (!user?.linkedCharacters || !guild) return;

    if (selectedCharacterId) {
      const currentSelectedChar = user.linkedCharacters.find((c) => c.id === selectedCharacterId);
      if (currentSelectedChar?.guildName === guild) {
        return;
      }
    }

    const matchingChar = user.linkedCharacters.find((char) => char.guildName === guild);

    if (matchingChar) {
      setSelectedCharacter(matchingChar.id);
    }
  }, [guild, user?.linkedCharacters, setSelectedCharacter, selectedCharacterId]);
}
