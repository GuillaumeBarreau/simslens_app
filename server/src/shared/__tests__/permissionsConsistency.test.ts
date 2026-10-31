/**
 * Cohérence des permissions (SIMS-249) : l'enum `Permission`, les quatre
 * fichiers de rôle et la copie front (`app/src/types/permissions.ts`, produite
 * par `npm run sync:permissions`) doivent décrire exactement le même ensemble.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Permission } from '../config/permissions/permissions';
import adminRole from '../config/permissions/role_admin.json';
import guestRole from '../config/permissions/role_guest.json';
import memberRole from '../config/permissions/role_member.json';
import moderatorRole from '../config/permissions/role_moderator.json';

const ROLES: [string, Record<string, unknown>][] = [
  ['role_admin.json', adminRole],
  ['role_moderator.json', moderatorRole],
  ['role_member.json', memberRole],
  ['role_guest.json', guestRole],
];

const ENUM_VALUES: string[] = Object.values(Permission);

const SERVER_ENUM_FILE = path.resolve(__dirname, '../config/permissions/permissions.ts');
const APP_ENUM_FILE = path.resolve(__dirname, '../../../../app/src/types/permissions.ts');

const enumValuesIn = (source: string) =>
  [...source.matchAll(/^\s*[A-Z_]+\s*=\s*'([a-z_]+)'/gm)].map((m) => m[1]);

describe('Permission enum and role files', () => {
  it('has no duplicate value in the enum', () => {
    expect(new Set(ENUM_VALUES).size).toBe(ENUM_VALUES.length);
  });

  it.each(ROLES)('%s only declares permissions of the enum', (_file, role) => {
    const unknown = Object.keys(role).filter((key) => !ENUM_VALUES.includes(key));
    expect(unknown).toEqual([]);
  });

  it.each(ROLES)('%s sets every permission of the enum explicitly', (_file, role) => {
    const missing = ENUM_VALUES.filter((value) => typeof role[value] !== 'boolean');
    expect(missing).toEqual([]);
  });
});

describe('front copy of the Permission enum', () => {
  const read = (file: string) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const serverSource = read(SERVER_ENUM_FILE);
  const appSource = read(APP_ENUM_FILE);

  it('declares the same values as the server enum', () => {
    expect(enumValuesIn(appSource)).toEqual(ENUM_VALUES);
    expect(enumValuesIn(serverSource)).toEqual(ENUM_VALUES);
  });

  it('is up to date with npm run sync:permissions', () => {
    expect(appSource.endsWith(serverSource)).toBe(true);
  });
});
