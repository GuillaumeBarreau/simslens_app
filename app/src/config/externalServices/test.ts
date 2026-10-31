import { buildDiscordBotInviteUrl } from '.';

describe('buildDiscordBotInviteUrl', () => {
  it('builds the OAuth invite link from the client id', () => {
    expect(buildDiscordBotInviteUrl(' 123456 ')).toBe(
      'https://discord.com/oauth2/authorize?client_id=123456',
    );
  });

  it('hides the invite link when no client id is configured', () => {
    expect(buildDiscordBotInviteUrl('')).toBeNull();
    expect(buildDiscordBotInviteUrl(undefined)).toBeNull();
  });
});
