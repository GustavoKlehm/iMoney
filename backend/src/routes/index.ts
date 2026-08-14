import { Router } from 'express';
import healthRoutes from './health.js';
import categoriesRoutes from './categories.js';
import accountsRoutes from './accounts.js';
import transactionsRoutes from './transactions.js';
import dashboardRoutes from './dashboard.js';
import budgetTemplatesRoutes from './budgetTemplates.js';
import budgetsRoutes from './budgets.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/categories', categoriesRoutes);
router.use('/accounts', accountsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/budget-templates', budgetTemplatesRoutes);
router.use('/budgets', budgetsRoutes);

export default router;
