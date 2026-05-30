import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/expense.service';
import { ok, created } from '../utils/response';

export async function createExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const expense = await svc.createExpense(req.user._id, req.user.groupId!, req.body);
    created(res, expense);
  } catch (e) { next(e); }
}

export async function listExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listExpenses(req.user.groupId!, req.query as Record<string, string>);
    // Consistent shape: { success: true, data: [...], pagination: {...} }
    res.status(200).json({ success: true, data: result.expenses, pagination: result.pagination });
  } catch (e) { next(e); }
}

export async function getExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const expense = await svc.getExpense(req.params.id, req.user.groupId!);
    ok(res, expense);
  } catch (e) { next(e); }
}

export async function updateExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const expense = await svc.updateExpense(
      req.params.id,
      req.user.groupId!,
      req.user._id,
      req.user.role === 'admin',
      req.body,
    );
    ok(res, expense);
  } catch (e) { next(e); }
}

export async function deleteExpense(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteExpense(req.params.id, req.user.groupId!, req.user._id, req.user.role === 'admin');
    ok(res, { message: 'Expense deleted' });
  } catch (e) { next(e); }
}

export async function getExpenseHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const history = await svc.getExpenseHistory(req.params.id, req.user.groupId!);
    ok(res, history);
  } catch (e) { next(e); }
}

export async function listGroupGuests(req: Request, res: Response, next: NextFunction) {
  try {
    const guests = await svc.listGroupGuests(req.user.groupId!);
    ok(res, guests);
  } catch (e) { next(e); }
}
