import { Types } from 'mongoose';
import { JoinRequest, MemberType } from '../models/JoinRequest.model';
import { Group } from '../models/Group.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function createRequest(
  userId: string,
  group: { _id: Types.ObjectId; name: string },
  memberType: MemberType,
  message: string,
) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.groupIds.some((id) => id.equals(group._id)) || user.groupId?.toString() === group._id.toString()) {
    throw new AppError('You are already a member of this group', 409);
  }

  // Check for existing pending request
  const existing = await JoinRequest.findOne({
    groupId: group._id,
    userId:  new Types.ObjectId(userId),
    status:  'pending',
  });
  if (existing) throw new AppError('You already have a pending request for this group', 409);

  const req = await JoinRequest.create({
    groupId:    group._id,
    userId:     new Types.ObjectId(userId),
    memberType,
    message,
    status:     'pending',
  });

  logger.info(`Join request: ${user.email} → group "${group.name}" (${memberType})`);
  return { request: req, groupName: group.name };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** User requests to join a group via invite code */
export async function requestToJoin(
  userId: string,
  inviteCode: string,
  memberType: MemberType = 'permanent',
  message = '',
) {
  const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!group) throw new AppError('Invalid invite code', 400);
  return createRequest(userId, group, memberType, message);
}

/** User requests to join a group via group ID (from Discover page) */
export async function requestToJoinById(
  userId: string,
  groupId: string,
  memberType: MemberType = 'permanent',
  message = '',
) {
  const group = await Group.findById(groupId);
  if (!group) throw new AppError('Group not found', 404);
  if (!group.isPublic) throw new AppError('This group is not open for discovery', 403);
  return createRequest(userId, group, memberType, message);
}

/** User cancels their own pending request for a group */
export async function cancelRequestById(userId: string, groupId: string) {
  const req = await JoinRequest.findOne({
    groupId: new Types.ObjectId(groupId),
    userId:  new Types.ObjectId(userId),
    status:  'pending',
  });
  if (!req) throw new AppError('No pending request found for this group', 404);
  await req.deleteOne();
  logger.info(`Join request cancelled: userId=${userId} groupId=${groupId}`);
}

/** Admin lists pending join requests for their group */
export async function listPendingRequests(adminId: string) {
  const admin = await User.findById(adminId);
  if (!admin?.groupId) throw new AppError('Not in a group', 403);

  return JoinRequest.find({ groupId: admin.groupId, status: 'pending' })
    .populate('userId', 'name email avatar')
    .sort({ createdAt: 1 })
    .lean();
}

/** Admin approves a join request */
export async function approveRequest(adminId: string, requestId: string) {
  const admin = await User.findById(adminId);
  if (!admin?.groupId) throw new AppError('Not in a group', 403);
  if (admin.role !== 'admin') throw new AppError('Admin only', 403);

  const joinReq = await JoinRequest.findById(requestId);
  if (!joinReq || joinReq.groupId.toString() !== admin.groupId.toString()) {
    throw new AppError('Request not found', 404);
  }
  if (joinReq.status !== 'pending') throw new AppError(`Request already ${joinReq.status}`, 409);

  const group = await Group.findById(admin.groupId);
  if (!group) throw new AppError('Group not found', 404);

  const targetUser = await User.findById(joinReq.userId);
  if (!targetUser) throw new AppError('User not found', 404);

  // Add to group
  const uid = new Types.ObjectId(joinReq.userId.toString());
  if (!group.members.some((m) => m.equals(uid))) {
    group.members.push(uid);
    await group.save();
  }

  // Update user
  targetUser.groupId = group._id;
  if (!targetUser.groupIds.some((id) => id.equals(group._id))) {
    targetUser.groupIds.push(group._id);
  }
  targetUser.role = 'member';
  await targetUser.save();

  // Mark request approved
  joinReq.status = 'approved';
  joinReq.resolvedBy = new Types.ObjectId(adminId);
  await joinReq.save();

  logger.info(`Join approved: ${targetUser.email} → "${group.name}" as ${joinReq.memberType}`);
  return joinReq;
}

/** Admin rejects a join request */
export async function rejectRequest(adminId: string, requestId: string) {
  const admin = await User.findById(adminId);
  if (!admin?.groupId) throw new AppError('Not in a group', 403);
  if (admin.role !== 'admin') throw new AppError('Admin only', 403);

  const joinReq = await JoinRequest.findById(requestId);
  if (!joinReq || joinReq.groupId.toString() !== admin.groupId.toString()) {
    throw new AppError('Request not found', 404);
  }
  if (joinReq.status !== 'pending') throw new AppError(`Request already ${joinReq.status}`, 409);

  joinReq.status = 'rejected';
  joinReq.resolvedBy = new Types.ObjectId(adminId);
  await joinReq.save();

  return joinReq;
}

/** Get user's own join request status */
export async function getMyRequest(userId: string, inviteCode: string) {
  const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!group) throw new AppError('Invalid invite code', 400);

  const req = await JoinRequest.findOne({
    groupId: group._id,
    userId:  new Types.ObjectId(userId),
  }).sort({ createdAt: -1 });

  return { group: { name: group.name, _id: group._id }, request: req };
}
