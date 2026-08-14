import { Router } from 'express';
import { PlanStatus, PlanType, Prisma, TransactionType } from '@prisma/client';
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

type BalanceClient = Pick<Prisma.TransactionClient, 'transaction'>;

async function balanceOf(
  accountId: string,
  client: BalanceClient = prisma,
): Promise<number> {
  const [income, expense, transferIn, transferOut] = await Promise.all([
    client.transaction.aggregate({
      where: { accountId, type: TransactionType.INCOME, isCancelled: false },
      _sum: { amount: true },
    }),
    client.transaction.aggregate({
      where: { accountId, type: TransactionType.EXPENSE, isCancelled: false },
      _sum: { amount: true },
    }),
    client.transaction.aggregate({
      where: { toAccountId: accountId, type: TransactionType.TRANSFER, isCancelled: false },
      _sum: { amount: true },
    }),
    client.transaction.aggregate({
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

async function lockPiggy(
  tx: Prisma.TransactionClient,
  accountId: string,
) {
  const lockedAccounts = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM accounts WHERE id = ${accountId} FOR UPDATE
  `;
  if (lockedAccounts.length === 0) throw new AppError(404, 'Cofrinho não encontrado');

  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account?.isReserved || !account.isActive) {
    throw new AppError(400, 'Selecione um cofrinho ativo');
  }
}

async function preparePiggySlot(
  tx: Prisma.TransactionClient,
  accountId: string,
  exceptId?: string,
) {
  const activeGoals = await tx.plan.findMany({
    where: {
      accountId,
      type: PlanType.GOAL,
      status: PlanStatus.ACTIVE,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true, targetAmount: true },
  });
  if (activeGoals.length === 0) return;

  const balance = await balanceOf(accountId, tx);
  const fundedGoalIds = activeGoals
    .filter((goal) => isGoalAchieved(Number(goal.targetAmount), balance))
    .map((goal) => goal.id);
  const hasUnfundedActiveGoal = fundedGoalIds.length !== activeGoals.length;
  if (hasUnfundedActiveGoal) {
    throw new AppError(400, 'Este cofrinho já tem um objetivo ativo');
  }
  await tx.plan.updateMany({
    where: { id: { in: fundedGoalIds } },
    data: { status: PlanStatus.ACHIEVED },
  });
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
        const status = goal.status === PlanStatus.ACTIVE && achieved
          ? PlanStatus.ACHIEVED
          : goal.status;

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
    const goal = await prisma.$transaction(async (tx) => {
      await lockPiggy(tx, data.accountId);
      await preparePiggySlot(tx, data.accountId);
      const created = await tx.plan.create({
        data: {
          ...data,
          startDate: data.startDate ?? new Date(),
          type: PlanType.GOAL,
        },
        include: { account: true },
      });
      const balance = await balanceOf(data.accountId, tx);
      const status = isGoalAchieved(data.targetAmount, balance)
        ? PlanStatus.ACHIEVED
        : PlanStatus.ACTIVE;
      return tx.plan.update({
        where: { id: created.id },
        data: { status },
        include: { account: true },
      });
    });
    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateGoalSchema.parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.plan.findFirst({
        where: { id: req.params.id, type: PlanType.GOAL },
      });
      if (!current || !current.accountId) {
        throw new AppError(404, 'Objetivo não encontrado');
      }

      const accountId = data.accountId ?? current.accountId;
      await lockPiggy(tx, accountId);

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

      if (auditEntries.length > 0) {
        await tx.planAudit.createMany({ data: auditEntries });
      }
      const changed = await tx.plan.update({
        where: { id: current.id },
        data,
      });
      const balance = await balanceOf(accountId, tx);
      const status = isGoalAchieved(Number(changed.targetAmount), balance)
        ? PlanStatus.ACHIEVED
        : PlanStatus.ACTIVE;
      const changesPiggy = data.accountId !== undefined
        && data.accountId !== current.accountId;
      if (changesPiggy || status === PlanStatus.ACTIVE) {
        await preparePiggySlot(tx, accountId, current.id);
      }
      return tx.plan.update({
        where: { id: current.id },
        data: { status },
        include: { account: true },
      });
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
