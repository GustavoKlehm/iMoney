import { Router } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { accountBalance } from '../lib/accountBalance.js';
import { canBeDefault } from '../lib/accountRules.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isReserved: z.boolean().optional(),
  openingBalance: z.number().nonnegative().optional(),
});

async function sumParts(accountId: string) {
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

  const parts = {
    income: Number(incoming._sum.amount ?? 0),
    expense: Number(outgoing._sum.amount ?? 0),
    transferIn: Number(transfersIn._sum.amount ?? 0),
    transferOut: Number(transfersOut._sum.amount ?? 0),
  };

  return { ...parts, balance: accountBalance(parts) };
}

router.get('/', async (_req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => ({
        ...account,
        balance: (await sumParts(account.id)).balance,
      })),
    );

    res.json(accountsWithBalance);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { openingBalance, ...data } = createAccountSchema.parse(req.body);
    const account = await prisma.$transaction(async (tx) => {
      const commonAccountCount = data.isReserved
        ? 0
        : await tx.account.count({
            where: { isReserved: false, isActive: true },
          });
      const created = await tx.account.create({
        data: {
          ...data,
          isDefault: data.isReserved === true ? false : commonAccountCount === 0,
        },
      });

      if (openingBalance && openingBalance > 0) {
        await tx.transaction.create({
          data: {
            type: TransactionType.INCOME,
            amount: openingBalance,
            description: `Saldo inicial — ${created.name}`,
            date: new Date(),
            isOpeningBalance: true,
            accountId: created.id,
          },
        });
      }

      return created;
    });

    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/balance', async (req, res, next) => {
  try {
    const accountId = req.params.id;
    res.json({ accountId, ...(await sumParts(accountId)) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/default', async (req, res, next) => {
  try {
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: req.params.id },
    });

    if (!canBeDefault(account)) {
      throw new AppError(400, 'Cofrinho ou conta inativa não pode ser padrão');
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.account.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      return tx.account.update({
        where: { id: account.id },
        data: { isDefault: true },
      });
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = createAccountSchema
      .omit({ openingBalance: true })
      .partial()
      .extend({ isActive: z.boolean().optional() })
      .parse(req.body);
    const current = await prisma.account.findUniqueOrThrow({
      where: { id: req.params.id },
    });

    if (data.isReserved === true && current.isDefault) {
      throw new AppError(400, 'Conta padrão não pode virar cofrinho');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isActive === false && current.isDefault) {
        const replacement = await tx.account.findFirst({
          where: {
            id: { not: current.id },
            isReserved: false,
            isActive: true,
          },
          orderBy: { sortOrder: 'asc' },
        });

        if (!replacement) {
          throw new AppError(400, 'Cadastre outra conta antes de desativar a padrão');
        }

        await tx.account.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }

      return tx.account.update({
        where: { id: current.id },
        data: {
          ...data,
          ...(data.isActive === false && current.isDefault ? { isDefault: false } : {}),
        },
      });
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
