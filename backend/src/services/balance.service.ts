import { Types } from 'mongoose';
import { Expense } from '../models/Expense.model';
import { Settlement } from '../models/Settlement.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/error.middleware';

export interface BalanceEntry {
  userId: string;
  name: string;
  avatar: string;
  totalPaid: number;   // sum of expenses this user paid
  totalOwed: number;   // sum of shares this user owes across all expenses
  netBalance: number;  // positive = should receive, negative = owes
}

export interface DebtEdge {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

// ─── Core engine ─────────────────────────────────────────────────────────────

export async function computeGroupBalances(groupId: string): Promise<BalanceEntry[]> {
  const gid = new Types.ObjectId(groupId);

  const [members, expenses, settlements] = await Promise.all([
    User.find({ groupId: gid }).select('_id name avatar').lean(),
    Expense.find({ groupId: gid }).lean(),
    Settlement.find({ groupId: gid, status: 'approved' }).lean(),
  ]);

  // net[userId] = amount they should receive (positive) or owe (negative)
  const net   = new Map<string, number>();
  const paid  = new Map<string, number>();
  const owed  = new Map<string, number>();

  for (const m of members) {
    const id = m._id.toString();
    net.set(id, 0);
    paid.set(id, 0);
    owed.set(id, 0);
  }

  // Process expenses
  for (const exp of expenses) {
    const payerId = exp.paidBy.toString();
    const share   = exp.amount / exp.sharedWith.length;

    // Payer gets credited the full amount
    net.set(payerId,  (net.get(payerId)  ?? 0) + exp.amount);
    paid.set(payerId, (paid.get(payerId) ?? 0) + exp.amount);

    // Each member in sharedWith is debited their share
    for (const uid of exp.sharedWith) {
      const id = uid.toString();
      net.set(id,  (net.get(id)  ?? 0) - share);
      owed.set(id, (owed.get(id) ?? 0) + share);
    }
  }

  // Process approved settlements
  for (const s of settlements) {
    const fromId = s.fromUser.toString();
    const toId   = s.toUser.toString();
    net.set(fromId, (net.get(fromId) ?? 0) + s.amount); // payer's debt reduces
    net.set(toId,   (net.get(toId)   ?? 0) - s.amount); // receiver's credit reduces
  }

  return members.map((m) => {
    const id = m._id.toString();
    return {
      userId:     id,
      name:       m.name,
      avatar:     m.avatar,
      totalPaid:  Math.round((paid.get(id) ?? 0) * 100) / 100,
      totalOwed:  Math.round((owed.get(id) ?? 0) * 100) / 100,
      netBalance: Math.round((net.get(id)  ?? 0) * 100) / 100,
    };
  });
}

export async function getMemberBalance(groupId: string, userId: string): Promise<BalanceEntry> {
  const user = await User.findById(userId).lean();
  if (!user || user.groupId?.toString() !== groupId) throw new AppError('User not in group', 404);

  const balances = await computeGroupBalances(groupId);
  return balances.find((b) => b.userId === userId) ?? {
    userId, name: user.name, avatar: user.avatar,
    totalPaid: 0, totalOwed: 0, netBalance: 0,
  };
}

// ─── Phase 6 — Debt Simplification ───────────────────────────────────────────
// Minimise the number of transactions needed to settle all debts.
// Algorithm: greedy creditor-debtor matching.

export async function simplifyDebts(groupId: string): Promise<DebtEdge[]> {
  const balances = await computeGroupBalances(groupId);

  // Separate into creditors (positive) and debtors (negative)
  const creditors = balances
    .filter((b) => b.netBalance > 0.005)
    .map((b) => ({ id: b.userId, name: b.name, amount: b.netBalance }));

  const debtors = balances
    .filter((b) => b.netBalance < -0.005)
    .map((b) => ({ id: b.userId, name: b.name, amount: -b.netBalance }));

  const transactions: DebtEdge[] = [];

  let ci = 0; // creditor index
  let di = 0; // debtor index

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor   = debtors[di];
    const amount   = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.005) {
      transactions.push({
        from:     debtor.id,
        fromName: debtor.name,
        to:       creditor.id,
        toName:   creditor.name,
        amount:   Math.round(amount * 100) / 100,
      });
    }

    creditor.amount -= amount;
    debtor.amount   -= amount;

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount   < 0.005) di++;
  }

  return transactions;
}
