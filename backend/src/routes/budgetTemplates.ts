import { Router } from 'express';
import { z } from 'zod';
import { budgetsToUpsert, monthSequence } from '../lib/budgetApply.js';
import { templateRemovalDecision } from '../lib/removalDecision.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const lineSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().nonnegative(),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  lines: z.array(lineSchema),
});

const updateTemplateSchema = createTemplateSchema.partial();

const applyTemplateSchema = z.object({
  startYear: z.number().int(),
  startMonth: z.number().int().min(1).max(12),
  months: z.number().int().min(1).max(36),
  overwrite: z.boolean(),
});

const templateInclude = {
  lines: {
    include: { category: true },
    orderBy: { category: { name: 'asc' as const } },
  },
};

router.get('/', async (_req, res, next) => {
  try {
    const templates = await prisma.budgetTemplate.findMany({
      include: {
        ...templateInclude,
        _count: { select: { budgets: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(
      templates.map(({ _count, ...template }) => ({
        ...template,
        hasGeneratedMonths: _count.budgets > 0,
      })),
    );
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, lines } = createTemplateSchema.parse(req.body);
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.budgetTemplate.create({ data: { name } });
      if (lines.length > 0) {
        await tx.budgetTemplateLine.createMany({
          data: lines.map((line) => ({ ...line, templateId: created.id })),
        });
      }
      return tx.budgetTemplate.findUniqueOrThrow({
        where: { id: created.id },
        include: templateInclude,
      });
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.budgetTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        ...templateInclude,
        budgets: {
          select: { year: true, month: true },
          distinct: ['year', 'month'],
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
      },
    });

    if (!template) throw new AppError(404, 'Planejamento não encontrado');
    res.json({
      ...template,
      hasGeneratedMonths: template.budgets.length > 0,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateTemplateSchema.parse(req.body);
    const template = await prisma.$transaction(async (tx) => {
      await tx.budgetTemplate.update({
        where: { id: req.params.id },
        data: data.name === undefined ? {} : { name: data.name },
      });

      if (data.lines !== undefined) {
        await tx.budgetTemplateLine.deleteMany({ where: { templateId: req.params.id } });
        if (data.lines.length > 0) {
          await tx.budgetTemplateLine.createMany({
            data: data.lines.map((line) => ({ ...line, templateId: req.params.id })),
          });
        }
      }

      return tx.budgetTemplate.findUniqueOrThrow({
        where: { id: req.params.id },
        include: templateInclude,
      });
    });

    res.json(template);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/apply', async (req, res, next) => {
  try {
    const input = applyTemplateSchema.parse(req.body);
    const template = await prisma.budgetTemplate.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });

    if (!template) throw new AppError(404, 'Planejamento não encontrado');

    const lines = template.lines.map((line) => ({
      categoryId: line.categoryId,
      amount: Number(line.amount),
    }));
    if (!lines.some((line) => line.amount > 0)) {
      throw new AppError(400, 'Informe pelo menos um limite maior que zero');
    }

    const monthsList = monthSequence(input.startYear, input.startMonth, input.months);
    const existing = await prisma.budget.findMany({
      where: {
        OR: monthsList.map(({ year, month }) => ({ year, month })),
      },
      select: { categoryId: true, year: true, month: true },
    });
    const { upsert, skipped } = budgetsToUpsert(
      lines,
      monthsList,
      existing,
      input.overwrite,
    );

    await prisma.$transaction(
      upsert.map(({ categoryId, year, month, amount }) =>
        prisma.budget.upsert({
          where: { categoryId_year_month: { categoryId, year, month } },
          create: {
            categoryId,
            year,
            month,
            sourceTemplateId: template.id,
            limitAmount: amount,
          },
          update: {
            sourceTemplateId: template.id,
            limitAmount: amount,
          },
        }),
      ),
    );

    res.json({ created: upsert.length, skipped });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const template = await prisma.budgetTemplate.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { budgets: true } } },
    });
    if (!template) throw new AppError(404, 'Planejamento não encontrado');

    const decision = templateRemovalDecision(template._count.budgets > 0);
    await prisma.$transaction(async (tx) => {
      if (decision === 'unlink-and-delete') {
        await tx.budget.updateMany({
          where: { sourceTemplateId: template.id },
          data: { sourceTemplateId: null },
        });
      }
      await tx.budgetTemplate.delete({ where: { id: template.id } });
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
