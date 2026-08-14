import { Router } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const router = Router();

const monthQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

router.get('/monthly', async (req, res, next) => {
  try {
    const { year, month } = monthQuerySchema.parse(req.query);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const daysInMonth = end.getDate();
    const today = new Date();
    const daysElapsed =
      today.getFullYear() === year && today.getMonth() === month - 1
        ? today.getDate()
        : daysInMonth;

    const [incomeAgg, expenseAgg, budgets, expensesByCategory] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          date: { gte: start, lte: end },
          type: TransactionType.INCOME,
          isCancelled: false,
          isOpeningBalance: false,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { date: { gte: start, lte: end }, type: TransactionType.EXPENSE, isCancelled: false },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({
        where: { year, month },
        include: { category: true },
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { date: { gte: start, lte: end }, type: TransactionType.EXPENSE, isCancelled: false },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expenses = Number(expenseAgg._sum.amount ?? 0);
    const spentByCategory = new Map(
      expensesByCategory.map((e) => [e.categoryId, Number(e._sum.amount ?? 0)]),
    );

    const budgetProgress = budgets.map((b) => {
      const spent = spentByCategory.get(b.categoryId) ?? 0;
      const limit = Number(b.limitAmount);
      const remaining = limit - spent;
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      const dailyAvg = daysElapsed > 0 ? spent / daysElapsed : 0;
      const projected = dailyAvg * daysInMonth;

      let alert: string | null = null;
      if (percent >= 100) alert = 'over_limit';
      else if (percent >= 90) alert = '90_percent';
      else if (percent >= 75) alert = '75_percent';
      else if (percent >= 50) alert = '50_percent';
      else if (projected > limit) alert = 'pace_above_budget';

      return {
        category: b.category,
        limit,
        spent,
        remaining,
        percent: Math.round(percent * 10) / 10,
        projected: Math.round(projected * 100) / 100,
        alert,
      };
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

        const balance =
          Number(inc._sum.amount ?? 0) -
          Number(exp._sum.amount ?? 0) +
          Number(tIn._sum.amount ?? 0) -
          Number(tOut._sum.amount ?? 0);

        return { ...account, balance };
      }),
    );

    const reservedTotal = accountBalances
      .filter((a) => a.isReserved)
      .reduce((sum, a) => sum + a.balance, 0);

    const totalBalance = accountBalances.reduce((sum, a) => sum + a.balance, 0);

    const upcomingOccurrences = await prisma.recurrenceOccurrence.findMany({
      where: {
        dueDate: { gte: start, lte: new Date(year, month + 2, 0) },
        status: 'PENDING',
      },
      include: { recurrence: { include: { category: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    const activePlans = await prisma.plan.findMany({
      where: { status: 'ACTIVE' },
      include: { category: true },
    });

    res.json({
      period: { year, month, daysInMonth, daysElapsed },
      summary: {
        income,
        expenses,
        balance: income - expenses,
        totalBalance,
        reservedTotal,
        freeBalance: totalBalance - reservedTotal,
      },
      budgetProgress,
      accountBalances,
      upcomingOccurrences,
      activePlans: activePlans.map((p) => ({
        ...p,
        targetAmount: Number(p.targetAmount),
        currentAmount: Number(p.currentAmount),
        remaining: Number(p.targetAmount) - Number(p.currentAmount),
        progress: Number(p.targetAmount) > 0
          ? Math.round((Number(p.currentAmount) / Number(p.targetAmount)) * 1000) / 10
          : 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
