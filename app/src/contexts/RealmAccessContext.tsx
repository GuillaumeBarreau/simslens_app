import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { Permission } from '../types/permissions';

export type RealmRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

interface RealmAccessContextType {
  role: RealmRole;
  permissions: Record<string, boolean>;
  canEditAll: boolean;
  canEditSelf: boolean;
  hasPermission: (key: Permission) => boolean;
}

const RealmAccessContext = createContext<RealmAccessContextType | undefined>(undefined);

const EMPTY_PERMISSIONS: Record<string, boolean> = {};

export function RealmAccessProvider({
  role,
  permissions = EMPTY_PERMISSIONS,
  children,
}: {
  role: RealmRole;
  permissions?: Record<string, boolean>;
  children: ReactNode;
}) {
  const canEditAll = role === 'owner' || role === 'admin' || role === 'moderator';
  const canEditSelf = canEditAll || role === 'member';

  const hasPermission = (key: Permission) => {
    return !!permissions[key];
  };

  return (
    <RealmAccessContext.Provider
      value={{ role, permissions, canEditAll, canEditSelf, hasPermission }}
    >
      {children}
    </RealmAccessContext.Provider>
  );
}

export function useRealmAccess() {
  const context = useContext(RealmAccessContext);

  // Safe fallback if used outside provider (e.g. Header on global pages)
  if (context === undefined) {
    return {
      role: 'guest' as RealmRole,
      permissions: {},
      canEditAll: false,
      canEditSelf: false,
      hasPermission: () => false,
    };
  }

  return context;
}
