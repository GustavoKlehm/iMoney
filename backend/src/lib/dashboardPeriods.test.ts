import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTransactionPeriods } from './dashboardPeriods.ts';

describe('summarizeTransactionPeriods', () => {
  it('retorna nulls sem datas', () => {
    assert.deepEqual(summarizeTransactionPeriods([]), { earliest: null, latest: null });
  });

  it('calcula earliest e latest por ano-mês no fuso do app', () => {
    assert.deepEqual(
      summarizeTransactionPeriods([
        new Date('2026-01-15T12:00:00-03:00'),
        new Date('2026-03-01T00:00:00-03:00'),
        new Date('2025-12-31T23:00:00-03:00'),
      ]),
      {
        earliest: { year: 2025, month: 12 },
        latest: { year: 2026, month: 3 },
      },
    );
  });

  it('trata uma única data', () => {
    assert.deepEqual(
      summarizeTransactionPeriods([new Date('2026-08-10T10:00:00-03:00')]),
      {
        earliest: { year: 2026, month: 8 },
        latest: { year: 2026, month: 8 },
      },
    );
  });
});
