import { Router } from 'express';
import { z } from 'zod';
import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { baseTransactionSchema, createTransactionSchema } from '../lib/transactionValidation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const listQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  includeCancelled: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: Prisma.TransactionWhereInput = {};

    if (!query.includeCancelled) where.isCancelled = false;
    if (query.type) where.type = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.accountId) {
      where.OR = [{ accountId: query.accountId }, { toAccountId: query.accountId }];
    }
    if (query.year && query.month) {
      const start = new Date(query.year, query.month - 1, 1);
      const end = new Date(query.year, query.month, 1);
      where.date = { gte: start, lt: end };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          account: true,
          toAccount: true,
          user: true,
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ data: transactions, total, limit: query.limit ?? 50, offset: query.offset ?? 0 });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        account: true,
        toAccount: true,
        user: true,
        auditLogs: { orderBy: { changedAt: 'desc' } },
      },
    });
    if (!transaction) throw new AppError(404, 'Lançamento não encontrado');
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createTransactionSchema.parse(req.body);

    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category?.isActive) throw new AppError(400, 'Categoria inativa ou inexistente');
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        date: new Date(data.date),
        amount: data.amount,
      },
      include: { category: true, account: true, toAccount: true },
    });

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Lançamento não encontrado');
    if (existing.isCancelled) throw new AppError(400, 'Lançamento cancelado não pode ser editado');

    const data = baseTransactionSchema.partial().parse(req.body);
    const auditFields: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

    for (const [key, value] of Object.entries(data)) {
      const oldVal = existing[key as keyof typeof existing];
      const newVal = key === 'date' && value ? new Date(value as string).toISOString().slice(0, 10) : String(value ?? '');
      const oldStr = oldVal instanceof Date ? oldVal.toISOString().slice(0, 10) : String(oldVal ?? '');
      if (oldStr !== newVal) {
        auditFields.push({ field: key, oldValue: oldStr, newValue: newVal });
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      if (auditFields.length > 0) {
        await tx.transactionAudit.createMany({
          data: auditFields.map((a) => ({
            transactionId: req.params.id,
            ...a,
          })),
        });
      }

      return tx.transaction.update({
        where: { id: req.params.id },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
        },
        include: { category: true, account: true, toAccount: true },
      });
    });

    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Lançamento não encontrado');
    if (existing.isCancelled) throw new AppError(400, 'Lançamento já cancelado');

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { isCancelled: true, cancelledAt: new Date() },
    });

    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

export default router;
