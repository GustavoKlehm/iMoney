import { Router } from 'express';
import { z } from 'zod';
import { PlanType, TransactionType } from '@prisma/client';
import { accountBalance } from '../lib/accountBalance.js';
import { isGoalAchieved } from '../lib/goal.js';
import { appNowParts, monthStart } from '../lib/appTime.js';
import { monthRange } from '../lib/monthRange.js';
import { expectedToDate, paceStatus, projectedMonth } from '../lib/pace.js';
import { prisma } from '../lib/prisma.js';
import {
  projectedFreeBalance,
  sumPlannedLimits,
  sumUnplannedExpenses,
} from '../lib/projectedBalance.js';

const router = Router();

const monthQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

router.get('/monthly', async (req, res, next) => {
  try {
    const { year, month } = monthQuerySchema.parse(req.query);
    const { start, end } = monthRange(year, month);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = appNowParts();
    const isCurrentMonth = today.year === year && today.month === month;
    const daysElapsed = isCurrentMonth ? today.day : daysInMonth;

    const [incomeAgg, expenseAgg, budgets, expensesByCategory] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          date: { gte: start, lt: end },
          type: TransactionType.INCOME,
          isCancelled: false,
          isOpeningBalance: false,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { date: { gte: start, lt: end }, type: TransactionType.EXPENSE, isCancelled: false },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({
        where: { year, month },
        include: { category: true },
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { date: { gte: start, lt: end }, type: TransactionType.EXPENSE, isCancelled: false },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expenses = Number(expenseAgg._sum.amount ?? 0);
    const spentByCategory = new Map(
      expensesByCategory.map((e) => [e.categoryId, Number(e._sum.amount ?? 0)]),
    );

    const budgetProgress = budgets.flatMap((b) => {
      const spent = spentByCategory.get(b.categoryId) ?? 0;
      const limit = Number(b.limitAmount);
      if (limit <= 0 && spent <= 0) return [];

      const remaining = limit - spent;
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      const projected = projectedMonth(spent, daysElapsed, daysInMonth);
      const expected = expectedToDate(limit, daysElapsed, daysInMonth);
      const status = paceStatus({
        spent,
        limit,
        day: daysElapsed,
        daysInMonth,
        isCurrentMonth,
      });
      const paceRatio = expected > 0 ? spent / expected : 0;

      let alert: string | null = null;
      if (percent >= 100) alert = 'over_limit';
      else if (percent >= 90) alert = '90_percent';
      else if (percent >= 75) alert = '75_percent';
      else if (percent >= 50) alert = '50_percent';
      else if (projected > limit) alert = 'pace_above_budget';

      return [{
        category: b.category,
        limit,
        spent,
        remaining,
        percent: Math.round(percent * 10) / 10,
        projected: Math.round(projected * 100) / 100,
        expectedToDate: expected,
        paceRatio,
        paceStatus: status,
        alert,
      }];
    });

    const accounts = await prisma.account.findMany({ where: { isActive: true } });
    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const [inc, exp, tIn, tOut] = await Promise.all([
          prisma.transaction.aggregate({
            where: { accountId: account.id, type: TransactionType.INCOME, isCancelled: false },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { accountId: account.id, type: TransactionType.EXPENSE, isCancelled: false },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { toAccountId: account.id, type: TransactionType.TRANSFER, isCancelled: false },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { accountId: account.id, type: TransactionType.TRANSFER, isCancelled: false },
            _sum: { amount: true },
          }),
        ]);

        const balance = accountBalance({
          income: Number(inc._sum.amount ?? 0),
          expense: Number(exp._sum.amount ?? 0),
          transferIn: Number(tIn._sum.amount ?? 0),
          transferOut: Number(tOut._sum.amount ?? 0),
        });

        return { ...account, balance };
      }),
    );

    const reservedTotal = accountBalances
      .filter((a) => a.isReserved)
      .reduce((sum, a) => sum + a.balance, 0);

    const totalBalance = accountBalances.reduce((sum, a) => sum + a.balance, 0);
    const freeBalance = totalBalance - reservedTotal;
    const plannedBudgets = budgets
      .map((budget) => ({
        categoryId: budget.categoryId,
        limitAmount: Number(budget.limitAmount),
      }))
      .filter((budget) => budget.limitAmount > 0);
    const plannedLimits = sumPlannedLimits(plannedBudgets);
    const unplannedExpenses = sumUnplannedExpenses(
      expensesByCategory.map((row) => ({
        categoryId: row.categoryId,
        spent: Number(row._sum.amount ?? 0),
      })),
      plannedBudgets.map((budget) => budget.categoryId),
    );
    const projectedBalance = projectedFreeBalance({
      freeBalance,
      plannedLimits,
      unplannedExpenses,
    });
    const balanceByAccount = new Map(
      accountBalances.map((account) => [account.id, account.balance]),
    );

    const upcomingOccurrences = await prisma.recurrenceOccurrence.findMany({
      where: {
        dueDate: { gte: start, lt: monthStart(year + Math.floor((month + 2) / 12), ((month + 2) % 12) + 1) },
        status: 'PENDING',
      },
      include: { recurrence: { include: { category: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    const activePlans = await prisma.plan.findMany({
      where: { status: 'ACTIVE', type: PlanType.GOAL },
      include: { category: true },
    });
    const visibleActivePlans = activePlans.flatMap((plan) => {
      const targetAmount = Number(plan.targetAmount);
      const currentAmount = plan.type === 'GOAL' && plan.accountId
        ? balanceByAccount.get(plan.accountId) ?? 0
        : Number(plan.currentAmount);
      if (plan.type === 'GOAL' && isGoalAchieved(targetAmount, currentAmount)) {
        return [];
      }
      return [{
        ...plan,
        targetAmount,
        currentAmount,
        remaining: targetAmount - currentAmount,
        progress: targetAmount > 0
          ? Math.round((currentAmount / targetAmount) * 1000) / 10
          : 0,
      }];
    });

    res.json({
      period: { year, month, daysInMonth, daysElapsed },
      summary: {
        income,
        expenses,
        balance: income - expenses,
        totalBalance,
        reservedTotal,
        freeBalance,
        plannedLimits,
        unplannedExpenses,
        projectedFreeBalance: projectedBalance,
      },
      budgetProgress,
      accountBalances,
      upcomingOccurrences,
      activePlans: visibleActivePlans,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
