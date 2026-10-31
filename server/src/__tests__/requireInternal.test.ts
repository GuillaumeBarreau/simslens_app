// Garde des routes réservées au bot Discord (SIMS-153).
const requireInternal = require('../middleware/requireInternal');

const TOKEN = 'bot-token-de-test-123';

function run(req: Record<string, unknown>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const next = vi.fn();
  requireInternal({ headers: {}, ...req }, res, next);
  return { res, next };
}

describe('requireInternal', () => {
  const previous = process.env.DISCORD_BOT_TOKEN;
  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = TOKEN;
  });
  afterAll(() => {
    process.env.DISCORD_BOT_TOKEN = previous;
  });

  it('laisse passer le bot avec le bon jeton', () => {
    expect(run({ headers: { 'x-internal-token': TOKEN } }).next).toHaveBeenCalled();
  });

  it('refuse un utilisateur connecté sans jeton : la session ne suffit pas (403)', () => {
    const { next, res } = run({ user: { id: '42' } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it.each([
    ['anonyme', {}],
    ['mauvais jeton', { headers: { 'x-internal-token': 'faux' } }],
  ])('refuse : %s (403)', (_label, req) => {
    const { next, res } = run(req as Record<string, unknown>);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
