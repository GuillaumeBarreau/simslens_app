import { useAuth } from 'contexts/AuthContext';
import { useUserRealm, useValidationSettings } from 'hooks/queries';
import { resolveStaleAfterDays } from 'utils/droptimizer';

/**
 * Seuil de péremption des sims (en jours) de la guilde de l'utilisateur
 * (SIMS-199). Seuil par défaut tant que les réglages ne sont pas chargés, si
 * leur lecture est refusée, ou si `enabled` est faux (aucune requête alors).
 */
export function useSimStaleAfterDays(enabled = true): number {
  const { user } = useAuth();
  const { data: realm } = useUserRealm(user?.id ? String(user.id) : null);
  // Valeur d'appoint : un 403 retombe sur le défaut sans être retenté.
  const { data: settings } = useValidationSettings(realm?.id, enabled, { retry: false });
  return resolveStaleAfterDays(settings?.simStaleAfterDays);
}
