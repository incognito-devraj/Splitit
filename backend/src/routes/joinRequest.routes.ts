import { Router } from 'express';
import * as ctrl from '../controllers/joinRequest.controller';
import { authenticate, requireAdmin, requireGroup } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createJoinRequestSchema,
  createJoinRequestByGroupSchema,
  joinRequestIdSchema,
  joinRequestStatusSchema,
} from '../validators/joinRequest.validator';

const router = Router();
router.use(authenticate);

/** POST /api/join-requests — request to join a group via invite code */
router.post('/', validate(createJoinRequestSchema), ctrl.requestToJoin);

/** POST /api/join-requests/by-group/:groupId — request via group ID (Discover page) */
router.post('/by-group/:groupId', validate(createJoinRequestByGroupSchema), ctrl.requestToJoinById);

/** DELETE /api/join-requests/by-group/:groupId — cancel own request */
router.delete('/by-group/:groupId', ctrl.cancelRequestById);

/** GET /api/join-requests/status?inviteCode=XXX — check own request status */
router.get('/status', validate(joinRequestStatusSchema), ctrl.getMyRequest);

/** GET /api/join-requests/pending — admin: list pending requests */
router.get('/pending', requireGroup, requireAdmin, ctrl.listPending);

/** POST /api/join-requests/:id/approve — admin: approve */
router.post('/:id/approve', requireGroup, requireAdmin, validate(joinRequestIdSchema), ctrl.approve);

/** POST /api/join-requests/:id/reject — admin: reject */
router.post('/:id/reject', requireGroup, requireAdmin, validate(joinRequestIdSchema), ctrl.reject);

export default router;
