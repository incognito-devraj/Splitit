import { Router } from 'express';
import * as ctrl from '../controllers/expense.controller';
import { authenticate, requireGroup } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdSchema,
  listExpensesSchema,
} from '../validators/expense.validator';

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Expense management
 */

const router = Router();
router.use(authenticate, requireGroup);

/** @swagger
 * /expenses:
 *   post:
 *     summary: Add expense (paidBy = logged-in user)
 *     tags: [Expenses]
 */
router.post('/', validate(createExpenseSchema), ctrl.createExpense);

/** @swagger
 * /expenses:
 *   get:
 *     summary: List expenses with filters & pagination
 *     tags: [Expenses]
 */
router.get('/', validate(listExpensesSchema), ctrl.listExpenses);

/** @swagger
 * /expenses/{id}:
 *   get:
 *     summary: Get single expense
 *     tags: [Expenses]
 */
router.get('/:id', validate(expenseIdSchema), ctrl.getExpense);

/** @swagger
 * /expenses/{id}:
 *   put:
 *     summary: Edit expense (payer or admin)
 *     tags: [Expenses]
 */
router.put('/:id', validate(updateExpenseSchema), ctrl.updateExpense);

/** @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Delete expense (payer or admin)
 *     tags: [Expenses]
 */
router.delete('/:id', validate(expenseIdSchema), ctrl.deleteExpense);

/** @swagger
 * /expenses/{id}/history:
 *   get:
 *     summary: Get audit trail for an expense
 *     tags: [Expenses]
 */
router.get('/:id/history', validate(expenseIdSchema), ctrl.getExpenseHistory);

export default router;
