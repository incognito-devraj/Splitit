import { Router } from 'express';
import * as ctrl from '../controllers/group.controller';
import { authenticate, requireAdmin, requireGroup } from '../middleware/auth.middleware';
import { adminLimiter, publicLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createGroupSchema,
  joinGroupSchema,
  memberIdSchema,
  transferAdminSchema,
  updateGroupSettingsSchema,
  discoverGroupsSchema,
  setActiveGroupSchema,
} from '../validators/group.validator';

const router = Router();
router.use(authenticate);

router.post('/create',           validate(createGroupSchema),         ctrl.createGroup);
router.post('/join',             validate(joinGroupSchema),           ctrl.joinGroup);
router.get('/mine',               ctrl.getMyGroups);
router.patch('/active',           validate(setActiveGroupSchema),      ctrl.setActiveGroup);
router.get('/current',           requireGroup,                        ctrl.getCurrentGroup);
router.get('/members',           requireGroup,                        ctrl.getMembers);
router.post('/leave',            requireGroup,                        ctrl.leaveGroup);
router.patch('/settings',        requireGroup, requireAdmin, adminLimiter, validate(updateGroupSettingsSchema), ctrl.updateGroupSettings);
router.post('/transfer-admin',   requireGroup, requireAdmin, adminLimiter, validate(transferAdminSchema),       ctrl.transferAdmin);
router.post('/invite/regenerate',requireGroup, requireAdmin, adminLimiter,                                      ctrl.regenerateInviteCode);
router.delete('/member/:id',     requireGroup, requireAdmin, adminLimiter, validate(memberIdSchema),            ctrl.removeMember);

// Discover — no requireGroup (users without a group can browse)
router.get('/discover',          publicLimiter, validate(discoverGroupsSchema),      ctrl.discoverGroups);

export default router;
