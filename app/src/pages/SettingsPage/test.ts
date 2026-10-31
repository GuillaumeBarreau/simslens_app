import enDiscord from 'locales/en/discordSettings.json';
import enPermissions from 'locales/en/permissionsSettings.json';
import enValidation from 'locales/en/validationSettings.json';
import frDiscord from 'locales/fr/discordSettings.json';
import frPermissions from 'locales/fr/permissionsSettings.json';
import frValidation from 'locales/fr/validationSettings.json';
import { Permission } from 'types/permissions';

import { isPermissionGranted, PERMISSION_GROUPS } from './permissionsPresentation';

const ALL_PERMISSIONS = Object.values(Permission);
const groupedPermissions = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.permission));

describe('PERMISSION_GROUPS', () => {
  it('shows every permission exactly once', () => {
    expect([...groupedPermissions].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it('gives every group and every permission an icon', () => {
    for (const group of PERMISSION_GROUPS) {
      expect(group.icon).toBeTruthy();
      for (const { icon } of group.permissions) expect(icon).toBeTruthy();
    }
  });

  it.each([
    ['fr', frPermissions],
    ['en', enPermissions],
  ])('has a %s title and description for every group and permission', (_lang, locale) => {
    const categories = locale.categories as Record<string, string>;
    const titles = locale.permissions as Record<string, string>;
    const descriptions = locale.permission_descriptions as Record<string, string>;
    for (const group of PERMISSION_GROUPS) expect(categories[group.key]).toBeTruthy();
    for (const permission of ALL_PERMISSIONS) {
      expect(titles[permission]).toBeTruthy();
      expect(descriptions[permission]).toBeTruthy();
    }
    expect(locale.roles.admin).toBeTruthy();
    expect(locale.roles.member).toBeTruthy();
    expect(locale.read_only).toBeTruthy();
  });
});

describe('isPermissionGranted', () => {
  it('grants only what the role config explicitly allows', () => {
    const role = { [Permission.VIEW_ROSTER]: true, [Permission.EDIT_ROSTER]: false };
    expect(isPermissionGranted(role, Permission.VIEW_ROSTER)).toBe(true);
    expect(isPermissionGranted(role, Permission.EDIT_ROSTER)).toBe(false);
    expect(isPermissionGranted(role, Permission.MANAGE_REALM)).toBe(false);
  });
});

describe('settings texts added by SIMS-247', () => {
  const BUFFS = [
    'bloodlust',
    'arcaneIntellect',
    'fortitude',
    'battleShout',
    'mysticTouch',
    'chaosBrand',
    'skyfury',
    'markOfTheWild',
    'huntersMark',
    'powerInfusion',
  ];

  it.each([
    ['fr', frValidation, frDiscord],
    ['en', enValidation, enDiscord],
  ])('exist in %s', (_lang, validation, discord) => {
    const providers = validation.raid_buffs.providers as Record<string, string>;
    for (const buff of BUFFS) expect(providers[buff]).toBeTruthy();
    expect(validation.simulation_title).toBeTruthy();
    expect(validation.fight_length.description).toBeTruthy();
    expect(validation.enemy_count.description).toBeTruthy();
    expect(discord.sections.connection).toBeTruthy();
    expect(discord.sections.signups).toBeTruthy();
    expect(discord.invite_bot_row.label).toBeTruthy();
    expect(discord.invite_bot_row.description).toBeTruthy();
  });
});
