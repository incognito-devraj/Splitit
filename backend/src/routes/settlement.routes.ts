import { Router } from 'express';
import * as ctrl from '../controllers/settlement.controller';
import { authenticate, requireGroup } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { requestSettlementSchema, settlementIdSchema } from '../validators/settlement.validator';

/**
 * @swagger
 * tags:
 *   name: Settlements
 *   description: Settlement request, approval and history
 */

const router = Router();
router.use(authenticate, requireGroup);

/** @swagger
 * /settlements/request:
 *   post:
 *     summary: Request a settlement payment
 *     tags: [Settlements]
 */
router.post('/request', validate(requestSettlementSchema), ctrl.requestSettlement);

/** @swagger
 * /settlements/{id}/approve:
 *   post:
 *     summary: Approve a pending settlement (recipient or admin)
 *     tags: [Settlements]
 */
router.post('/:id/approve', validate(settlementIdSchema), ctrl.approveSettlement);

/** @swagger
 * /settlements/{id}/reject:
 *   post:
 *     summary: Reject a pending settlement (recipient or admin)
 *     tags: [Settlements]
 */
router.post('/:id/reject', validate(settlementIdSchema), ctrl.rejectSettlement);

/** @swagger
 * /settlements:
 *   get:
 *     summary: List all settlements for the group
 *     tags: [Settlements]
 */
router.get('/', ctrl.listSettlements);

export default router;
