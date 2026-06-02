import { type ClientSession, Types } from 'mongoose';
import { Group, IGroup } from '../models/Group.model';
import { User, IUser } from '../models/User.model';
import { JoinRequest } from '../models/JoinRequest.model';
import { Expense } from '../models/Expense.model';
import { Settlement } from '../models/Settlement.model';
import { ExpenseAudit } from '../models/ExpenseAudit.model';
import { computeGroupBalances } from './balance.service';
import { AppError } from '../middleware/error.middleware';
import { uniqueInviteCode } from '../utils/inviteCode';
import { logger } from '../utils/logger';
import { withMongoTransaction } from '../utils/mongo';

type GroupSummary = {
  _id: string;
  name: string;
  description: string;
  inviteCode: string;
  adminId: string | IUser;
  members: IUser[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

async function ensureMembershipSnapshot(user: IUser, session?: ClientSession) {
  if (!user.groupIds.length && user.groupId) {
    user.groupIds = [user.groupId];
    await user.save({ session });
  }
}

async function setActiveGroup(user: IUser, groupId: Types.ObjectId | null, session?: ClientSession) {
  user.groupId = groupId;
  if (groupId && !user.groupIds.some((existing) => existing.equals(groupId))) {
    user.groupIds.push(groupId);
  }
  await user.save({ session });
}

function uniqueGroupIds(user: IUser): Types.ObjectId[] {
  const seen = new Set<string>();
  const ids: Types.ObjectId[] = [];

  for (const id of [...user.groupIds, ...(user.groupId ? [user.groupId] : [])]) {
    const key = id.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(id);
  }

  return ids;
}

// ─── Create Group ─────────────────────────────────────────────────────────────

export async function createGroup(userId: string, name: string, description = '') {
  return withMongoTransaction('createGroup', async (session) => {
    const user = await User.findById(userId).session(session ?? null);
    if (!user) throw new AppError('User not found', 404);
    await ensureMembershipSnapshot(user, session);

    const inviteCode = await uniqueInviteCode();
    const adminId = new Types.ObjectId(userId);

    const [group] = await Group.create([{
      name,
      description,
      inviteCode,
      adminId,
      members: [adminId],
    }], { session });

    if (!user.groupIds.some((id) => id.equals(group._id))) {
      user.groupIds.push(group._id);
    }
    user.role = 'admin';
    await setActiveGroup(user, group._id, session);

    logger.info(`Group created: "${name}" by ${user.email}`);
    return { group, user };
  });
}

// ─── Join Group ───────────────────────────────────────────────────────────────

export async function joinGroup(userId: string, inviteCode: string) {
  return withMongoTransaction('joinGroup', async (session) => {
    const user = await User.findById(userId).session(session ?? null);
    if (!user) throw new AppError('User not found', 404);
    await ensureMembershipSnapshot(user, session);

    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() }).session(session ?? null);
    if (!group) throw new AppError('Invalid invite code', 400);

    if (user.groupIds.some((existing) => existing.equals(group._id))) {
      throw new AppError('You are already a member of this group', 409);
    }

    const uid = new Types.ObjectId(userId);
    if (!group.members.some((m) => m.equals(uid))) {
      group.members.push(uid);
      await group.save({ session });
    }

    user.groupIds.push(group._id);
    user.role = 'member';
    await setActiveGroup(user, group._id, session);

    logger.info(`${user.email} joined group "${group.name}"`);
    return { group, user };
  });
}

// ─── Current / memberships ────────────────────────────────────────────────────

export async function getCurrentGroup(userId: string) {
  const user = await User.findById(userId);
  if (!user?.groupId) throw new AppError('You are not in a group', 403);

  const group = await Group.findById(user.groupId)
    .populate<{ members: IUser[] }>('members', 'name email avatar role')
    .populate<{ adminId: IUser }>('adminId', 'name email avatar');

  if (!group) throw new AppError('Group not found', 404);
  return group;
}

export async function getMyGroups(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  await ensureMembershipSnapshot(user);

  const groupIds = uniqueGroupIds(user);
  if (groupIds.length === 0) return [];

  const groups = await Group.find({ _id: { $in: groupIds } })
    .select('name description inviteCode adminId members isPublic createdAt updatedAt')
    .populate<{ adminId: IUser }>('adminId', 'name email avatar')
    .populate<{ members: IUser[] }>('members', 'name email avatar role')
    .lean<GroupSummary[]>();

  return groups.map((group) => ({
    ...group,
    _id: group._id.toString(),
    adminId: typeof group.adminId === 'object' && group.adminId !== null
      ? group.adminId
      : group.adminId.toString(),
    members: Array.isArray(group.members) ? group.members : [],
  }));
}

export async function setActiveGroupForUser(userId: string, groupId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  await ensureMembershipSnapshot(user);

  const gid = new Types.ObjectId(groupId);
  const isMember = user.groupIds.some((id) => id.equals(gid)) || (user.groupId?.equals(gid) ?? false);
  if (!isMember) throw new AppError('You are not a member of that group', 403);

  // Update role to reflect the correct role in the target group
  const group = await Group.findById(gid)
    .populate<{ members: IUser[] }>('members', 'name email avatar role')
    .populate<{ adminId: IUser }>('adminId', 'name email avatar');
  if (!group) throw new AppError('Group not found', 404);

  user.role = group.adminId.toString() === userId ? 'admin' : 'member';
  await setActiveGroup(user, gid);

  return group;
}

// ─── Member actions ──────────────────────────────────────────────────────────

export async function getMembers(groupId: string) {
  const gid = new Types.ObjectId(groupId);
  return User.find({
    $or: [{ groupId: gid }, { groupIds: gid }],
  })
    .select('name email avatar role createdAt')
    .lean();
}

export async function removeMember(adminId: string, targetUserId: string) {
  return withMongoTransaction('removeMember', async (session) => {
    const admin = await User.findById(adminId).session(session ?? null);
    if (!admin?.groupId) throw new AppError('Not in a group', 403);

    const group = await Group.findById(admin.groupId).session(session ?? null);
    if (!group) throw new AppError('Group not found', 404);

    if (group.adminId.toString() === targetUserId) {
      throw new AppError('Cannot remove the group admin', 403);
    }

    const target = await User.findById(targetUserId).session(session ?? null);
    if (!target) throw new AppError('User not found', 404);

    const targetMembership = target.groupIds.some((id) => id.equals(group._id)) || target.groupId?.toString() === group._id.toString();
    if (!targetMembership) {
      throw new AppError('User is not in your group', 404);
    }

    group.members = group.members.filter((m) => !m.equals(new Types.ObjectId(targetUserId)));
    await group.save({ session });

    target.groupIds = target.groupIds.filter((id) => !id.equals(group._id));
    if (target.groupId?.toString() === group._id.toString()) {
      target.groupId = target.groupIds[0] ?? null;
    }
    await target.save({ session });

    logger.info(`Admin removed ${target.email} from group "${group.name}"`);
  });
}

export async function transferAdmin(currentAdminId: string, newAdminId: string) {
  return withMongoTransaction('transferAdmin', async (session) => {
    const admin = await User.findById(currentAdminId).session(session ?? null);
    if (!admin?.groupId) throw new AppError('Not in a group', 403);

    const group = await Group.findById(admin.groupId).session(session ?? null);
    if (!group) throw new AppError('Group not found', 404);
    if (group.adminId.toString() !== currentAdminId) throw new AppError('Not the admin', 403);

    const newAdmin = await User.findById(newAdminId).session(session ?? null);
    if (!newAdmin) throw new AppError('Target user not found', 404);
    const isMember = newAdmin.groupIds.some((id) => id.equals(group._id)) || newAdmin.groupId?.toString() === group._id.toString();
    if (!isMember) {
      throw new AppError('Target user is not in your group', 404);
    }

    group.adminId = new Types.ObjectId(newAdminId);
    await group.save({ session });

    admin.role = 'member';
    await admin.save({ session });

    newAdmin.role = 'admin';
    await newAdmin.save({ session });

    logger.info(`Admin transferred from ${admin.email} to ${newAdmin.email}`);
    return group;
  });
}

export async function leaveGroup(userId: string) {
  return withMongoTransaction('leaveGroup', async (session) => {
    const user = await User.findById(userId).session(session ?? null);
    if (!user?.groupId) throw new AppError('You are not in a group', 403);

    const group = await Group.findById(user.groupId).session(session ?? null);
    if (!group) throw new AppError('Group not found', 404);

    if (group.adminId.toString() === userId) {
      throw new AppError('Admin cannot leave. Transfer admin role first.', 403);
    }

    group.members = group.members.filter((m) => !m.equals(new Types.ObjectId(userId)));
    await group.save({ session });

    user.groupIds = user.groupIds.filter((id) => !id.equals(group._id));
    user.groupId = user.groupIds[0] ?? null;
    await user.save({ session });

    logger.info(`${user.email} left group "${group.name}"`);
  });
}

export async function regenerateInviteCode(adminId: string) {
  return withMongoTransaction('regenerateInviteCode', async (session) => {
    const admin = await User.findById(adminId).session(session ?? null);
    if (!admin?.groupId) throw new AppError('Not in a group', 403);

    const group = await Group.findById(admin.groupId).session(session ?? null);
    if (!group) throw new AppError('Group not found', 404);
    if (group.adminId.toString() !== adminId) throw new AppError('Admin only', 403);

    group.inviteCode = await uniqueInviteCode();
    await group.save({ session });

    return group.inviteCode;
  });
}

// ─── Discovery / settings ────────────────────────────────────────────────────

export interface DiscoverGroupItem {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: Date;
  myRequestStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

export async function discoverGroups(
  userId: string,
  search = '',
  page = 1,
  limit = 20,
): Promise<{ groups: DiscoverGroupItem[]; total: number }> {
  const skip = (page - 1) * limit;

  const user = await User.findById(userId).select('groupIds groupId').lean();
  const memberships = new Set<string>(
    [...(user?.groupIds ?? []), ...(user?.groupId ? [user.groupId] : [])].map((id) => id.toString()),
  );

  const filter: Record<string, unknown> = { isPublic: true };
  if (search.trim()) {
    filter.name = { $regex: search.trim(), $options: 'i' };
  }
  if (memberships.size > 0) {
    filter._id = { $nin: [...memberships].map((id) => new Types.ObjectId(id)) };
  }

  const [groups, total] = await Promise.all([
    Group.find(filter)
      .select('name description members createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Group.countDocuments(filter),
  ]);

  const groupIds = groups.map((g) => g._id);
  const myRequests = await JoinRequest.find({
    groupId: { $in: groupIds },
    userId:  new Types.ObjectId(userId),
  })
    .select('groupId status')
    .lean();

  const requestMap = new Map(myRequests.map((r) => [r.groupId.toString(), r.status]));

  return {
    total,
    groups: groups.map((g) => ({
      _id:             g._id.toString(),
      name:            g.name,
      description:     g.description ?? '',
      memberCount:     Array.isArray(g.members) ? g.members.length : 0,
      createdAt:       g.createdAt,
      myRequestStatus: (requestMap.get(g._id.toString()) ?? 'none') as DiscoverGroupItem['myRequestStatus'],
    })),
  };
}

export async function updateGroupSettings(
  adminId: string,
  updates: { name?: string; description?: string; isPublic?: boolean },
) {
  const admin = await User.findById(adminId);
  if (!admin?.groupId) throw new AppError('Not in a group', 403);

  const group = await Group.findById(admin.groupId);
  if (!group) throw new AppError('Group not found', 404);
  if (group.adminId.toString() !== adminId) throw new AppError('Admin only', 403);

  if (updates.name        !== undefined) group.name        = updates.name;
  if (updates.description !== undefined) group.description = updates.description;
  if (updates.isPublic    !== undefined) group.isPublic    = updates.isPublic;

  await group.save();
  logger.info(`Group settings updated by ${admin.email}`);
  return group;
}

// ─── Export & Clear ───────────────────────────────────────────────────────────

export async function generateExpenseReport(groupId: string): Promise<string> {
  const gid = new Types.ObjectId(groupId);

  const group = await Group.findById(gid).lean();
  if (!group) throw new AppError('Group not found', 404);

  const expenses = await Expense.find({ groupId: gid })
    .populate('paidBy', 'name')
    .populate('sharedWith', 'name')
    .populate('guestParticipants', 'name')
    .sort({ createdAt: 1 })
    .lean();

  const balances = await computeGroupBalances(groupId);

  // Build report header
  let report = `Group: ${group.name}\n\n`;

  // Expenses section
  report += 'Expenses:\n';
  if (expenses.length === 0) {
    report += 'No expenses recorded\n';
  } else {
    for (const expense of expenses) {
      const date = new Date(expense.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const payer = (expense.paidBy as any)?.name ?? 'Unknown';
      const amount = `₹${expense.amount.toLocaleString('en-IN')}`;
      const title = expense.title || expense.category;

      report += `${date} ${payer} paid ${amount} for ${title}\n`;

      // Add participants
      const participants: string[] = [];
      if (expense.sharedWith) {
        participants.push(...(expense.sharedWith as any[]).map((m: any) => m.name));
      }
      if (expense.guestParticipants) {
        participants.push(...(expense.guestParticipants as any[]).map((g: any) => g.name));
      }

      if (participants.length > 0) {
        report += `  Split among: ${participants.join(', ')}\n`;
      }
    }
  }

  // Final balances section
  report += '\nFinal Balances:\n';
  const settlements = balances
    .filter((b) => b.netBalance < -0.5)
    .map((debtor) => {
      const creditors = balances.filter((c) => c.netBalance > 0.5);
      if (creditors.length === 0) return null;

      // Simple settlement: debtor owes to the largest creditor
      const creditor = creditors.reduce((max, c) => (c.netBalance > max.netBalance ? c : max));
      return {
        fromName: debtor.name,
        toName: creditor.name,
        amount: Math.abs(debtor.netBalance),
      };
    })
    .filter((s) => s !== null);

  if (settlements.length === 0) {
    report += 'All settled up!\n';
  } else {
    for (const settlement of settlements) {
      report += `${settlement!.fromName} owes ${settlement!.toName} ₹${settlement!.amount.toLocaleString('en-IN')}\n`;
    }
  }

  // Add generation timestamp
  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  report += `\nGenerated on: ${timestamp}\n`;

  logger.info(`Expense report generated for group ${groupId}`);
  return report;
}

export async function clearAllExpenses(groupId: string, adminId: string) {
  return withMongoTransaction('clearAllExpenses', async (session) => {
    const group = await Group.findById(groupId).session(session ?? null);
    if (!group) throw new AppError('Group not found', 404);

    // Verify caller is the group admin — not role field (which can be stale)
    if (group.adminId.toString() !== adminId) {
      throw new AppError('Only the group admin can clear expenses', 403);
    }

    const gid = new Types.ObjectId(groupId);

    const expenseResult = await Expense.deleteMany({ groupId: gid }, { session });
    const settlementResult = await Settlement.deleteMany({ groupId: gid }, { session });
    await ExpenseAudit.deleteMany({ groupId: gid }, { session });

    logger.info(
      `Cleared ${expenseResult.deletedCount} expenses and ${settlementResult.deletedCount} settlements for group ${groupId} by admin ${adminId}`,
    );

    return {
      success: true,
      message: 'All expense records have been cleared successfully.',
      deletedExpenses: expenseResult.deletedCount,
      deletedSettlements: settlementResult.deletedCount,
    };
  });
}
