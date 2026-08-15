import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TransactionType } from '@prisma/client';
import { createTransactionSchema } from './transactionValidation.ts';

const categoryId = '00000000-0000-4000-8000-000000000001';
const accountId = '00000000-0000-4000-8000-000000000002';
const toAccountId = '00000000-0000-4000-8000-000000000003';

function transaction(type: TransactionType) {
  return {
    date: '2026-08-13T12:00',
    amount: 100,
    type,
    description: 'Teste',
    categoryId,
  };
}

describe('createTransactionSchema', () => {
  it('rejeita entrada sem conta de origem', () => {
    assert.equal(createTransactionSchema.safeParse(transaction(TransactionType.INCOME)).success, false);
  });

  it('rejeita saída sem conta de origem', () => {
    assert.equal(createTransactionSchema.safeParse(transaction(TransactionType.EXPENSE)).success, false);
  });

  it('aceita categoria com id de seed, que não é UUID', () => {
    const result = createTransactionSchema.safeParse({
      ...transaction(TransactionType.EXPENSE),
      accountId,
      categoryId: 'cat-mercado',
    });
    assert.equal(result.success, true);
  });

  it('aceita entrada e saída com conta de origem', () => {
    assert.equal(
      createTransactionSchema.safeParse({ ...transaction(TransactionType.INCOME), accountId }).success,
      true,
    );
    assert.equal(
      createTransactionSchema.safeParse({ ...transaction(TransactionType.EXPENSE), accountId }).success,
      true,
    );
  });

  it('mantém contas distintas obrigatórias na transferência', () => {
    const base = { ...transaction(TransactionType.TRANSFER), categoryId: undefined, accountId };
    assert.equal(createTransactionSchema.safeParse(base).success, false);
    assert.equal(createTransactionSchema.safeParse({ ...base, toAccountId: accountId }).success, false);
    assert.equal(createTransactionSchema.safeParse({ ...base, toAccountId }).success, true);
  });
});
