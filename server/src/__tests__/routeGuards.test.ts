/**
 * Invariant : toute route de l'API a un garde (checkPermission, requireUser,
 * requireBearer, clerkAuth — sur la route, le routeur ou le montage), ou figure dans
 * routeGuards.exceptions.ts avec une raison.
 *
 * Méthode : inventaire STATIQUE (scripts/route-inventory.mjs), qui lit app.js et les
 * fichiers *.routes.* sans les importer — app.js lance des connexions au chargement
 * et les routes .ts ne se chargent pas sous vitest. Les gardes sont reconnus par
 * leur nom dans les arguments de router.<verbe>(…) / router.use(…) / app.use(…),
 * pas par le nom des fonctions à l'exécution (checkPermission renvoie une closure).
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROUTE_GUARD_EXCEPTIONS } from './routeGuards.exceptions';

type Route = { method: string; path: string; fullPath: string; guards: string[] };
type Group = { module: string; routes: Route[] };
type Inventory = {
  inventory: () => Group[];
  parseRoutes: (src: string) => Route[];
};

// Module ES hors de server/ : chargé dynamiquement (ce test est compilé en CommonJS).
const INVENTORY_URL = pathToFileURL(
  path.resolve(__dirname, '../../../scripts/route-inventory.mjs'),
).href;

let parseRoutes: Inventory['parseRoutes'];
let groups: Group[] = [];
let all: (Route & { module: string })[] = [];

beforeAll(async () => {
  const mod = (await import(INVENTORY_URL)) as Inventory;
  parseRoutes = mod.parseRoutes;
  groups = mod.inventory();
  all = groups.flatMap((g) => g.routes.map((r) => ({ ...r, module: g.module })));
});

const key = (r: Route) => `${r.method} ${r.fullPath}`;

describe('gardes des routes', () => {
  it('l’inventaire voit les routes de l’API', () => {
    expect(all.length).toBeGreaterThan(100);
    expect(groups.some((g) => g.module === 'dataUpdater')).toBe(true);
  });

  it('toute route sans garde figure dans les exceptions, avec une raison', () => {
    const missing = all
      .filter((r) => r.guards.length === 0 && !ROUTE_GUARD_EXCEPTIONS[key(r)])
      .map((r) => `${key(r)}  (module ${r.module})`);
    expect(
      missing,
      'Route sans garde : ajouter checkPermission / requireUser, ou une exception motivée',
    ).toEqual([]);
    for (const reason of Object.values(ROUTE_GUARD_EXCEPTIONS)) {
      expect(reason.trim().length).toBeGreaterThan(10);
    }
  });

  it('aucune exception périmée : chaque exception désigne une route existante et sans garde', () => {
    const open = new Set(all.filter((r) => r.guards.length === 0).map(key));
    const stale = Object.keys(ROUTE_GUARD_EXCEPTIONS).filter((k) => !open.has(k));
    expect(stale, 'Route protégée ou supprimée : retirer sa ligne des exceptions').toEqual([]);
  });
});

describe('détection des gardes (parseRoutes)', () => {
  it('signale une route sans garde', () => {
    const [route] = parseRoutes("router.post('/danger', validateBody(schema), controller.wipe);");
    expect(route).toMatchObject({ method: 'POST', path: '/danger', guards: [] });
  });

  it('reconnaît checkPermission, requireUser et requireBearer sur la route', () => {
    const routes = parseRoutes(`
      router.delete('/a', checkPermission(Permission.EDIT_ROSTER), controller.a);
      router.get('/b', requireUser, controller.b);
      router.post(
        '/c',
        requireBearer,
        controller.c,
      );
    `);
    expect(routes.map((r: Route) => r.guards)).toEqual([
      ['checkPermission(EDIT_ROSTER)'],
      ['requireUser'],
      ['requireBearer'],
    ]);
  });

  it('applique router.use(garde) aux routes déclarées après seulement', () => {
    const routes = parseRoutes(`
      router.get('/public', controller.pub);
      router.use(clerkAuth);
      router.get('/private', controller.priv);
    `);
    expect(routes.map((r: Route) => r.guards)).toEqual([[], ['clerkAuth']]);
  });

  it('ne se laisse pas tromper par un nom de garde dans une chaîne ou un commentaire voisin', () => {
    const routes = parseRoutes(`
      router.get('/x', controller.x); // requireUser à ajouter
      router.get('/y', controller.y);
    `);
    expect(routes.map((r: Route) => r.guards)).toEqual([[], []]);
  });
});
