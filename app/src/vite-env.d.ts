/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `client_id` de l'application Discord du bot. Vide : lien d'invitation masqué. */
  readonly VITE_DISCORD_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
