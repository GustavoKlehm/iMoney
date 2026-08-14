import { Router } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

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
        children: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { transactions: true } },
      },
    });
    res.json(categories);
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
    const count = await prisma.transaction.count({
      where: { categoryId: req.params.id },
    });

    if (count > 0) {
      const category = await prisma.category.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      return res.json({
        ...category,
        message: 'Categoria desativada (possui lançamentos vinculados)',
      });
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
