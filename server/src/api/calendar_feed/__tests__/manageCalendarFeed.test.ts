// Gestion du flux iCal par le joueur : état, régénération, révocation (SIMS-204).
import { hashFeedToken } from '../calendar_feed.token';
import {
  getCalendarFeedStatus,
  regenerateCalendarFeed,
  revokeCalendarFeed,
} from '../usecases/manageCalendarFeed';

const findByUserId = vi.fn();
const upsertForUser = vi.fn();
const deleteForUser = vi.fn();

vi.mock('../calendar_feed.repository', () => ({
  default: {
    findByUserId: (...a: unknown[]) => findByUserId(...a),
    upsertForUser: (...a: unknown[]) => upsertForUser(...a),
    deleteForUser: (...a: unknown[]) => deleteForUser(...a),
  },
}));

const createdAt = new Date('2026-02-01T10:00:00Z');

beforeEach(() => {
  findByUserId.mockReset().mockResolvedValue(null);
  upsertForUser.mockReset().mockResolvedValue({ id: 1, userId: 'u1', createdAt });
  deleteForUser.mockReset().mockResolvedValue(1);
});

describe('getCalendarFeedStatus', () => {
  it('is inactive without any token', async () => {
    await expect(getCalendarFeedStatus('u1')).resolves.toEqual({
      active: false,
      createdAt: null,
      lastUsedAt: null,
    });
  });

  it('describes the active feed, without exposing its hash', async () => {
    const lastUsedAt = new Date('2026-02-02T10:00:00Z');
    findByUserId.mockResolvedValueOnce({ id: 1, tokenHash: 'secret', createdAt, lastUsedAt });

    const status = await getCalendarFeedStatus('u1');

    expect(status).toEqual({ active: true, createdAt, lastUsedAt });
    expect(JSON.stringify(status)).not.toContain('secret');
    expect(findByUserId).toHaveBeenCalledWith('u1');
  });
});

describe('regenerateCalendarFeed', () => {
  it('returns a fresh token and only stores its hash', async () => {
    const { token, createdAt: at } = await regenerateCalendarFeed('u1');

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(at).toBe(createdAt);
    expect(upsertForUser).toHaveBeenCalledWith('u1', hashFeedToken(token));
    expect(upsertForUser.mock.calls[0]).not.toContain(token);
  });

  it('gives a different token each time (the previous URL stops working)', async () => {
    const first = await regenerateCalendarFeed('u1');
    const second = await regenerateCalendarFeed('u1');

    expect(first.token).not.toBe(second.token);
    expect(upsertForUser.mock.calls[0][1]).not.toBe(upsertForUser.mock.calls[1][1]);
  });
});

describe('revokeCalendarFeed', () => {
  it('deletes the token of the player', async () => {
    await expect(revokeCalendarFeed('u1')).resolves.toEqual({
      active: false,
      createdAt: null,
      lastUsedAt: null,
    });
    expect(deleteForUser).toHaveBeenCalledWith('u1');
  });

  it('is idempotent when no feed exists', async () => {
    deleteForUser.mockResolvedValueOnce(0);
    await expect(revokeCalendarFeed('u1')).resolves.toMatchObject({ active: false });
  });
});
