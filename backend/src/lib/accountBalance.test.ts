import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accountBalance } from './accountBalance.ts';

describe('accountBalance', () => {
  it('abertura 100 − saída 30 − transferência 20 → 50', () => {
    assert.equal(
      accountBalance({ income: 100, expense: 30, transferIn: 0, transferOut: 20 }),
      50,
    );
  });
  it('cofrinho recebe 20', () => {
    assert.equal(
      accountBalance({ income: 0, expense: 0, transferIn: 20, transferOut: 0 }),
      20,
    );
  });
});
