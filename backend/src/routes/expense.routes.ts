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

const router = Router();
router.use(authenticate, requireGroup);

router.post('/',    validate(createExpenseSchema),  ctrl.createExpense);
router.get('/',     validate(listExpensesSchema),   ctrl.listExpenses);
router.get('/guests', ctrl.listGroupGuests);         // GET /expenses/guests — autocomplete
router.get('/:id',  validate(expenseIdSchema),      ctrl.getExpense);
router.put('/:id',  validate(updateExpenseSchema),  ctrl.updateExpense);
router.delete('/:id', validate(expenseIdSchema),    ctrl.deleteExpense);
router.get('/:id/history', validate(expenseIdSchema), ctrl.getExpenseHistory);

export default router;
