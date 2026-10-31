import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const DiscordOAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get('discord_success') === '1' ? 'success' : 'error';
    const discordTag = searchParams.get('discord_tag') || '';

    const bc = new BroadcastChannel('discord_oauth');
    bc.postMessage({ type: 'discord_oauth', status, discordTag });
    bc.close();

    setTimeout(() => window.close(), 100);
  }, []);

  return null;
};

export default DiscordOAuthCallbackPage;
