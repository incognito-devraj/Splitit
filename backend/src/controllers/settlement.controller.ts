import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/settlement.service';
import { ok, created } from '../utils/response';

export async function requestSettlement(req: Request, res: Response, next: NextFunction) {
  try {
    const { toUserId, amount, note } = req.body as { toUserId: string; amount: number; note?: string };
    const s = await svc.requestSettlement(req.user._id, req.user.groupId!, toUserId, amount, note);
    created(res, s);
  } catch (e) { next(e); }
}

export async function approveSettlement(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.approveSettlement(req.params.id, req.user._id, req.user.groupId!);
    ok(res, result);
  } catch (e) { next(e); }
}

export async function rejectSettlement(req: Request, res: Response, next: NextFunction) {
  try {
    const s = await svc.rejectSettlement(req.params.id, req.user._id, req.user.groupId!);
    ok(res, s);
  } catch (e) { next(e); }
}

export async function listSettlements(req: Request, res: Response, next: NextFunction) {
  try {
    const settlements = await svc.listSettlements(req.user.groupId!);
    ok(res, settlements);
  } catch (e) { next(e); }
}
