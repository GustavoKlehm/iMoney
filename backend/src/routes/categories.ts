import { Router } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { categoryRemovalDecision } from '../lib/removalDecision.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const categoryCountSelect = {
  transactions: true,
  children: true,
  budgets: true,
  budgetTemplateLines: true,
  plans: true,
} as const;

function hasCategoryHistory(count: {
  transactions: number;
  children: number;
  budgets: number;
  budgetTemplateLines: number;
  plans: number;
}) {
  return categoryRemovalDecision({
    hasTransactions: count.transactions > 0,
    hasChildren: count.children > 0,
    hasBudgetLines: count.budgetTemplateLines > 0,
    hasBudgets: count.budgets > 0,
    hasPlans: count.plans > 0,
  }) === 'deactivate';
}

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(TransactionType),
  parentId: z.string().uuid().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: categoryCountSelect } },
        },
        _count: { select: categoryCountSelect },
      },
    });
    res.json(
      categories.map(({ _count, children, ...category }) => ({
        ...category,
        hasHistory: hasCategoryHistory(_count),
        children: children.map(({ _count: childCount, ...child }) => ({
          ...child,
          hasHistory: hasCategoryHistory(childCount),
        })),
      })),
    );
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { children: true, parent: true },
    });
    if (!category) throw new AppError(404, 'Categoria não encontrada');
    res.json(category);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
    });
    res.json(category);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Categoria não encontrada');

    const [transactions, children, budgetLines, budgets, plans] = await Promise.all([
      prisma.transaction.count({ where: { categoryId: req.params.id } }),
      prisma.category.count({ where: { parentId: req.params.id } }),
      prisma.budgetTemplateLine.count({ where: { categoryId: req.params.id } }),
      prisma.budget.count({ where: { categoryId: req.params.id } }),
      prisma.plan.count({ where: { categoryId: req.params.id } }),
    ]);
    const decision = categoryRemovalDecision({
      hasTransactions: transactions > 0,
      hasChildren: children > 0,
      hasBudgetLines: budgetLines > 0,
      hasBudgets: budgets > 0,
      hasPlans: plans > 0,
    });

    if (decision === 'deactivate') {
      const category = await prisma.category.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      return res.json({ ...category, deactivated: true });
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
