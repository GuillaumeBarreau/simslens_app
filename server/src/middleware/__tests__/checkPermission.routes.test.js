import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Contournements du contrôle de royaume rejoués sur les vrais routeurs
 * (SIMS-173). Chaque requête doit être refusée par checkPermission, avant
 * tout handler. Voir helpers/realmScenarios.cjs.
 */
const SERVER = path.resolve(__dirname, '../../..');
const WISHLIST_BODY = { itemId: 1, priority: 1, specializationId: 62 };

const SCENARIOS = [
  // Personnage de la guilde 2, avec ?realmId=1 (la guilde de l'utilisateur).
  {
    method: 'PUT',
    path: '/1/characters/5/wishlist/HEAD?realmId=1',
    body: WISHLIST_BODY,
    expected: [403],
  },
  {
    method: 'PUT',
    path: '/1/Characters/5/wishlist/HEAD?realmId=1',
    body: WISHLIST_BODY,
    expected: [403],
  },
  {
    method: 'PUT',
    path: '/1/CHARACTERS/5/talents?realmId=1',
    body: { specializationId: 62, selectedNodes: {} },
    expected: [403],
  },
  { method: 'DELETE', path: '/1/Character/5?realmId=1', expected: [403] },
  { method: 'GET', path: '/1/attendance/character/5?realmId=1', expected: [403] },
  // Identifiants ambigus.
  {
    method: 'PUT',
    path: '/1/characters/1e1/wishlist/HEAD',
    body: WISHLIST_BODY,
    expected: [400, 'invalid_id'],
  },
  {
    method: 'PUT',
    path: '/1/Characters/1e1/wishlist/HEAD',
    body: WISHLIST_BODY,
    expected: [400, 'invalid_id'],
  },
  { method: 'DELETE', path: '/1/character/1e1', expected: [400, 'invalid_id'] },
  { method: 'GET', path: '/1/characters/5/wishlist?realmId=1e0', expected: [400, 'invalid_id'] },
  // Royaume de la query contredisant celui de la route.
  {
    method: 'POST',
    path: '/1/realms/2/invites?realmId=1',
    body: {},
    expected: [400, 'realm_conflict'],
  },
  { method: 'GET', path: '/1/realms/2/invites?realmId=1', expected: [400, 'realm_conflict'] },
  { method: 'GET', path: '/1/realms/2/guest-members?realmId=1', expected: [400, 'realm_conflict'] },
];

describe('checkPermission sur les vrais routeurs (SIMS-173)', () => {
  const run = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      path.join(__dirname, 'helpers', 'realmScenarios.cjs'),
      JSON.stringify(SCENARIOS.map(({ method, path: p, body }) => ({ method, path: p, body }))),
    ],
    { cwd: SERVER, encoding: 'utf8', timeout: 90_000, env: process.env },
  );
  const lastLine = (run.stdout || '').trim().split('\n').pop() || '[]';
  let results;
  try {
    results = JSON.parse(lastLine);
  } catch {
    throw new Error(`Sortie illisible :\n${run.stdout}\n${run.stderr}`);
  }

  it('rejoue tous les scénarios', () => {
    expect(results).toHaveLength(SCENARIOS.length);
  });

  it.each(SCENARIOS.map((s, i) => [`${s.method} ${s.path}`, i]))('%s est refusé', (_label, i) => {
    const [status, code] = SCENARIOS[i].expected;
    expect(results[i].status).toBe(status);
    if (code) expect(results[i].body).toEqual({ error: code });
  });
});
