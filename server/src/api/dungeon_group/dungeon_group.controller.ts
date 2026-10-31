import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import type { CreateGroupInput, UpdateGroupInput } from './dungeon_group.types';
import * as usecases from './usecases';

/**
 * L'appartenance du groupe au royaume est vérifiée en amont par
 * requireGroupInRealm, montée sur chaque route :id.
 */

type GroupParams = { id: number };

export async function list(req: Request, res: Response) {
  const filters = validated<{
    realmId: number;
    date?: Date;
    startDate?: Date;
    endDate?: Date;
  }>(req, 'query');
  res.json({ groups: await usecases.listGroups(filters) });
}

export async function getById(req: Request, res: Response) {
  const { id } = validated<GroupParams>(req, 'params');
  res.json({ group: await usecases.getGroupById(id) });
}

export async function create(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { note, ...input } = validated<Omit<CreateGroupInput, 'createdBy'>>(req, 'body');

  const group = await usecases.createGroup({ ...input, note: note || null, createdBy: userId });
  res.status(201).json({ group });
}

export async function update(req: Request, res: Response) {
  const { id } = validated<GroupParams>(req, 'params');
  // Joi ne garde que les champs fournis.
  const changes = validated<UpdateGroupInput>(req, 'body');
  res.json({ group: await usecases.updateGroup(id, changes) });
}

export async function remove(req: Request, res: Response) {
  const { id } = validated<GroupParams>(req, 'params');
  await usecases.removeGroup(id);
  res.json({ success: true });
}

export async function addMember(req: Request, res: Response) {
  const { id } = validated<GroupParams>(req, 'params');
  const { realmId } = validated<{ realmId: number }>(req, 'query');
  const { userId, role } = validated<{ userId: string; role: string }>(req, 'body');
  res.status(201).json(await usecases.addGroupMember(id, realmId, userId, role));
}

export async function removeMember(req: Request, res: Response) {
  const { id, userId } = validated<GroupParams & { userId: string }>(req, 'params');
  res.json({ group: await usecases.removeGroupMember(id, userId) });
}

export async function addGuest(req: Request, res: Response) {
  const { id } = validated<GroupParams>(req, 'params');
  const { realmId } = validated<{ realmId: number }>(req, 'query');
  const {
    name,
    role,
    class: guestClass,
  } = validated<{
    name: string;
    role: string;
    class?: string | null;
  }>(req, 'body');

  const group = await usecases.addGroupGuest(id, {
    realmId,
    name,
    role,
    class: guestClass,
    addedBy: req.user?.id ? String(req.user.id) : undefined,
  });
  res.status(201).json({ group });
}

export async function updateGuest(req: Request, res: Response) {
  const { id, guestId } = validated<GroupParams & { guestId: number }>(req, 'params');
  const { slotId } = validated<{ slotId?: string | null }>(req, 'body');
  res.json({ group: await usecases.updateGroupGuestSlot(id, guestId, slotId ?? null) });
}

export async function removeGuest(req: Request, res: Response) {
  const { id, guestId } = validated<GroupParams & { guestId: number }>(req, 'params');
  res.json({ group: await usecases.removeGroupGuest(id, guestId) });
}
