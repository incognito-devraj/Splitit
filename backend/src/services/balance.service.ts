import { Types } from 'mongoose';
import { Expense } from '../models/Expense.model';
import { Settlement } from '../models/Settlement.model';
import { User } from '../models/User.model';
import { GuestParticipant } from '../models/GuestParticipant.model';
import { AppError } from '../middleware/error.middleware';

export interface BalanceEntry {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;  // positive = should receive, negative = owes
  isGuest?: boolean;
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

  const [members, expenses, settlements, allGuests] = await Promise.all([
    User.find({ $or: [{ groupId: gid }, { groupIds: gid }] })
      .select('_id name email avatar').lean(),
    Expense.find({ groupId: gid, isDeleted: { $ne: true } }).lean(),
    Settlement.find({ groupId: gid, status: 'approved' }).lean(),
    GuestParticipant.find({ groupId: gid }).select('_id name').lean(),
  ]);

  // id → name map for guests
  const guestNameById = new Map<string, string>(
    allGuests.map((g) => [g._id.toString(), g.name])
  );

  // Use integer paise to avoid floating-point rounding errors
  const net  = new Map<string, number>(); // member net (paise)
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  // Guest net (paise), keyed by lowercase name
  const guestNet  = new Map<string, number>();
  const guestOwed = new Map<string, number>();
  const guestDisplay = new Map<string, string>(); // lowercase → display name

  for (const m of members) {
    const id = m._id.toString();
    net.set(id, 0); paid.set(id, 0); owed.set(id, 0);
  }

  for (const exp of expenses) {
    const payerId    = exp.paidBy.toString();
    const guestIds   = (exp.guestParticipants ?? []) as Types.ObjectId[];
    const guestCount = guestIds.length;
    const totalParts = (exp as { totalParticipants?: number }).totalParticipants
      ?? (exp.sharedWith.length + guestCount);
    if (totalParts < 1) continue;

    const amtP      = Math.round(exp.amount * 100);
    const perShare  = Math.floor(amtP / totalParts);
    let   remainder = amtP - perShare * totalParts;

    // Payer gets full credit — guest shares stay as positive credit on the payer
    // until the guest pays back in cash. This means sum(all nets including guests) = 0.
    net.set(payerId,  (net.get(payerId)  ?? 0) + amtP);
    paid.set(payerId, (paid.get(payerId) ?? 0) + amtP);

    // Debit each registered member
    for (const uid of exp.sharedWith) {
      const id    = uid.toString();
      const share = perShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      net.set(id,  (net.get(id)  ?? 0) - share);
      owed.set(id, (owed.get(id) ?? 0) + share);
    }

    // Debit each guest — their negative exactly offsets the payer's extra positive
    for (const guestId of guestIds) {
      const gName = guestNameById.get(guestId.toString());
      if (!gName) continue;
      const key   = gName.trim().toLowerCase();
      const share = perShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      guestNet.set(key,  (guestNet.get(key)  ?? 0) - share);
      guestOwed.set(key, (guestOwed.get(key) ?? 0) + share);
      if (!guestDisplay.has(key)) guestDisplay.set(key, gName.trim());
    }
  }

  // Settlements (registered members only)
  for (const s of settlements) {
    const fromId = s.fromUser.toString();
    const toId   = s.toUser.toString();
    const amtP   = Math.round(s.amount * 100);
    net.set(fromId, (net.get(fromId) ?? 0) + amtP);
    net.set(toId,   (net.get(toId)   ?? 0) - amtP);
  }

  const memberEntries: BalanceEntry[] = members.map((m) => {
    const id = m._id.toString();
    return {
      userId:     id,
      name:       m.name,
      email:      m.email,
      avatar:     m.avatar,
      totalPaid:  (paid.get(id) ?? 0) / 100,
      totalOwed:  (owed.get(id) ?? 0) / 100,
      netBalance: (net.get(id)  ?? 0) / 100,
      isGuest:    false,
    };
  });

  const guestEntries: BalanceEntry[] = Array.from(guestDisplay.entries()).map(([key, name]) => ({
    userId:     `guest:${key}`,
    name,
    email:      '',
    avatar:     '',
    totalPaid:  0,
    totalOwed:  (guestOwed.get(key) ?? 0) / 100,
    netBalance: (guestNet.get(key)  ?? 0) / 100,
    isGuest:    true,
  }));

  return [
    ...memberEntries,
    ...guestEntries.sort((a, b) => a.netBalance - b.netBalance),
  ];
}

export async function getMemberBalance(groupId: string, userId: string): Promise<BalanceEntry> {
  const user = await User.findById(userId).lean();
  const inGroup = !!user && (
    user.groupId?.toString() === groupId ||
    user.groupIds?.some((id) => id.toString() === groupId)
  );
  if (!inGroup) throw new AppError('User not in group', 404);

  const balances = await computeGroupBalances(groupId);
  return balances.find((b) => b.userId === userId) ?? {
    userId, name: user.name, email: user.email, avatar: user.avatar,
    totalPaid: 0, totalOwed: 0, netBalance: 0,
  };
}

// ─── Debt Simplification (members only — guests settle in cash) ───────────────

export async function simplifyDebts(groupId: string): Promise<DebtEdge[]> {
  const all      = await computeGroupBalances(groupId);
  const balances = all.filter((b) => !b.isGuest);

  const creditors = balances
    .filter((b) => b.netBalance > 0.005)
    .map((b) => ({ id: b.userId, name: b.name, amount: b.netBalance }));

  const debtors = balances
    .filter((b) => b.netBalance < -0.005)
    .map((b) => ({ id: b.userId, name: b.name, amount: -b.netBalance }));

  const transactions: DebtEdge[] = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor   = debtors[di];
    const amount   = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.005) {
      transactions.push({
        from: debtor.id, fromName: debtor.name,
        to:   creditor.id, toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.amount -= amount;
    debtor.amount   -= amount;
    if (creditor.amount < 0.005) ci++;
    if (debtor.amount   < 0.005) di++;
  }

  return transactions;
}
