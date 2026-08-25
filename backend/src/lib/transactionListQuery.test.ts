import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTransactionListWhere,
  dayAfter,
  transactionListQuerySchema,
} from './transactionListQuery.ts';

describe('dayAfter', () => {
  it('avança um dia no fuso do app', () => {
    const next = dayAfter('2026-08-25');
    assert.equal(next.toISOString(), '2026-08-26T03:00:00.000Z');
  });

  it('vira o mês corretamente', () => {
    const next = dayAfter('2026-08-31');
    assert.equal(next.toISOString(), '2026-09-01T03:00:00.000Z');
  });
});

describe('transactionListQuerySchema', () => {
  it('aceita categoria, busca, datas e faixa de valor', () => {
    const parsed = transactionListQuerySchema.parse({
      categoryId: 'cat-mercado',
      search: '  mercado  ',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      minAmount: '10.5',
      maxAmount: '100',
    });

    assert.equal(parsed.categoryId, 'cat-mercado');
    assert.equal(parsed.search, 'mercado');
    assert.equal(parsed.dateFrom, '2026-08-01');
    assert.equal(parsed.dateTo, '2026-08-31');
    assert.equal(parsed.minAmount, 10.5);
    assert.equal(parsed.maxAmount, 100);
  });

  it('rejeita minAmount maior que maxAmount', () => {
    assert.throws(() =>
      transactionListQuerySchema.parse({ minAmount: 200, maxAmount: 50 }),
    );
  });
});

describe('buildTransactionListWhere', () => {
  it('filtra por categoria e descrição', () => {
    const where = buildTransactionListWhere(
      transactionListQuerySchema.parse({
        categoryId: 'cat-1',
        search: 'Padaria',
      }),
    );

    assert.equal(where.categoryId, 'cat-1');
    assert.deepEqual(where.description, { contains: 'Padaria', mode: 'insensitive' });
    assert.equal(where.isCancelled, false);
  });

  it('usa intervalo de datas em vez de year/month quando informado', () => {
    const where = buildTransactionListWhere(
      transactionListQuerySchema.parse({
        year: 2026,
        month: 8,
        dateFrom: '2026-08-10',
        dateTo: '2026-08-20',
      }),
    );

    assert.ok(where.date && typeof where.date === 'object' && 'gte' in where.date);
    assert.ok(where.date && typeof where.date === 'object' && 'lt' in where.date);
    assert.equal(
      (where.date as { gte: Date }).gte.toISOString(),
      '2026-08-10T03:00:00.000Z',
    );
    assert.equal(
      (where.date as { lt: Date }).lt.toISOString(),
      '2026-08-21T03:00:00.000Z',
    );
  });

  it('aplica faixa de valor', () => {
    const where = buildTransactionListWhere(
      transactionListQuerySchema.parse({
        minAmount: 20,
        maxAmount: 80,
      }),
    );

    assert.deepEqual(where.amount, { gte: 20, lte: 80 });
  });
});
