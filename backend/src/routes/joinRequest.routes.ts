import { Router } from 'express';
import * as ctrl from '../controllers/joinRequest.controller';
import { authenticate, requireAdmin, requireGroup } from '../middleware/auth.middleware';
import { joinRequestLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createJoinRequestSchema,
  createJoinRequestByGroupSchema,
  joinRequestIdSchema,
  joinRequestStatusSchema,
} from '../validators/joinRequest.validator';

const router = Router();
router.use(authenticate);
router.use(joinRequestLimiter);

/** POST /api/join-requests — request to join a group via invite code */
router.post('/', validate(createJoinRequestSchema), ctrl.requestToJoin);

/** POST /api/join-requests/by-group/:groupId — request via group ID (Discover page) */
router.post('/by-group/:groupId', validate(createJoinRequestByGroupSchema), ctrl.requestToJoinById);

/** DELETE /api/join-requests/by-group/:groupId — cancel own request */
router.delete('/by-group/:groupId', ctrl.cancelRequestById);

/** GET /api/join-requests/status?inviteCode=XXX — check own request status */
router.get('/status', validate(joinRequestStatusSchema), ctrl.getMyRequest);

/** GET /api/join-requests/pending — list pending requests for all groups I admin */
router.get('/pending', requireGroup, ctrl.listPending);

/** POST /api/join-requests/:id/approve — approve (caller must own that request's group) */
router.post('/:id/approve', requireGroup, validate(joinRequestIdSchema), ctrl.approve);

/** POST /api/join-requests/:id/reject — reject (caller must own that request's group) */
router.post('/:id/reject', requireGroup, validate(joinRequestIdSchema), ctrl.reject);

export default router;
