import { useRealmAccess } from 'contexts/RealmAccessContext';
import React from 'react';
import { Permission } from 'types/permissions';

interface CanProps {
  I: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ I, children, fallback = null }) => {
  const { hasPermission } = useRealmAccess();

  if (!hasPermission(I)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
