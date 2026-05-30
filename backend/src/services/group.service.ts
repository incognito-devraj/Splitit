import { Types } from 'mongoose';
import { Group, IGroup } from '../models/Group.model';
import { User, IUser } from '../models/User.model';
import { JoinRequest } from '../models/JoinRequest.model';
import { AppError } from '../middleware/error.middleware';
import { uniqueInviteCode } from '../utils/inviteCode';
import { logger } from '../utils/logger';

// ─── Create Group ─────────────────────────────────────────────────────────────

export async function createGroup(userId: string, name: string, description = '') {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.groupId) throw new AppError('You are already in a group', 409);

  const inviteCode = await uniqueInviteCode();
  const adminId = new Types.ObjectId(userId);

  const group = await Group.create({ name, description, inviteCode, adminId, members: [adminId] });

  user.groupId = group._id;
  user.role = 'admin';
  await user.save();

  logger.info(`Group created: "${name}" by ${user.email}`);
  return { group, user };
}

// ─── Join Group (direct, no approval) ────────────────────────────────────────

export async function joinGroup(userId: string, inviteCode: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.groupId) throw new AppError('You are already in a group', 409);

  const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!group) throw new AppError('Invalid invite code', 400);

  const uid = new Types.ObjectId(userId);
  if (!group.members.some((m) => m.equals(uid))) {
    group.members.push(uid);
    await group.save();
  }

  user.groupId = group._id;
  user.role = 'member';
  await user.save();

  logger.info(`${user.email} joined group "${group.name}"`);
  return { group, user };
}

// ─── Get Current Group ────────────────────────────────────────────────────────

export async function getCurrentGroup(userId: string) {
  const user = await User.findById(userId);
  if (!user?.groupId) throw new AppError('You are not in a group', 403);

  const group = await Group.findById(user.groupId)
    .populate<{ members: IUser[] }>('members', 'name email avatar role')
    .populate<{ adminId: IUser }>('adminId', 'name email avatar');

  if (!group) throw new AppError('Group not found', 404);
  return group;
}

// ─── Get Members ──────────────────────────────────────────────────────────────

export async function getMembers(groupId: string) {
  return User.find({ groupId: new Types.ObjectId(groupId) })
    .select('name email avatar role createdAt')
    .lean();
}

// ─── Remove Member ────────────────────────────────────────────────────────────

export async function removeMember(adminId: string, targetUserId: string) {
  const admin = await User.findById(adminId);
  if (!admin?.groupId) throw new AppError('Not in a group', 403);

  const group = await Group.findById(admin.groupId);
  if (!group) throw new AppError('Group not found', 404);

  if (group.adminId.toString() === targetUserId) {
    throw new AppError('Cannot remove the group admin', 403);
  }

  const target = await User.findById(targetUserId);
  if (!target || target.groupId?.toString() !== admin.groupId.toString()) {
    throw new AppError('User is not in your group', 404);
  }

  group.members = group.members.filter((m) => !m.equals(new Types.ObjectId(targetUserId)));
  await group.save();

  target.groupId = null;
  target.role = 'member';
  await target.save();

  logger.info(`Admin removed ${target.email} from group "${group.name}"`);
}

// ─── Transfer Admin ───────────────────────────────────────────────────────────

export async function transferAdmin(currentAdminId: string, newAdminId: string) {
  const admin = await User.findById(currentAdminId);
  if (!admin?.groupId) throw new AppError('Not in a group', 403);

  const group = await Group.findById(admin.groupId);
  if (!group) throw new AppError('Group not found', 404);
  if (group.adminId.toString() !== currentAdminId) throw new AppError('Not the admin', 403);

  const newAdmin = await User.findById(newAdminId);
  if (!newAdmin || newAdmin.groupId?.toString() !== admin.groupId.toString()) {
    throw new AppError('Target user is not in your group', 404);
  }

  group.adminId = new Types.ObjectId(newAdminId);
  await group.save();

  admin.role = 'member';
  await admin.save();

  newAdmin.role = 'admin';
  await newAdmin.save();

  logger.info(`Admin transferred from ${admin.email} to ${newAdmin.email}`);
  return group;
}

// ─── Leave Group ──────────────────────────────────────────────────────────────

export async function leaveGroup(userId: string) {
  const user = await User.findById(userId);
  if (!user?.groupId) throw new AppError('You are not in a group', 403);

  const group = await Group.findById(user.groupId);
  if (!group) throw new AppError('Group not found', 404);

  if (group.adminId.toString() === userId) {
    throw new AppError('Admin cannot leave. Transfer admin role first.', 403);
  }

  group.members = group.members.filter((m) => !m.equals(new Types.ObjectId(userId)));
  await group.save();

  user.groupId = null;
  user.role = 'member';
  await user.save();

  logger.info(`${user.email} left group "${group.name}"`);
}

// ─── Regenerate Invite Code ───────────────────────────────────────────────────

export async function regenerateInviteCode(adminId: string) {
  const admin = await User.findById(adminId);
  if (!admin?.groupId) throw new AppError('Not in a group', 403);

  const group = await Group.findById(admin.groupId);
  if (!group) throw new AppError('Group not found', 404);
  if (group.adminId.toString() !== adminId) throw new AppError('Admin only', 403);

  group.inviteCode = await uniqueInviteCode();
  await group.save();

  return group.inviteCode;
}

// ─── Discover Groups ──────────────────────────────────────────────────────────

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

  const filter: Record<string, unknown> = { isPublic: true };
  if (search.trim()) {
    filter.name = { $regex: search.trim(), $options: 'i' };
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

  // Fetch user's join requests for these groups in one query
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
      memberCount:     g.members.length,
      createdAt:       g.createdAt,
      myRequestStatus: (requestMap.get(g._id.toString()) ?? 'none') as DiscoverGroupItem['myRequestStatus'],
    })),
  };
}

// ─── Update Group Settings ────────────────────────────────────────────────────

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
