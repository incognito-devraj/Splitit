import { Types } from 'mongoose';
import { Settlement } from '../models/Settlement.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/error.middleware';
import { computeGroupBalances } from './balance.service';
import { logger } from '../utils/logger';

// ─── Request Settlement ───────────────────────────────────────────────────────

export async function requestSettlement(
  fromUserId: string,
  groupId: string,
  toUserId: string,
  amount: number,
  note?: string,
) {
  if (fromUserId === toUserId) throw new AppError('Cannot settle with yourself', 400);

  const toUser = await User.findById(toUserId).lean();
  if (!toUser || toUser.groupId?.toString() !== groupId) {
    throw new AppError('Recipient is not in your group', 404);
  }

  const settlement = await Settlement.create({
    fromUser: new Types.ObjectId(fromUserId),
    toUser:   new Types.ObjectId(toUserId),
    amount,
    groupId:  new Types.ObjectId(groupId),
    note:     note ?? '',
    status:   'pending',
  });

  logger.info(`Settlement requested: ₹${amount} from ${fromUserId} to ${toUserId}`);
  return populateSettlement(settlement._id.toString());
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export async function approveSettlement(settlementId: string, approverId: string, groupId: string) {
  const s = await Settlement.findById(settlementId);
  if (!s || s.groupId.toString() !== groupId) throw new AppError('Settlement not found', 404);
  if (s.status !== 'pending') throw new AppError(`Settlement is already ${s.status}`, 409);

  // Only the recipient (toUser) or admin can approve
  const approver = await User.findById(approverId).lean();
  const isAdmin  = approver?.role === 'admin';
  const isRecipient = s.toUser.toString() === approverId;

  if (!isAdmin && !isRecipient) {
    throw new AppError('Only the recipient or admin can approve', 403);
  }

  s.status     = 'approved';
  s.resolvedAt = new Date();
  await s.save();

  const balances = await computeGroupBalances(groupId);
  logger.info(`Settlement ${settlementId} approved`);
  return { settlement: await populateSettlement(settlementId), balances };
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export async function rejectSettlement(settlementId: string, rejecterId: string, groupId: string) {
  const s = await Settlement.findById(settlementId);
  if (!s || s.groupId.toString() !== groupId) throw new AppError('Settlement not found', 404);
  if (s.status !== 'pending') throw new AppError(`Settlement is already ${s.status}`, 409);

  const rejecter = await User.findById(rejecterId).lean();
  const isAdmin  = rejecter?.role === 'admin';
  const isRecipient = s.toUser.toString() === rejecterId;

  if (!isAdmin && !isRecipient) {
    throw new AppError('Only the recipient or admin can reject', 403);
  }

  s.status     = 'rejected';
  s.resolvedAt = new Date();
  await s.save();

  logger.info(`Settlement ${settlementId} rejected`);
  return populateSettlement(settlementId);
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listSettlements(groupId: string) {
  return Settlement.find({ groupId: new Types.ObjectId(groupId) })
    .populate('fromUser', 'name email avatar')
    .populate('toUser',   'name email avatar')
    .sort({ createdAt: -1 })
    .lean();
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function populateSettlement(id: string) {
  return Settlement.findById(id)
    .populate('fromUser', 'name email avatar')
    .populate('toUser',   'name email avatar')
    .lean();
}
