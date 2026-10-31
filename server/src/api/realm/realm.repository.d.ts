import type { RealmEntity, RealmOwner, RealmSettings } from './realm.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const realmRepository: {
  createRealm(data: {
    name: string;
    server: string;
    region: string;
    ownerId: string;
  }): Promise<number>;
  listAllRealms(): Promise<RealmEntity[]>;
  getRealmById(id: number): Promise<RealmEntity | null>;
  getRealmCharacters(realmId: number): Promise<unknown[]>;
  /** 1 si rattaché, 0 si le personnage est absent ou appartient à un autre royaume. */
  addCharacterToRealm(characterId: number, realmId: number): Promise<number>;
  findRealmByDetails(name: string, server: string, region: string): Promise<RealmEntity | null>;
  findRealmByOwnerId(ownerId: string): Promise<RealmEntity | null>;
  findRealmsByOwnerId(ownerId: string): Promise<RealmEntity[]>;
  findRealmByMemberUserId(userId: string): Promise<RealmEntity | null>;
  isRealmOwner(realmId: number, ownerId: string): Promise<boolean>;
  addRealmOwner(realmId: number, ownerId: string, role: string): Promise<unknown>;
  getRealmOwners(realmId: number): Promise<RealmOwner[]>;
  removeRealmOwner(realmId: number, ownerId: string): Promise<number>;
  updateRealmOwnerRole(realmId: number, ownerId: string, role: string): Promise<number>;
  getRealmOwner(realmId: number, ownerId: string): Promise<RealmOwner | null>;
  getRealmUsers(realmId: number): Promise<unknown[]>;
  findRealmByNameAndRegion(name: string, region: string): Promise<RealmEntity | null>;
  getRealmUserRole(realmId: number, userId: string): Promise<string | null>;
  updateRealmSettings(realmId: number, settings: RealmSettings): Promise<unknown>;
  hasCharacterWithUserId(userId: string): Promise<boolean>;
};

export default realmRepository;
