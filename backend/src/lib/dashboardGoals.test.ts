import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterDashboardGoals } from './dashboardGoals.ts';

describe('filterDashboardGoals', () => {
  it('esconde meta GOAL sem cofrinho (legado do seed)', () => {
    const visible = filterDashboardGoals([
      { id: 'orphan', accountId: null, targetAmount: 10_000, currentAmount: 0 },
      { id: 'real', accountId: 'acc-1', targetAmount: 10_000, currentAmount: 1_000 },
    ]);

    assert.deepEqual(
      visible.map((goal) => goal.id),
      ['real'],
    );
  });

  it('esconde meta já atingida pelo saldo do cofrinho', () => {
    const visible = filterDashboardGoals([
      { id: 'done', accountId: 'acc-1', targetAmount: 5_000, currentAmount: 5_000 },
      { id: 'open', accountId: 'acc-2', targetAmount: 5_000, currentAmount: 4_999 },
    ]);

    assert.deepEqual(
      visible.map((goal) => goal.id),
      ['open'],
    );
  });
});
