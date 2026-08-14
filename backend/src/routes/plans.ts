import { Router } from 'express';
import { PlanStatus, PlanType, TransactionType } from '@prisma/client';
import { z } from 'zod';
import { accountBalance } from '../lib/accountBalance.js';
import { isGoalAchieved, monthlyReserve, monthsRemaining } from '../lib/goal.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  accountId: z.string().uuid(),
  targetAmount: z.number().positive(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date(),
});

const updateGoalSchema = createGoalSchema
  .omit({ startDate: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

async function balanceOf(accountId: string): Promise<number> {
  const [income, expense, transferIn, transferOut] = await Promise.all([
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

  return accountBalance({
    income: Number(income._sum.amount ?? 0),
    expense: Number(expense._sum.amount ?? 0),
    transferIn: Number(transferIn._sum.amount ?? 0),
    transferOut: Number(transferOut._sum.amount ?? 0),
  });
}

async function reservedAccountOrThrow(accountId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new AppError(404, 'Cofrinho não encontrado');
  if (!account.isReserved || !account.isActive) {
    throw new AppError(400, 'Selecione um cofrinho ativo');
  }
  return account;
}

async function assertNoActiveGoal(accountId: string, exceptId?: string) {
  const activeGoal = await prisma.plan.findFirst({
    where: {
      accountId,
      type: PlanType.GOAL,
      status: PlanStatus.ACTIVE,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
  if (activeGoal) {
    throw new AppError(400, 'Este cofrinho já tem um objetivo ativo');
  }
}

function dateValue(date: Date | null): string | null {
  return date?.toISOString() ?? null;
}

router.get('/', async (_req, res, next) => {
  try {
    const goals = await prisma.plan.findMany({
      where: { type: PlanType.GOAL },
      include: { account: true },
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    });

    const response = await Promise.all(
      goals.map(async (goal) => {
        if (!goal.accountId) return null;
        const currentAmount = await balanceOf(goal.accountId);
        const targetAmount = Number(goal.targetAmount);
        const achieved = isGoalAchieved(targetAmount, currentAmount);
        let status = goal.status;

        if (goal.status === PlanStatus.ACTIVE && achieved) {
          await prisma.plan.update({
            where: { id: goal.id },
            data: { status: PlanStatus.ACHIEVED },
          });
          status = PlanStatus.ACHIEVED;
        }

        const remainingMonths = goal.endDate
          ? monthsRemaining(new Date(), goal.endDate)
          : null;

        return {
          ...goal,
          status,
          targetAmount,
          currentAmount,
          remaining: Math.max(targetAmount - currentAmount, 0),
          progress: targetAmount > 0
            ? Math.min(Math.round((currentAmount / targetAmount) * 1000) / 10, 100)
            : 0,
          monthsRemaining: remainingMonths,
          monthlyReserve: monthlyReserve(targetAmount, currentAmount, remainingMonths),
        };
      }),
    );

    res.json(response.filter((goal) => goal !== null));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createGoalSchema.parse(req.body);
    await reservedAccountOrThrow(data.accountId);
    await assertNoActiveGoal(data.accountId);

    const goal = await prisma.plan.create({
      data: {
        ...data,
        startDate: data.startDate ?? new Date(),
        type: PlanType.GOAL,
      },
      include: { account: true },
    });
    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateGoalSchema.parse(req.body);
    const current = await prisma.plan.findFirst({
      where: { id: req.params.id, type: PlanType.GOAL },
      include: { account: true },
    });
    if (!current || !current.accountId) {
      throw new AppError(404, 'Objetivo não encontrado');
    }

    const accountId = data.accountId ?? current.accountId;
    if (data.accountId !== undefined) {
      await reservedAccountOrThrow(data.accountId);
      if (data.accountId !== current.accountId) {
        await assertNoActiveGoal(data.accountId, current.id);
      }
    }

    const targetAmount = data.targetAmount ?? Number(current.targetAmount);
    const balance = await balanceOf(accountId);
    const status = isGoalAchieved(targetAmount, balance)
      ? PlanStatus.ACHIEVED
      : PlanStatus.ACTIVE;

    if (status === PlanStatus.ACTIVE) {
      await assertNoActiveGoal(accountId, current.id);
    }

    const auditEntries = [
      ...(data.targetAmount !== undefined && data.targetAmount !== Number(current.targetAmount)
        ? [{
            planId: current.id,
            field: 'targetAmount',
            oldValue: String(Number(current.targetAmount)),
            newValue: String(data.targetAmount),
          }]
        : []),
      ...(data.endDate !== undefined && dateValue(data.endDate) !== dateValue(current.endDate)
        ? [{
            planId: current.id,
            field: 'endDate',
            oldValue: dateValue(current.endDate),
            newValue: dateValue(data.endDate),
          }]
        : []),
    ];

    const updated = await prisma.$transaction(async (tx) => {
      if (auditEntries.length > 0) {
        await tx.planAudit.createMany({ data: auditEntries });
      }
      return tx.plan.update({
        where: { id: current.id },
        data: { ...data, status },
        include: { account: true },
      });
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
