import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isGoalAchieved, monthlyReserve, monthsRemaining } from './goal.ts';

describe('monthsRemaining', () => {
  it('mesmo mês, prazo futuro → 1', () => {
    assert.equal(monthsRemaining(new Date(2026, 7, 13), new Date(2026, 7, 31)), 1);
  });
  it('9 meses à frente', () => {
    assert.equal(monthsRemaining(new Date(2026, 7, 13), new Date(2027, 4, 13)), 9);
  });
  it('prazo vencido → null', () => {
    assert.equal(monthsRemaining(new Date(2026, 7, 13), new Date(2026, 6, 1)), null);
  });
});

describe('monthlyReserve', () => {
  it('meta 12000, saldo 3000, 9 meses → 1000', () => {
    assert.equal(monthlyReserve(12000, 3000, 9), 1000);
  });
  it('já atingido → 0', () => {
    assert.equal(monthlyReserve(10000, 10000, 3), 0);
  });
  it('prazo vencido (months null) → 0', () => {
    assert.equal(monthlyReserve(10000, 3000, null), 0);
  });
});

describe('isGoalAchieved', () => {
  it('saldo >= meta', () => {
    assert.equal(isGoalAchieved(40000, 40000), true);
    assert.equal(isGoalAchieved(40000, 39999), false);
  });
});
