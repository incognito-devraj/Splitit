import { Router } from 'express';
import * as ctrl from '../controllers/summary.controller';
import { authenticate, requireGroup } from '../middleware/auth.middleware';

/**
 * @swagger
 * tags:
 *   name: Summary
 *   description: Reports and summaries
 */

const router = Router();
router.use(authenticate, requireGroup);

/** @swagger
 * /summary:
 *   get:
 *     summary: Full group summary with WhatsApp text
 *     tags: [Summary]
 */
router.get('/', ctrl.getSummary);

/** @swagger
 * /summary/monthly:
 *   get:
 *     summary: Monthly expense summary (?year=2025&month=5)
 *     tags: [Summary]
 */
router.get('/monthly', ctrl.getMonthlySummary);

/** @swagger
 * /summary/category:
 *   get:
 *     summary: Spending breakdown by category
 *     tags: [Summary]
 */
router.get('/category', ctrl.getCategoryBreakdown);

export default router;
