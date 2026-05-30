import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/summary.service';
import { ok } from '../utils/response';

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getSummary(req.user.groupId!);
    ok(res, data);
  } catch (e) { next(e); }
}

export async function getMonthlySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const data  = await svc.getMonthlySummary(req.user.groupId!, year, month);
    ok(res, data);
  } catch (e) { next(e); }
}

export async function getCategoryBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getCategoryBreakdown(req.user.groupId!);
    ok(res, data);
  } catch (e) { next(e); }
}
