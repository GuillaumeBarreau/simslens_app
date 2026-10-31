/** Personnage tel que l'API profil Battle.net le renvoie (champs utilisés). */
export interface BnetCharacter {
  name: string;
  realm: { slug: string; region?: string; [key: string]: unknown };
  playable_class: { name: string };
  guild?: { name: string } | null;
  average_item_level?: number;
  [key: string]: unknown;
}

export interface BnetSession {
  token: string;
  userId: string;
}

export interface ClaimCharacterInput {
  name: string;
  realm: string;
  region?: string;
}

export type ClaimCharacterResult =
  | { success: true; created: true; realmId: number; characterId: unknown }
  | { success: true; updated: true; characterId: number };

/** Membre du roster de guilde, tel que le front le renvoie à l'import. */
export interface GuildMember {
  name: string;
  realm: { slug?: string } | string;
  classId?: number;
}

export interface ImportGuildMembersResult {
  imported: number;
  ignored: number;
  failed: number;
  details: { name: string; status: string; error?: string }[];
}
