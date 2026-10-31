import { readFileSync } from 'node:fs';
import path from 'node:path';

// data.js (chargé par checkPermission) quitte le processus sans DATABASE_URL.
// Aucune connexion n'est ouverte : un anonyme est refusé avant toute requête SQL.
vi.hoisted(() => {
  process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test';
});

const deleteUpgradesByRealm = vi.fn();

vi.mock('../item_upgrade.repository', () => ({
  default: {
    deleteUpgradesByRealm: (...a: unknown[]) => deleteUpgradesByRealm(...a),
  },
}));

import { Permission } from '../../../shared/config/permissions/permissions';
import { clearRealmUpgrades } from '../usecases/clearRealmUpgrades';

beforeEach(() => {
  deleteUpgradesByRealm.mockReset().mockResolvedValue(3);
});

describe('clearRealmUpgrades', () => {
  it('ne supprime que le royaume demandé et renvoie le nombre de lignes', async () => {
    await expect(clearRealmUpgrades(7)).resolves.toEqual({ deleted: 3 });
    expect(deleteUpgradesByRealm).toHaveBeenCalledTimes(1);
    expect(deleteUpgradesByRealm).toHaveBeenCalledWith(7);
  });
});

describe('DELETE /1/upgrade — contrôle d’accès', () => {
  it('est déclarée derrière checkPermission(EDIT_ROSTER) avec un realmId obligatoire', () => {
    // Le fichier de routes charge des modules .ts par require : il ne s'importe pas
    // sous vitest. On vérifie donc sa déclaration, et le middleware ci-dessous.
    const source = readFileSync(path.join(__dirname, '..', 'item_upgrade.routes.ts'), 'utf8');
    expect(source).toMatch(
      /router\.delete\(\s*'\/',\s*checkPermission\(Permission\.EDIT_ROSTER\),\s*validateQuery\(realmRequiredQuery\),\s*controller\.clearRealm,?\s*\)/,
    );
  });

  it('checkPermission refuse un anonyme (401) sans appeler la suite', async () => {
    const checkPermission = require('../../../middleware/checkPermission');
    const middleware = checkPermission(Permission.EDIT_ROSTER);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await middleware({ query: { realmId: '7' }, headers: {}, params: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(deleteUpgradesByRealm).not.toHaveBeenCalled();
  });
});
