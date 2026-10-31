import {
  type Icon,
  IconActivity,
  IconBuildingCastle,
  IconCalendar,
  IconCalendarCheck,
  IconCalendarCog,
  IconCalendarPlus,
  IconCalendarX,
  IconClipboardList,
  IconDoorEnter,
  IconFileImport,
  IconGift,
  IconHistory,
  IconListCheck,
  IconListDetails,
  IconPencil,
  IconRefresh,
  IconSettings,
  IconStar,
  IconSwords,
  IconTrash,
  IconTrashX,
  IconUpload,
  IconUserEdit,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { Permission } from 'types/permissions';

/**
 * Présentation des permissions dans les réglages (SIMS-247) : regroupement par
 * domaine et icône de chaque permission. Purement visuel — les permissions
 * elles-mêmes viennent de `types/permissions` (fichier généré, non modifié).
 * Titres et descriptions : `permissionsSettings` → `categories.*`,
 * `category_descriptions.*`, `permissions.*` et `permission_descriptions.*`.
 */
export interface PermissionGroup {
  key: string;
  icon: Icon;
  permissions: { permission: Permission; icon: Icon }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'realm_management',
    icon: IconBuildingCastle,
    permissions: [
      { permission: Permission.MANAGE_REALM, icon: IconSettings },
      { permission: Permission.DELETE_REALM, icon: IconTrash },
    ],
  },
  {
    key: 'roster_management',
    icon: IconUsers,
    permissions: [
      { permission: Permission.VIEW_ROSTER, icon: IconUsers },
      { permission: Permission.EDIT_ROSTER, icon: IconUserEdit },
      { permission: Permission.SYNC_CHARACTERS, icon: IconRefresh },
    ],
  },
  {
    key: 'raid_management',
    icon: IconSwords,
    permissions: [
      { permission: Permission.MANAGE_RAID, icon: IconSwords },
      { permission: Permission.MANAGE_INSTANCE, icon: IconDoorEnter },
      { permission: Permission.VIEW_LOOT_HISTORY, icon: IconHistory },
      { permission: Permission.ASSIGN_LOOT, icon: IconGift },
      { permission: Permission.DELETE_LOOT, icon: IconTrashX },
      { permission: Permission.EDIT_LOOT, icon: IconPencil },
    ],
  },
  {
    key: 'import',
    icon: IconUpload,
    permissions: [{ permission: Permission.IMPORT_SIMC, icon: IconFileImport }],
  },
  {
    key: 'wishlist',
    icon: IconStar,
    permissions: [
      { permission: Permission.VIEW_WISHLIST, icon: IconListDetails },
      { permission: Permission.MANAGE_WISHLIST, icon: IconListCheck },
    ],
  },
  {
    key: 'event_management',
    icon: IconCalendar,
    permissions: [
      { permission: Permission.CREATE_EVENT, icon: IconCalendarPlus },
      { permission: Permission.EDIT_EVENT, icon: IconCalendarCog },
      { permission: Permission.DELETE_EVENT, icon: IconCalendarX },
      { permission: Permission.SIGNUP_EVENT, icon: IconCalendarCheck },
      { permission: Permission.MANAGE_SIGNUPS, icon: IconClipboardList },
    ],
  },
  {
    key: 'event_roster',
    icon: IconUsersGroup,
    permissions: [{ permission: Permission.MANAGE_EVENT_ROSTER, icon: IconUsersGroup }],
  },
  {
    key: 'activity_log',
    icon: IconActivity,
    permissions: [{ permission: Permission.VIEW_ACTIVITY_LOG, icon: IconActivity }],
  },
];

/** Une permission absente de la configuration du rôle n'est pas accordée. */
export function isPermissionGranted(
  roleConfig: Partial<Record<string, boolean>>,
  permission: Permission,
): boolean {
  return roleConfig[permission] === true;
}
