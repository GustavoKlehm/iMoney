import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { budgetsToUpsert, monthSequence } from './budgetApply.ts';

describe('monthSequence', () => {
  it('nov a jan atravessa o ano', () => {
    assert.deepEqual(monthSequence(2026, 11, 3), [
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });
});

describe('budgetsToUpsert', () => {
  const lines = [{ categoryId: 'cat-1', amount: 900 }];
  const months = [{ year: 2026, month: 8 }];

  it('cria quando não existe', () => {
    const r = budgetsToUpsert(lines, months, [], false);
    assert.equal(r.upsert.length, 1);
    assert.equal(r.skipped, 0);
  });
  it('pula existente se overwrite false', () => {
    const r = budgetsToUpsert(
      lines,
      months,
      [{ categoryId: 'cat-1', year: 2026, month: 8 }],
      false,
    );
    assert.equal(r.upsert.length, 0);
    assert.equal(r.skipped, 1);
  });
  it('substitui se overwrite true', () => {
    const r = budgetsToUpsert(
      lines,
      months,
      [{ categoryId: 'cat-1', year: 2026, month: 8 }],
      true,
    );
    assert.equal(r.upsert.length, 1);
  });
  it('ignora linha com amount 0', () => {
    const r = budgetsToUpsert([{ categoryId: 'cat-1', amount: 0 }], months, [], false);
    assert.equal(r.upsert.length, 0);
  });
});
