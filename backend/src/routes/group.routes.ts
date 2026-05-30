import { Router } from 'express';
import * as ctrl from '../controllers/group.controller';
import { authenticate, requireAdmin, requireGroup } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createGroupSchema,
  joinGroupSchema,
  memberIdSchema,
  transferAdminSchema,
} from '../validators/group.validator';

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: PG group management
 */

const router = Router();
router.use(authenticate);

/** @swagger
 * /groups/create:
 *   post:
 *     summary: Create a new PG group
 *     tags: [Groups]
 */
router.post('/create', validate(createGroupSchema), ctrl.createGroup);

/** @swagger
 * /groups/join:
 *   post:
 *     summary: Join a group via invite code
 *     tags: [Groups]
 */
router.post('/join', validate(joinGroupSchema), ctrl.joinGroup);

/** @swagger
 * /groups/current:
 *   get:
 *     summary: Get current group with members
 *     tags: [Groups]
 */
router.get('/current', requireGroup, ctrl.getCurrentGroup);

/** @swagger
 * /groups/members:
 *   get:
 *     summary: List all group members
 *     tags: [Groups]
 */
router.get('/members', requireGroup, ctrl.getMembers);

/** @swagger
 * /groups/leave:
 *   post:
 *     summary: Leave the current group
 *     tags: [Groups]
 */
router.post('/leave', requireGroup, ctrl.leaveGroup);

/** @swagger
 * /groups/transfer-admin:
 *   post:
 *     summary: Transfer admin role to another member
 *     tags: [Groups]
 */
router.post('/transfer-admin', requireGroup, requireAdmin, validate(transferAdminSchema), ctrl.transferAdmin);

/** @swagger
 * /groups/invite/regenerate:
 *   post:
 *     summary: Regenerate invite code (admin only)
 *     tags: [Groups]
 */
router.post('/invite/regenerate', requireGroup, requireAdmin, ctrl.regenerateInviteCode);

/** @swagger
 * /groups/member/{id}:
 *   delete:
 *     summary: Remove a member (admin only)
 *     tags: [Groups]
 */
router.delete('/member/:id', requireGroup, requireAdmin, validate(memberIdSchema), ctrl.removeMember);

export default router;
