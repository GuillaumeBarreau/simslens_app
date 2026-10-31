declare global {
  namespace Express {
    interface User {
      id?: string;
      battletag?: string;
      token?: string;
      refreshToken?: string;
      expiresAt?: number;
    }

    interface Request {
      user?: User;
      realmId?: number;
      /** Rôle du membre sur le royaume courant, posé par checkPermission. */
      realmRole?: string;
      /** Portées du jeton Bearer présenté, posées par authBearer. */
      tokenScopes?: string[];
      /**
       * Vrai pour un appel du bot authentifié par x-internal-token ; posé par
       * checkPermission, requireInternal et requireUserOrInternal.
       */
      isInternalCall?: boolean;
    }
  }
}

export {};
