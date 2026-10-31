// Garde des routes appelées par l'application et par le bot (SIMS-151).
const requireUserOrInternal = require('../middleware/requireUserOrInternal');

const TOKEN = 'bot-token-de-test-123';

function run(req: Record<string, unknown>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const next = vi.fn();
  requireUserOrInternal({ headers: {}, ...req }, res, next);
  return { res, next };
}

describe('requireUserOrInternal', () => {
  const previous = process.env.DISCORD_BOT_TOKEN;
  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = TOKEN;
  });
  afterAll(() => {
    process.env.DISCORD_BOT_TOKEN = previous;
  });

  it('laisse passer un utilisateur authentifié (session ou bearer)', () => {
    const { next, res } = run({ user: { id: '42' } });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('laisse passer le bot avec le bon jeton interne', () => {
    const req = { headers: { 'x-internal-token': TOKEN } };
    const { next } = run(req);
    expect(next).toHaveBeenCalled();
  });

  it.each([
    ['anonyme', {}],
    ['mauvais jeton', { headers: { 'x-internal-token': 'faux' } }],
    [
      'jeton de même longueur mais différent',
      { headers: { 'x-internal-token': 'bot-token-de-test-999' } },
    ],
    ['jeton vide', { headers: { 'x-internal-token': '' } }],
    ['utilisateur sans id', { user: {} }],
  ])('refuse : %s (401)', (_label, req) => {
    const { next, res } = run(req as Record<string, unknown>);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('refuse tout jeton si DISCORD_BOT_TOKEN n’est pas configuré', () => {
    delete process.env.DISCORD_BOT_TOKEN;
    const { next, res } = run({ headers: { 'x-internal-token': 'undefined' } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
