import { Types } from 'mongoose';
import { Expense, IExpense, ExpenseCategory } from '../models/Expense.model';
import { ExpenseAudit } from '../models/ExpenseAudit.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/error.middleware';
import { paginate } from '../utils/response';
import { logger } from '../utils/logger';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function validateMembers(groupId: string, ids: string[]): Promise<Types.ObjectId[]> {
  const members = await User.find({ groupId: new Types.ObjectId(groupId) }).select('_id').lean();
  const memberSet = new Set(members.map((m) => m._id.toString()));
  const invalid = ids.filter((id) => !memberSet.has(id));
  if (invalid.length) throw new AppError(`Users not in group: ${invalid.join(', ')}`, 400);
  return ids.map((id) => new Types.ObjectId(id));
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createExpense(
  userId: string,
  groupId: string,
  body: {
    title?: string;
    category: ExpenseCategory;
    amount: number;
    sharedWith: string[];
    notes?: string;
  },
) {
  // paidBy is ALWAYS the logged-in user — never from body
  const sharedSet = new Set(body.sharedWith);
  sharedSet.add(userId); // payer always participates

  const sharedWithIds = await validateMembers(groupId, [...sharedSet]);
  const splitAmount = Math.round((body.amount / sharedWithIds.length) * 100) / 100;

  const expense = await Expense.create({
    title:      body.title ?? '',
    category:   body.category,
    amount:     body.amount,
    paidBy:     new Types.ObjectId(userId),
    sharedWith: sharedWithIds,
    splitAmount,
    notes:      body.notes ?? '',
    groupId:    new Types.ObjectId(groupId),
  });

  await ExpenseAudit.create({
    expenseId: expense._id,
    groupId:   expense.groupId,
    action:    'created',
    editedBy:  new Types.ObjectId(userId),
    oldData:   null,
    newData:   expense.toObject(),
  });

  logger.info(`Expense created ₹${body.amount} [${body.category}] group=${groupId}`);
  return populateExpense(expense._id.toString());
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listExpenses(
  groupId: string,
  query: { category?: string; startDate?: string; endDate?: string; page?: number; limit?: number },
) {
  const page  = Math.max(1, query.page  ?? 1);
  const limit = Math.min(100, query.limit ?? 20);
  const skip  = (page - 1) * limit;

  const filter: Record<string, unknown> = { groupId: new Types.ObjectId(groupId) };
  if (query.category) filter.category = query.category;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(query.startDate);
    if (query.endDate)   (filter.createdAt as Record<string, Date>).$lte = new Date(query.endDate);
  }

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate('paidBy',     'name email avatar')
      .populate('sharedWith', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  return { expenses, pagination: paginate(total, page, limit) };
}

// ─── Get One ──────────────────────────────────────────────────────────────────

export async function getExpense(expenseId: string, groupId: string) {
  const expense = await populateExpense(expenseId);
  if (!expense) throw new AppError('Expense not found', 404);
  if (expense.groupId.toString() !== groupId) throw new AppError('Expense not in your group', 403);
  return expense;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateExpense(
  expenseId: string,
  groupId: string,
  userId: string,
  isAdmin: boolean,
  updates: { title?: string; category?: string; amount?: number; sharedWith?: string[]; notes?: string },
) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw new AppError('Expense not found', 404);
  if (expense.groupId.toString() !== groupId) throw new AppError('Expense not in your group', 403);
  if (expense.paidBy.toString() !== userId && !isAdmin) {
    throw new AppError('Only the payer or admin can edit this expense', 403);
  }

  const oldData = expense.toObject();

  if (updates.title     !== undefined) expense.title    = updates.title;
  if (updates.category  !== undefined) expense.category = updates.category as ExpenseCategory;
  if (updates.notes     !== undefined) expense.notes    = updates.notes;

  if (updates.amount !== undefined || updates.sharedWith !== undefined) {
    const newAmount = updates.amount ?? expense.amount;
    let newShared: Types.ObjectId[];

    if (updates.sharedWith) {
      const sharedSet = new Set(updates.sharedWith);
      sharedSet.add(expense.paidBy.toString());
      newShared = await validateMembers(groupId, [...sharedSet]);
    } else {
      newShared = expense.sharedWith as Types.ObjectId[];
    }

    expense.amount      = newAmount;
    expense.sharedWith  = newShared;
    expense.splitAmount = Math.round((newAmount / newShared.length) * 100) / 100;
  }

  await expense.save();

  await ExpenseAudit.create({
    expenseId: expense._id,
    groupId:   expense.groupId,
    action:    'updated',
    editedBy:  new Types.ObjectId(userId),
    oldData,
    newData:   expense.toObject(),
  });

  return populateExpense(expenseId);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteExpense(expenseId: string, groupId: string, userId: string, isAdmin: boolean) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw new AppError('Expense not found', 404);
  if (expense.groupId.toString() !== groupId) throw new AppError('Expense not in your group', 403);
  if (expense.paidBy.toString() !== userId && !isAdmin) {
    throw new AppError('Only the payer or admin can delete this expense', 403);
  }

  await ExpenseAudit.create({
    expenseId: expense._id,
    groupId:   expense.groupId,
    action:    'deleted',
    editedBy:  new Types.ObjectId(userId),
    oldData:   expense.toObject(),
    newData:   expense.toObject(),
  });

  await expense.deleteOne();
  logger.info(`Expense ${expenseId} deleted by ${userId}`);
}

// ─── Audit History ────────────────────────────────────────────────────────────

export async function getExpenseHistory(expenseId: string, groupId: string) {
  // Verify expense belongs to group
  const expense = await Expense.findById(expenseId).lean();
  // Allow history even if deleted (audit records remain)
  const history = await ExpenseAudit.find({ expenseId: new Types.ObjectId(expenseId) })
    .populate('editedBy', 'name email avatar')
    .sort({ createdAt: -1 })
    .lean();
  return history;
}

// ─── Internal helper ─────────────────────────────────────────────────────────

function populateExpense(id: string) {
  return Expense.findById(id)
    .populate('paidBy',     'name email avatar')
    .populate('sharedWith', 'name email avatar')
    .lean();
}
