import { Responsible, TransactionType } from '@prisma/client';
import { z } from 'zod';

export const baseTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/),
  amount: z.number().positive(),
  type: z.nativeEnum(TransactionType),
  description: z.string().min(1).max(500),
  categoryId: z.string().min(1).optional(),
  accountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  responsible: z.nativeEnum(Responsible).optional(),
  userId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  notes: z.string().optional(),
  linkedTransactionId: z.string().uuid().optional(),
});

export const createTransactionSchema = baseTransactionSchema.refine(
  (data) => {
    if (data.type === TransactionType.TRANSFER) {
      return !!data.accountId && !!data.toAccountId && data.accountId !== data.toAccountId;
    }
    return true;
  },
  { message: 'Transferência requer conta origem e destino diferentes' },
).refine(
  (data) => {
    if (data.type !== TransactionType.TRANSFER) {
      return !!data.categoryId;
    }
    return true;
  },
  { message: 'Entrada e saída requerem categoria' },
).refine(
  (data) => {
    if (data.type !== TransactionType.TRANSFER) {
      return !!data.accountId;
    }
    return true;
  },
  { message: 'Entrada e saída requerem conta de origem' },
);
