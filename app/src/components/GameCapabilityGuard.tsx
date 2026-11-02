import type { GameCapability } from 'config/games';
import { useGame } from 'hooks/useGame';
import type { ReactNode } from 'react';

interface GameCapabilityGuardProps {
  capability: GameCapability;
  children: ReactNode;
  /** Rendu quand le jeu courant n'a pas la capacité (rien par défaut). */
  fallback?: ReactNode;
}

/**
 * N'affiche ses enfants que si le jeu courant (Retail, Forever) propose la capacité.
 * À utiliser à côté de <FeatureGuard> : l'un masque ce qui n'est pas prêt, l'autre ce
 * qui n'existe pas dans ce jeu.
 */
export function GameCapabilityGuard({
  capability,
  children,
  fallback = null,
}: GameCapabilityGuardProps) {
  const { has } = useGame();
  return <>{has(capability) ? children : fallback}</>;
}
