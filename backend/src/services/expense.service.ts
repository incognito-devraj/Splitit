import { type ClientSession, Types } from 'mongoose';
import { Expense, IExpense, ExpenseCategory } from '../models/Expense.model';
import { ExpenseAudit } from '../models/ExpenseAudit.model';
import { GuestParticipant } from '../models/GuestParticipant.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/error.middleware';
import { paginate } from '../utils/response';
import { logger } from '../utils/logger';
import { withMongoTransaction } from '../utils/mongo';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function validateMembers(groupId: string, ids: string[], session?: ClientSession): Promise<Types.ObjectId[]> {
  if (!ids.length) return [];
  const gid = new Types.ObjectId(groupId);
  const query = User.find({ $or: [{ groupId: gid }, { groupIds: gid }] }).select('_id');
  if (session) query.session(session);
  const members = await query.lean();
  const memberSet = new Set(members.map((m) => m._id.toString()));
  const invalid = ids.filter((id) => !memberSet.has(id));
  if (invalid.length) throw new AppError(`Users not in group: ${invalid.join(', ')}`, 400);
  return ids.map((id) => new Types.ObjectId(id));
}

/**
 * Resolve guest names → GuestParticipant ObjectIds.
 * Creates new guests if they don't exist yet (upsert by name+group, case-insensitive).
 */
async function resolveGuests(
  groupId: string,
  createdBy: string,
  guestNames: string[],
  session?: ClientSession,
): Promise<Types.ObjectId[]> {
  if (!guestNames.length) return [];

  const ids: Types.ObjectId[] = [];
  for (const rawName of guestNames) {
    const name = rawName.trim();
    if (!name) continue;

    // Case-insensitive upsert
    const guestQuery = GuestParticipant.findOneAndUpdate(
      { groupId: new Types.ObjectId(groupId), name: { $regex: `^${name}$`, $options: 'i' } },
      { $setOnInsert: { name, groupId: new Types.ObjectId(groupId), createdBy: new Types.ObjectId(createdBy) } },
      { upsert: true, new: true },
    );
    if (session) guestQuery.session(session);
    const guest = await guestQuery;
    ids.push(guest._id);
  }
  return ids;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createExpense(
  userId: string,
  groupId: string,
  body: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    sharedWith: string[];
    guestNames?: string[]; // new: guest participant names
    notes: string;
  },
) {
  const sharedSet = new Set(body.sharedWith);
  sharedSet.add(userId); // payer always participates

  const [sharedWithIds, guestIds] = await Promise.all([
    validateMembers(groupId, [...sharedSet]),
    resolveGuests(groupId, userId, body.guestNames ?? []),
  ]);

  const totalParticipants = sharedWithIds.length + guestIds.length;
  const splitAmount = Math.round((body.amount / totalParticipants) * 100) / 100;

  const expense = await Expense.create({
    title:             body.title,
    category:          body.category,
    amount:            body.amount,
    paidBy:            new Types.ObjectId(userId),
    sharedWith:        sharedWithIds,
    guestParticipants: guestIds,
    splitAmount,
    totalParticipants,
    notes:             body.notes,
    groupId:           new Types.ObjectId(groupId),
  });

  await ExpenseAudit.create({
    expenseId: expense._id,
    groupId:   expense.groupId,
    action:    'created',
    editedBy:  new Types.ObjectId(userId),
    oldData:   null,
    newData:   expense.toObject(),
  });

  logger.info(`Expense created ₹${body.amount} [${body.category}] group=${groupId} guests=${guestIds.length}`);
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
  // Include ALL expenses (active + soft-deleted) so the history page can show deleted entries

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate('paidBy',             'name email avatar')
      .populate('sharedWith',         'name email avatar')
      .populate('guestParticipants',  'name')
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
  updates: {
    title?: string;
    category?: string;
    amount?: number;
    sharedWith?: string[];
    guestNames?: string[];
    notes?: string;
  },
) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw new AppError('Expense not found', 404);
  if (expense.groupId.toString() !== groupId) throw new AppError('Expense not in your group', 403);
  // Only the person who created (paid for) the expense can edit it
  if (expense.paidBy.toString() !== userId) {
    throw new AppError('Only the person who added this expense can edit it', 403);
  }

  const oldData = expense.toObject();

  if (updates.title    !== undefined) expense.title    = updates.title;
  if (updates.category !== undefined) expense.category = updates.category as ExpenseCategory;
  if (updates.notes    !== undefined) expense.notes    = updates.notes;

  if (updates.amount !== undefined || updates.sharedWith !== undefined || updates.guestNames !== undefined) {
    const newAmount = updates.amount ?? expense.amount;

    let newShared: Types.ObjectId[];
    if (updates.sharedWith) {
      const sharedSet = new Set(updates.sharedWith);
      sharedSet.add(expense.paidBy.toString());
      newShared = await validateMembers(groupId, [...sharedSet]);
    } else {
      newShared = expense.sharedWith as Types.ObjectId[];
    }

    let newGuests: Types.ObjectId[];
    if (updates.guestNames !== undefined) {
      newGuests = await resolveGuests(groupId, userId, updates.guestNames);
    } else {
      newGuests = expense.guestParticipants as Types.ObjectId[];
    }

    const totalParticipants = newShared.length + newGuests.length;
    if (totalParticipants < 1) throw new AppError('Expense must have at least 1 participant', 400);

    expense.amount            = newAmount;
    expense.sharedWith        = newShared;
    expense.guestParticipants = newGuests;
    expense.totalParticipants = totalParticipants;
    expense.splitAmount       = Math.round((newAmount / totalParticipants) * 100) / 100;
  }

  await expense.save();

  // Mark as edited so the UI can show the "Edited" badge
  await Expense.updateOne({ _id: expense._id }, { $set: { isEdited: true } });

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

// ─── Soft Delete ─────────────────────────────────────────────────────────────

export async function deleteExpense(expenseId: string, groupId: string, userId: string, isAdmin: boolean) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw new AppError('Expense not found', 404);
  if (expense.groupId.toString() !== groupId) throw new AppError('Expense not in your group', 403);
  if (expense.paidBy.toString() !== userId && !isAdmin) {
    throw new AppError('Only the person who added this expense can delete it', 403);
  }
  if (expense.isDeleted) throw new AppError('Expense is already deleted', 400);

  expense.isDeleted = true;
  expense.deletedAt = new Date();
  await expense.save();

  await ExpenseAudit.create({
    expenseId: expense._id,
    groupId:   expense.groupId,
    action:    'deleted',
    editedBy:  new Types.ObjectId(userId),
    oldData:   expense.toObject(),
    newData:   expense.toObject(),
  });

  logger.info(`Expense ${expenseId} soft-deleted by ${userId}`);
}

// ─── Audit History ────────────────────────────────────────────────────────────

export async function getExpenseHistory(expenseId: string, groupId: string) {
  const history = await ExpenseAudit.find({ expenseId: new Types.ObjectId(expenseId) })
    .populate('editedBy', 'name email avatar')
    .sort({ createdAt: -1 })
    .lean();
  return history;
}

// ─── Guest autocomplete ───────────────────────────────────────────────────────

export async function listGroupGuests(groupId: string) {
  return GuestParticipant.find({ groupId: new Types.ObjectId(groupId) })
    .select('name createdAt')
    .sort({ name: 1 })
    .lean();
}

// ─── Internal helper ─────────────────────────────────────────────────────────

function populateExpense(id: string) {
  return Expense.findById(id)
    .populate('paidBy',            'name email avatar')
    .populate('sharedWith',        'name email avatar')
    .populate('guestParticipants', 'name')
    .lean();
}
