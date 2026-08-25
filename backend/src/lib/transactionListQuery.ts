import { z } from 'zod';
import { Prisma, TransactionType } from '@prisma/client';
import { APP_OFFSET, parseAppDateTime } from './appTime.js';
import { monthRange } from './monthRange.js';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function dayAfter(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T00:00:00${APP_OFFSET}`);
}

export const transactionListQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  categoryId: z.string().min(1).optional(),
  accountId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  dateFrom: dateOnlySchema.optional(),
  dateTo: dateOnlySchema.optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  includeCancelled: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
}).refine(
  (query) =>
    query.minAmount == null
    || query.maxAmount == null
    || query.minAmount <= query.maxAmount,
  { message: 'minAmount deve ser menor ou igual a maxAmount', path: ['minAmount'] },
);

export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

export function buildTransactionListWhere(
  query: TransactionListQuery,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  if (!query.includeCancelled) where.isCancelled = false;
  if (query.type) where.type = query.type;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.accountId) {
    where.OR = [{ accountId: query.accountId }, { toAccountId: query.accountId }];
  }
  if (query.search) {
    where.description = { contains: query.search, mode: 'insensitive' };
  }
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.amount = {
      ...(query.minAmount !== undefined ? { gte: query.minAmount } : {}),
      ...(query.maxAmount !== undefined ? { lte: query.maxAmount } : {}),
    };
  }
  if (query.dateFrom || query.dateTo) {
    where.date = {
      ...(query.dateFrom ? { gte: parseAppDateTime(query.dateFrom) } : {}),
      ...(query.dateTo ? { lt: dayAfter(query.dateTo) } : {}),
    };
  } else if (query.year && query.month) {
    const { start, end } = monthRange(query.year, query.month);
    where.date = { gte: start, lt: end };
  }

  return where;
}
