// Controller du flux iCal (SIMS-204) : gestion réservée au joueur connecté,
// flux servi en text/calendar sans cache partagé.
const getCalendarFeedStatus = vi.fn();
const regenerateCalendarFeed = vi.fn();
const revokeCalendarFeed = vi.fn();
const renderCalendarFeed = vi.fn();

vi.mock('../usecases', () => ({
  getCalendarFeedStatus: (...a: unknown[]) => getCalendarFeedStatus(...a),
  regenerateCalendarFeed: (...a: unknown[]) => regenerateCalendarFeed(...a),
  revokeCalendarFeed: (...a: unknown[]) => revokeCalendarFeed(...a),
  renderCalendarFeed: (...a: unknown[]) => renderCalendarFeed(...a),
}));

import * as controller from '../calendar_feed.controller';
import { calendarFeedFileParam } from '../calendar_feed.validation';

const { validateParams } = require('../../../shared/middleware/validate');

function res() {
  const r = {
    json: vi.fn(),
    status: vi.fn(),
    type: vi.fn(),
    set: vi.fn(),
    send: vi.fn(),
  };
  r.status.mockReturnValue(r);
  r.type.mockReturnValue(r);
  r.set.mockReturnValue(r);
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('calendar feed controller', () => {
  it.each([
    ['getStatus', controller.getStatus],
    ['regenerate', controller.regenerate],
    ['revoke', controller.revoke],
  ])('%s requires a logged in user', async (_name, handler) => {
    await expect(handler({} as never, res() as never)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('acts on the feed of the logged in user', async () => {
    regenerateCalendarFeed.mockResolvedValueOnce({ token: 't', createdAt: new Date() });
    const r = res();

    await controller.regenerate({ user: { id: 'u1' } } as never, r as never);

    expect(regenerateCalendarFeed).toHaveBeenCalledWith('u1');
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('serves the feed as a private text/calendar document', async () => {
    renderCalendarFeed.mockResolvedValueOnce('BEGIN:VCALENDAR\r\n');
    const file = `${'A'.repeat(43)}.ics`;
    const req = { params: { file } } as Record<string, unknown>;
    await new Promise<void>((resolve, reject) =>
      validateParams(calendarFeedFileParam)(req, {}, (err?: unknown) =>
        err ? reject(err) : resolve(),
      ),
    );
    const r = res();

    await controller.feed(req as never, r as never);

    expect(renderCalendarFeed).toHaveBeenCalledWith(file);
    expect(r.type).toHaveBeenCalledWith('text/calendar; charset=utf-8');
    expect(r.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Cache-Control': expect.stringContaining('private') }),
    );
    expect(r.send).toHaveBeenCalledWith('BEGIN:VCALENDAR\r\n');
  });
});
