import type { dungeon_group_guests, dungeon_group_members, dungeon_groups } from '@prisma/client';

export type GroupEntity = dungeon_groups;
export type GroupMemberEntity = dungeon_group_members;
export type GroupGuestEntity = dungeon_group_guests;

export interface ListGroupsFilters {
  realmId: GroupEntity['realmId'];
  date?: Date;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateGroupInput {
  realmId: GroupEntity['realmId'];
  date: Date;
  startTime: GroupEntity['startTime'];
  endTime: GroupEntity['endTime'];
  type: GroupEntity['type'];
  note?: GroupEntity['note'];
  createdBy: GroupEntity['createdBy'];
}

export interface UpdateGroupInput {
  startTime?: GroupEntity['startTime'];
  endTime?: GroupEntity['endTime'];
  type?: GroupEntity['type'];
  note?: GroupEntity['note'];
  status?: GroupEntity['status'];
}

export interface AddGroupGuestInput {
  realmId: GroupGuestEntity['realmId'];
  name: GroupGuestEntity['name'];
  role: string;
  class?: GroupGuestEntity['class'];
  addedBy?: GroupGuestEntity['addedBy'];
}
