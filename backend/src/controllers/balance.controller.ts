import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/balance.service';
import { ok } from '../utils/response';

export async function getGroupBalances(req: Request, res: Response, next: NextFunction) {
  try {
    const balances = await svc.computeGroupBalances(req.user.groupId!);
    ok(res, balances);
  } catch (e) { next(e); }
}

export async function getMemberBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const balance = await svc.getMemberBalance(req.user.groupId!, req.params.userId);
    ok(res, balance);
  } catch (e) { next(e); }
}

export async function getSimplifiedDebts(req: Request, res: Response, next: NextFunction) {
  try {
    const debts = await svc.simplifyDebts(req.user.groupId!);
    ok(res, debts);
  } catch (e) { next(e); }
}
