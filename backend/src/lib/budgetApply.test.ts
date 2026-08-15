import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { budgetsToUpsert, monthLinesFromWizard, monthSequence } from './budgetApply.ts';

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
  it('persiste amount 0 quando includeZero é verdadeiro', () => {
    const r = budgetsToUpsert(
      [{ categoryId: 'cat-1', amount: 0 }],
      months,
      [],
      true,
      true,
    );
    assert.equal(r.upsert.length, 1);
    assert.equal(r.upsert[0]?.amount, 0);
  });
});

describe('monthLinesFromWizard', () => {
  const defaults = [{ categoryId: 'mercado', amount: 1700 }, { categoryId: 'limpeza', amount: 0 }];

  it('usa o valor do mês mesmo quando o padrão é 0', () => {
    const lines = monthLinesFromWizard(defaults, [{ categoryId: 'limpeza', amount: 80 }]);
    const limpeza = lines.find((line) => line.categoryId === 'limpeza');
    assert.equal(limpeza?.amount, 80);
  });

  it('mantém 0 do mês e não volta ao padrão', () => {
    const lines = monthLinesFromWizard(defaults, [{ categoryId: 'mercado', amount: 0 }]);
    const mercado = lines.find((line) => line.categoryId === 'mercado');
    assert.equal(mercado?.amount, 0);
  });

  it('omite categoria zerada no molde e no mês', () => {
    const lines = monthLinesFromWizard(defaults, [{ categoryId: 'limpeza', amount: 0 }]);
    assert.equal(lines.some((line) => line.categoryId === 'limpeza'), false);
  });

  it('zera orçamento existente quando o mês fica em 0', () => {
    const lines = monthLinesFromWizard(
      defaults,
      [{ categoryId: 'limpeza', amount: 0 }],
      ['limpeza'],
    );
    assert.equal(lines.find((line) => line.categoryId === 'limpeza')?.amount, 0);
  });

  it('usa o padrão quando o mês não tem rascunho', () => {
    const lines = monthLinesFromWizard(defaults, []);
    const mercado = lines.find((line) => line.categoryId === 'mercado');
    assert.equal(mercado?.amount, 1700);
  });
});
