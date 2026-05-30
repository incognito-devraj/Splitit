import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/joinRequest.service';
import { ok, created } from '../utils/response';

export async function requestToJoin(req: Request, res: Response, next: NextFunction) {
  try {
    const { inviteCode, memberType, message } = req.body as {
      inviteCode: string; memberType?: 'permanent' | 'occasional'; message?: string;
    };
    const result = await svc.requestToJoin(req.user._id, inviteCode, memberType, message);
    created(res, result);
  } catch (e) { next(e); }
}

export async function requestToJoinById(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId } = req.params;
    const { memberType, message } = req.body as {
      memberType?: 'permanent' | 'occasional'; message?: string;
    };
    const result = await svc.requestToJoinById(req.user._id, groupId, memberType, message);
    created(res, result);
  } catch (e) { next(e); }
}

export async function cancelRequestById(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.cancelRequestById(req.user._id, req.params.groupId);
    ok(res, { message: 'Request cancelled' });
  } catch (e) { next(e); }
}

export async function listPending(req: Request, res: Response, next: NextFunction) {
  try {
    const requests = await svc.listPendingRequests(req.user._id);
    ok(res, requests);
  } catch (e) { next(e); }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.approveRequest(req.user._id, req.params.id);
    ok(res, result);
  } catch (e) { next(e); }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.rejectRequest(req.user._id, req.params.id);
    ok(res, result);
  } catch (e) { next(e); }
}

export async function getMyRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { inviteCode } = req.query as { inviteCode: string };
    const result = await svc.getMyRequest(req.user._id, inviteCode);
    ok(res, result);
  } catch (e) { next(e); }
}
