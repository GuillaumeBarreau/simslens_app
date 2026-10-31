import groupRepo from '../dungeon_group.repository';
import type {
  CreateGroupInput,
  GroupEntity,
  ListGroupsFilters,
  UpdateGroupInput,
} from '../dungeon_group.types';

export async function listGroups(filters: ListGroupsFilters): Promise<GroupEntity[]> {
  return groupRepo.findAll(filters);
}

export async function getGroupById(id: number): Promise<GroupEntity | null> {
  return groupRepo.findById(id);
}

export async function groupBelongsToRealm(id: number, realmId: number): Promise<boolean> {
  return groupRepo.belongsToRealm(id, realmId);
}

export async function createGroup(input: CreateGroupInput): Promise<GroupEntity> {
  console.log('[Dungeon Group Service] Creating group:', {
    realmId: input.realmId,
    date: input.date,
    type: input.type,
  });
  return groupRepo.create(input);
}

export async function updateGroup(id: number, data: UpdateGroupInput): Promise<GroupEntity> {
  console.log('[Dungeon Group Service] Updating group:', { id, data });
  return groupRepo.update(id, data);
}

export async function removeGroup(id: number): Promise<GroupEntity> {
  console.log('[Dungeon Group Service] Removing group:', id);
  return groupRepo.remove(id);
}
