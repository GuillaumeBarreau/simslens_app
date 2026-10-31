import { completeDiscordLink, startDiscordLink } from '../usecases/linkDiscord';

const findCharacterById = vi.fn();
const updateCharacterById = vi.fn();
const fetchMock = vi.fn();

vi.mock('../../character/character.repository', () => ({
  default: {
    findCharacterById: (...a: unknown[]) => findCharacterById(...a),
    updateCharacterById: (...a: unknown[]) => updateCharacterById(...a),
  },
}));
vi.mock('../../../shared/config', () => ({
  default: {
    discord: { clientId: 'client', clientSecret: 'secret' },
    urls: { server: 'https://api.test' },
  },
}));

const response = (ok: boolean, body: unknown) => ({
  ok,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', fetchMock);
  findCharacterById.mockReset().mockResolvedValue({ id: 5, userId: 'u1' });
  updateCharacterById.mockReset().mockResolvedValue(undefined);
  fetchMock
    .mockReset()
    .mockResolvedValueOnce(response(true, { access_token: 'tok' }))
    .mockResolvedValueOnce(response(true, { username: 'arthas' }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('startDiscordLink (SIMS-187)', () => {
  it('builds the Discord authorize URL for an own character', async () => {
    const result = await startDiscordLink('u1', 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.authorizeUrl).toContain('https://discord.com/oauth2/authorize?');
      expect(result.authorizeUrl).toContain('client_id=client');
      expect(result.link).toMatchObject({ characterId: 5, userId: 'u1' });
      expect(result.link.state).toMatch(/^[0-9a-f]{64}$/);
      expect(result.authorizeUrl).toContain(`state=${result.link.state}`);
    }
  });

  it("refuses another player's character", async () => {
    findCharacterById.mockResolvedValueOnce({ id: 5, userId: 'u2' });
    await expect(startDiscordLink('u1', 5)).resolves.toEqual({
      ok: false,
      error: 'invalid_request',
    });
  });

  it('refuses a character without owner or unknown, the same way', async () => {
    findCharacterById.mockResolvedValueOnce({ id: 5, userId: null });
    await expect(startDiscordLink('u1', 5)).resolves.toMatchObject({ error: 'invalid_request' });
    findCharacterById.mockResolvedValueOnce(null);
    await expect(startDiscordLink('u1', 5)).resolves.toMatchObject({ error: 'invalid_request' });
  });
});

describe('completeDiscordLink (SIMS-187)', () => {
  const link = { characterId: 5, userId: 'u1', state: 'a'.repeat(64) };
  const callback = { code: 'code', state: 'a'.repeat(64), sessionUserId: 'u1' };

  it.each([
    ['a forged state', { ...callback, state: 'b'.repeat(64) }, link],
    ['a state of another length', { ...callback, state: 'a' }, link],
    ['a session without state', callback, { ...link, state: '' }],
    ['another signed-in player', { ...callback, sessionUserId: 'u2' }, link],
    ['no signed-in player', { ...callback, sessionUserId: undefined }, link],
  ])('refuses %s, before calling Discord or writing (CSRF)', async (_label, cb, lnk) => {
    await expect(completeDiscordLink(cb, lnk)).resolves.toMatchObject({
      error: 'invalid_request',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(findCharacterById).not.toHaveBeenCalled();
    expect(updateCharacterById).not.toHaveBeenCalled();
  });

  it('stores the Discord username on the own character', async () => {
    await expect(completeDiscordLink(callback, link)).resolves.toEqual({
      ok: true,
      discordTag: 'arthas',
    });
    expect(updateCharacterById).toHaveBeenCalledWith(5, { discordTag: 'arthas' });
  });

  it('re-checks ownership on return, before calling Discord or writing', async () => {
    findCharacterById.mockResolvedValueOnce({ id: 5, userId: 'u2' });
    await expect(completeDiscordLink(callback, link)).resolves.toMatchObject({
      error: 'invalid_request',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateCharacterById).not.toHaveBeenCalled();
  });

  it('reports a failed token exchange without writing', async () => {
    fetchMock.mockReset().mockResolvedValueOnce(response(false, { error: 'invalid_grant' }));
    await expect(completeDiscordLink(callback, link)).resolves.toMatchObject({
      error: 'token_exchange',
    });
    expect(updateCharacterById).not.toHaveBeenCalled();
  });
});
