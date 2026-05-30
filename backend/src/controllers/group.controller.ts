import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/group.service';
import { ok, created } from '../utils/response';

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const result = await svc.createGroup(req.user._id, name, description);
    created(res, result);
  } catch (e) { next(e); }
}

export async function joinGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.joinGroup(req.user._id, req.body.inviteCode);
    ok(res, result);
  } catch (e) { next(e); }
}

export async function getCurrentGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await svc.getCurrentGroup(req.user._id);
    ok(res, group);
  } catch (e) { next(e); }
}

export async function getMyGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const groups = await svc.getMyGroups(req.user._id);
    ok(res, groups);
  } catch (e) { next(e); }
}

export async function setActiveGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId } = req.body as { groupId: string };
    const group = await svc.setActiveGroupForUser(req.user._id, groupId);
    ok(res, group);
  } catch (e) { next(e); }
}

export async function getMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await svc.getMembers(req.user.groupId!);
    ok(res, members);
  } catch (e) { next(e); }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.removeMember(req.user._id, req.params.id);
    ok(res, { message: 'Member removed' });
  } catch (e) { next(e); }
}

export async function transferAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await svc.transferAdmin(req.user._id, req.body.newAdminId);
    ok(res, group);
  } catch (e) { next(e); }
}

export async function leaveGroup(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.leaveGroup(req.user._id);
    ok(res, { message: 'Left group successfully' });
  } catch (e) { next(e); }
}

export async function regenerateInviteCode(req: Request, res: Response, next: NextFunction) {
  try {
    const inviteCode = await svc.regenerateInviteCode(req.user._id);
    ok(res, { inviteCode });
  } catch (e) { next(e); }
}

export async function discoverGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const { search = '', page = '1', limit = '20' } = req.query as Record<string, string>;
    const result = await svc.discoverGroups(
      req.user._id,
      search,
      Math.max(1, parseInt(page, 10)),
      Math.min(50, parseInt(limit, 10)),
    );
    ok(res, result);
  } catch (e) { next(e); }
}

export async function updateGroupSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await svc.updateGroupSettings(req.user._id, req.body);
    ok(res, group);
  } catch (e) { next(e); }
}
