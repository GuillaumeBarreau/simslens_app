import type {
  CreateGroupInput,
  GroupEntity,
  GroupGuestEntity,
  GroupMemberEntity,
  ListGroupsFilters,
  UpdateGroupInput,
} from './dungeon_group.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const groupRepository: {
  findAll(filters: ListGroupsFilters): Promise<GroupEntity[]>;
  findById(id: number): Promise<GroupEntity | null>;
  create(data: CreateGroupInput): Promise<GroupEntity>;
  update(id: number, data: UpdateGroupInput): Promise<GroupEntity>;
  remove(id: number): Promise<GroupEntity>;
  belongsToRealm(id: number, realmId: number): Promise<boolean>;
  addMember(groupId: number, userId: string, role: string): Promise<GroupMemberEntity>;
  /** Limité au groupe : count vaut 0 si l'utilisateur n'en est pas membre. */
  removeMember(groupId: number, userId: string): Promise<{ count: number }>;
  addGuest(
    groupId: number,
    data: {
      realmId: number;
      name: string;
      role: string;
      class?: string | null;
      addedBy?: string | null;
    },
  ): Promise<GroupGuestEntity>;
  /** Limité au groupe : count vaut 0 si l'invité n'en fait pas partie. */
  removeGuest(groupId: number, guestId: number): Promise<{ count: number }>;
  /** Limité au groupe : count vaut 0 si l'invité n'en fait pas partie. */
  updateGuest(
    groupId: number,
    guestId: number,
    data: { slotId: string | null },
  ): Promise<{ count: number }>;
};

export default groupRepository;
