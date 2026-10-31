import { useRealmAccess } from 'contexts/RealmAccessContext';
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Permission } from 'types/permissions';

interface ProtectedRouteProps {
  I: Permission;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ I, redirectTo = '/' }) => {
  const { hasPermission } = useRealmAccess();

  if (!hasPermission(I)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
