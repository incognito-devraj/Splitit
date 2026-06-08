import { Types } from 'mongoose';
import { Expense } from '../models/Expense.model';
import { Group } from '../models/Group.model';
import { computeGroupBalances } from './balance.service';
import { AppError } from '../middleware/error.middleware';

// ─── Overall Summary ──────────────────────────────────────────────────────────

export async function getSummary(groupId: string) {
  const group = await Group.findById(groupId).lean();
  if (!group) throw new AppError('Group not found', 404);

  const [expenses, balances] = await Promise.all([
    Expense.find({ groupId: new Types.ObjectId(groupId), isDeleted: { $ne: true } }).lean(),
    computeGroupBalances(groupId),
  ]);

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  const summaryLines = balances
    .filter((b) => Math.abs(b.netBalance) >= 0.5)
    .map((b) => ({
      userId: b.userId,
      name:   b.name,
      action: b.netBalance > 0 ? 'receives' : 'owes',
      amount: Math.abs(b.netBalance),
    }));

  const whatsappText = buildWhatsAppText(group.name, summaryLines, totalAmount);

  return {
    groupId,
    groupName:     group.name,
    totalExpenses: expenses.length,
    totalAmount:   Math.round(totalAmount * 100) / 100,
    balances,
    summary:       summaryLines,
    whatsappText,
  };
}

// ─── Monthly Summary ──────────────────────────────────────────────────────────

export async function getMonthlySummary(groupId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59, 999);

  const expenses = await Expense.find({
    groupId:   new Types.ObjectId(groupId),
    createdAt: { $gte: start, $lte: end },
    isDeleted: { $ne: true },
  })
    .populate('paidBy',     'name email avatar')
    .populate('sharedWith', 'name email avatar')
    .lean();

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }

  return {
    year,
    month,
    totalExpenses: expenses.length,
    totalAmount:   Math.round(totalAmount * 100) / 100,
    byCategory,
    expenses,
  };
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

export async function getCategoryBreakdown(groupId: string) {
  const result = await Expense.aggregate([
    { $match: { groupId: new Types.ObjectId(groupId), isDeleted: { $ne: true } } },
    {
      $group: {
        _id:   '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  return result.map((r) => ({
    category: r._id as string,
    total:    Math.round(r.total * 100) / 100,
    count:    r.count as number,
  }));
}

// ─── WhatsApp text builder ────────────────────────────────────────────────────

function buildWhatsAppText(
  groupName: string,
  lines: { name: string; action: string; amount: number }[],
  totalAmount: number,
): string {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const items = lines.length
    ? lines.map((l) => `${l.action === 'receives' ? '✅' : '🔴'} ${l.name} ${l.action} ₹${l.amount.toFixed(0)}`).join('\n')
    : '✅ All settled up!';

  return [
    `📌 *${groupName} — Expense Summary*`,
    `📅 ${date}`,
    `💰 Total spent: ₹${totalAmount.toLocaleString('en-IN')}`,
    ``,
    items,
    ``,
    `_Powered by Splitit_`,
  ].join('\n');
}
