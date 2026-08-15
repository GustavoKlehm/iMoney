import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  projectedFreeBalance,
  sumPlannedLimits,
  sumUnplannedExpenses,
} from './projectedBalance.ts';

describe('projectedFreeBalance', () => {
  it('livre − limites planejados − despesas sem limite', () => {
    assert.equal(
      projectedFreeBalance({
        freeBalance: 10_000,
        plannedLimits: 3_000,
        unplannedExpenses: 1_000,
      }),
      6_000,
    );
  });
});

describe('sumPlannedLimits', () => {
  it('soma só os limites, não o já gasto', () => {
    assert.equal(
      sumPlannedLimits([
        { limitAmount: 2_000 },
        { limitAmount: 1_000 },
        { limitAmount: 0 },
      ]),
      3_000,
    );
  });
});

describe('sumUnplannedExpenses', () => {
  it('ignora gasto de categoria com limite e soma o restante', () => {
    assert.equal(
      sumUnplannedExpenses(
        [
          { categoryId: 'mercado', spent: 1_800 },
          { categoryId: 'presente', spent: 1_000 },
          { categoryId: null, spent: 50 },
        ],
        ['mercado'],
      ),
      1_050,
    );
  });
});
