import { Router } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { accountBalance } from '../lib/accountBalance.js';
import { canBeDefault } from '../lib/accountRules.js';
import { accountRemovalDecision } from '../lib/removalDecision.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isReserved: z.boolean().optional(),
  openingBalance: z.number().nonnegative().optional(),
});

async function findAccountOrThrow(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new AppError(404, 'Conta não encontrada');
  }

  return account;
}

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
      include: {
        _count: {
          select: {
            transactionsFrom: true,
            transactionsTo: true,
            plans: true,
            recurrences: true,
          },
        },
      },
    });
    const accountsWithBalance = await Promise.all(
      accounts.map(async ({ _count, ...account }) => ({
        ...account,
        balance: (await sumParts(account.id)).balance,
        hasHistory:
          _count.transactionsFrom + _count.transactionsTo + _count.plans + _count.recurrences > 0,
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
    await findAccountOrThrow(accountId);
    res.json({ accountId, ...(await sumParts(accountId)) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/default', async (req, res, next) => {
  try {
    const account = await findAccountOrThrow(req.params.id);

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
    const current = await findAccountOrThrow(req.params.id);

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

router.delete('/:id', async (req, res, next) => {
  try {
    const current = await findAccountOrThrow(req.params.id);
    const [fromCount, toCount, goalCount, recurrenceCount, otherDefault] = await Promise.all([
      prisma.transaction.count({ where: { accountId: current.id } }),
      prisma.transaction.count({ where: { toAccountId: current.id } }),
      prisma.plan.count({ where: { accountId: current.id } }),
      prisma.recurrence.count({ where: { accountId: current.id } }),
      prisma.account.findFirst({
        where: { id: { not: current.id }, isReserved: false, isActive: true },
      }),
    ]);
    const decision = accountRemovalDecision({
      hasTransactions: fromCount + toCount > 0,
      hasGoal: goalCount > 0,
      hasRecurrence: recurrenceCount > 0,
      isDefault: current.isDefault,
      hasOtherActiveCommonAccount: Boolean(otherDefault),
    });

    if (decision === 'reject-default') {
      throw new AppError(400, 'Cadastre outra conta antes de desativar a padrão');
    }

    if (decision === 'delete') {
      await prisma.account.delete({ where: { id: current.id } });
      return res.status(204).send();
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (current.isDefault) {
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
          isActive: false,
          ...(current.isDefault ? { isDefault: false } : {}),
        },
      });
    });

    res.json({ ...updated, deactivated: true });
  } catch (error) {
    next(error);
  }
});

export default router;
