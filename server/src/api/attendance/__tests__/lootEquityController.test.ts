// Tableau d'équité du loot (SIMS-201) : le royaume transmis au usecase est
// celui que checkPermission a vérifié, et la route est réservée aux officiers.

const getLootEquity = vi.fn();

vi.mock('../usecases', () => ({
  getLootEquity: (...a: unknown[]) => getLootEquity(...a),
}));

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { RequestHandler } from 'express';

import * as controller from '../attendance.controller';
import { attendanceQuery } from '../attendance.validation';

const { validateQuery } = require('../../../shared/middleware/validate');
const adminRole = require('../../../shared/config/permissions/role_admin.json');
const moderatorRole = require('../../../shared/config/permissions/role_moderator.json');
const memberRole = require('../../../shared/config/permissions/role_member.json');
const guestRole = require('../../../shared/config/permissions/role_guest.json');

async function validatedRequest(req: Record<string, unknown>, middleware: RequestHandler) {
  await new Promise<void>((resolve, reject) =>
    middleware(req as never, {} as never, (err?: unknown) => (err ? reject(err) : resolve())),
  );
  return req as never;
}

beforeEach(() => {
  getLootEquity.mockReset().mockResolvedValue({ players: [] });
});

describe('GET /1/attendance/loot-equity', () => {
  it('passes the checked realm and the validated period to the use case', async () => {
    const json = vi.fn();
    const req = await validatedRequest(
      {
        realmId: 3,
        realmRole: 'moderator',
        query: { realmId: '3', startDate: '2026-05-01', endDate: '2026-05-31' },
      },
      validateQuery(attendanceQuery),
    );
    await controller.getLootEquity(req, { json } as never);

    expect(getLootEquity).toHaveBeenCalledWith({
      realmId: 3,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
      includeOptional: false,
    });
    expect(json).toHaveBeenCalledWith({ players: [] });
  });

  it('refuses (500) a realm set by injectRealmId alone, without checkPermission', async () => {
    const req = await validatedRequest(
      { realmId: 9, query: { realmId: '9' } },
      validateQuery(attendanceQuery),
    );
    await expect(controller.getLootEquity(req, { json: vi.fn() } as never)).rejects.toMatchObject({
      statusCode: 500,
      code: 'unchecked_realm',
    });
    expect(getLootEquity).not.toHaveBeenCalled();
  });
});

describe('loot equity route permission', () => {
  it('is guarded by ASSIGN_LOOT', async () => {
    const inventoryUrl = pathToFileURL(
      path.resolve(__dirname, '../../../../../scripts/route-inventory.mjs'),
    ).href;
    const { parseRoutes } = (await import(inventoryUrl)) as {
      parseRoutes: (src: string) => { method: string; path: string; permission: string | null }[];
    };
    const routes = parseRoutes(
      fs.readFileSync(path.resolve(__dirname, '../attendance.routes.ts'), 'utf8'),
    );

    expect(routes.find((r) => r.path === '/loot-equity')).toMatchObject({
      method: 'GET',
      permission: 'ASSIGN_LOOT',
    });
  });

  it('is granted to officers only, not to members nor guests', () => {
    expect(adminRole.assign_loot).toBe(true);
    expect(moderatorRole.assign_loot).toBe(true);
    expect(memberRole.assign_loot).toBe(false);
    expect(guestRole.assign_loot).toBe(false);
  });
});
