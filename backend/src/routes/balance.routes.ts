import { Router } from 'express';
import * as ctrl from '../controllers/balance.controller';
import { authenticate, requireGroup } from '../middleware/auth.middleware';

/**
 * @swagger
 * tags:
 *   name: Balances
 *   description: Balance engine — derived from expenses + settlements
 */

const router = Router();
router.use(authenticate, requireGroup);

/** @swagger
 * /balances:
 *   get:
 *     summary: Get all member balances (positive=receivable, negative=owes)
 *     tags: [Balances]
 */
router.get('/', ctrl.getGroupBalances);

/** @swagger
 * /balances/simplified:
 *   get:
 *     summary: Minimised settlement suggestions (debt simplification)
 *     tags: [Balances]
 */
router.get('/simplified', ctrl.getSimplifiedDebts);

/** @swagger
 * /balances/{userId}:
 *   get:
 *     summary: Get balance for a specific member
 *     tags: [Balances]
 */
router.get('/:userId', ctrl.getMemberBalance);

export default router;
