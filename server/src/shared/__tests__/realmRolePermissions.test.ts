import { Permission } from '../config/permissions/permissions';
import { roleHasPermission } from '../realmRolePermissions';

describe('roleHasPermission', () => {
  it('grants EDIT_ROSTER to the realm staff', () => {
    expect(roleHasPermission('owner', Permission.EDIT_ROSTER)).toBe(true);
    expect(roleHasPermission('admin', Permission.EDIT_ROSTER)).toBe(true);
  });

  it('grants EDIT_ROSTER to a moderator, so an officer is never in self-edit', () => {
    expect(roleHasPermission('moderator', Permission.EDIT_ROSTER)).toBe(true);
  });

  it('does not grant EDIT_ROSTER to a member or a guest', () => {
    expect(roleHasPermission('member', Permission.EDIT_ROSTER)).toBe(false);
    expect(roleHasPermission('guest', Permission.EDIT_ROSTER)).toBe(false);
  });

  it('grants nothing to a missing or unknown role', () => {
    expect(roleHasPermission(undefined, Permission.EDIT_ROSTER)).toBe(false);
    expect(roleHasPermission('stranger', Permission.EDIT_ROSTER)).toBe(false);
  });
});
