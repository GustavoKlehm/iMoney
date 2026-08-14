import { Router } from 'express';
import { z } from 'zod';
import { Responsible, TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isReserved: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createAccountSchema.parse(req.body);
    const account = await prisma.account.create({ data });
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/balance', async (req, res, next) => {
  try {
    const accountId = req.params.id;

    const [incoming, outgoing, transfersIn, transfersOut] = await Promise.all([
      prisma.transaction.aggregate({
        where: { accountId, type: TransactionType.INCOME, isCancelled: false },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { accountId, type: TransactionType.EXPENSE, isCancelled: false },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { toAccountId: accountId, type: TransactionType.TRANSFER, isCancelled: false },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { accountId, type: TransactionType.TRANSFER, isCancelled: false },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incoming._sum.amount ?? 0);
    const expense = Number(outgoing._sum.amount ?? 0);
    const transferIn = Number(transfersIn._sum.amount ?? 0);
    const transferOut = Number(transfersOut._sum.amount ?? 0);
    const balance = income - expense + transferIn - transferOut;

    res.json({ accountId, balance, income, expense, transferIn, transferOut });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = createAccountSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data,
    });
    res.json(account);
  } catch (error) {
    next(error);
  }
});

export default router;
