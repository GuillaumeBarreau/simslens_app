import type { GameCapability } from 'config/games';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';

import { GameCapabilityGuard } from './GameCapabilityGuard';

interface RequireGameCapabilityProps {
  capability: GameCapability;
  /** Page protégée ; sans enfant, rend les routes filles (`<Outlet />`). */
  children?: ReactNode;
}

/**
 * Garde de route : une page propre à un jeu (Droptimizer, donjons M+…) renvoie vers
 * « Mon activité » de la même guilde et extension quand le jeu courant ne l'a pas.
 */
export default function RequireGameCapability({
  capability,
  children,
}: RequireGameCapabilityProps) {
  const { guild, extension } = useParams();
  return (
    <GameCapabilityGuard
      capability={capability}
      fallback={<Navigate to={`/${guild}/${extension}/my-activity`} replace />}
    >
      {children ?? <Outlet />}
    </GameCapabilityGuard>
  );
}
