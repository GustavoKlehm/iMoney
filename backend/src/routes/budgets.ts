import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const router = Router();

const periodSchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

const updateBudgetSchema = z.object({
  limitAmount: z.number().positive(),
});

router.get('/', async (req, res, next) => {
  try {
    const { year, month } = periodSchema.parse(req.query);
    const budgets = await prisma.budget.findMany({
      where: { year, month },
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
    });
    res.json(budgets);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateBudgetSchema.parse(req.body);
    const budget = await prisma.budget.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json(budget);
  } catch (error) {
    next(error);
  }
});

export default router;
