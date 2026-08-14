import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accountRemovalDecision,
  categoryRemovalDecision,
  templateRemovalDecision,
} from './removalDecision.ts';

const accountBase = {
  hasTransactions: false,
  hasGoal: false,
  hasRecurrence: false,
  isDefault: false,
  hasOtherActiveCommonAccount: false,
};

describe('accountRemovalDecision', () => {
  it('apaga conta sem histórico', () => {
    assert.equal(accountRemovalDecision(accountBase), 'delete');
  });

  it('desativa conta com lançamento', () => {
    assert.equal(accountRemovalDecision({ ...accountBase, hasTransactions: true }), 'deactivate');
  });

  it('desativa conta com objetivo', () => {
    assert.equal(accountRemovalDecision({ ...accountBase, hasGoal: true }), 'deactivate');
  });

  it('desativa conta com recorrência', () => {
    assert.equal(accountRemovalDecision({ ...accountBase, hasRecurrence: true }), 'deactivate');
  });

  it('recusa desativar a única conta padrão', () => {
    assert.equal(
      accountRemovalDecision({
        ...accountBase,
        hasTransactions: true,
        isDefault: true,
        hasOtherActiveCommonAccount: false,
      }),
      'reject-default',
    );
  });

  it('desativa padrão se existir outra conta comum ativa', () => {
    assert.equal(
      accountRemovalDecision({
        ...accountBase,
        hasTransactions: true,
        isDefault: true,
        hasOtherActiveCommonAccount: true,
      }),
      'deactivate',
    );
  });

  it('apaga padrão sem histórico mesmo sendo a única', () => {
    assert.equal(
      accountRemovalDecision({
        ...accountBase,
        isDefault: true,
        hasOtherActiveCommonAccount: false,
      }),
      'delete',
    );
  });
});

describe('categoryRemovalDecision', () => {
  const clean = {
    hasTransactions: false,
    hasChildren: false,
    hasBudgetLines: false,
    hasBudgets: false,
    hasPlans: false,
  };

  it('apaga categoria sem dependências', () => {
    assert.equal(categoryRemovalDecision(clean), 'delete');
  });

  it('desativa se tiver lançamentos', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasTransactions: true }), 'deactivate');
  });

  it('desativa grupo com filhas', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasChildren: true }), 'deactivate');
  });

  it('desativa se tiver linha de molde', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasBudgetLines: true }), 'deactivate');
  });

  it('desativa se tiver orçamento do mês', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasBudgets: true }), 'deactivate');
  });

  it('desativa se tiver objetivo', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasPlans: true }), 'deactivate');
  });
});

describe('templateRemovalDecision', () => {
  it('apaga molde sem meses gerados', () => {
    assert.equal(templateRemovalDecision(false), 'delete');
  });

  it('desvincula e apaga molde com meses gerados', () => {
    assert.equal(templateRemovalDecision(true), 'unlink-and-delete');
  });
});
