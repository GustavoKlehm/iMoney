import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBudgetProgress } from './budgetProgress.ts';

const mercado = { id: 'cat-mercado', name: 'Mercado', type: 'EXPENSE' as const };
const presente = { id: 'cat-presente', name: 'Presente', type: 'EXPENSE' as const };
const delivery = { id: 'cat-delivery', name: 'Delivery', type: 'EXPENSE' as const };

const paceCtx = {
  daysElapsed: 10,
  daysInMonth: 30,
  isCurrentMonth: true,
};

describe('buildBudgetProgress', () => {
  it('inclui categoria com orçamento mesmo sem gasto', () => {
    const items = buildBudgetProgress({
      budgets: [{ categoryId: mercado.id, limitAmount: 2000, category: mercado }],
      spentByCategory: [],
      categoriesById: new Map([[mercado.id, mercado]]),
      ...paceCtx,
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].category.id, mercado.id);
    assert.equal(items[0].limit, 2000);
    assert.equal(items[0].spent, 0);
  });

  it('inclui categoria com gasto mesmo sem orçamento no planejamento', () => {
    const items = buildBudgetProgress({
      budgets: [],
      spentByCategory: [{ categoryId: presente.id, spent: 150 }],
      categoriesById: new Map([[presente.id, presente]]),
      ...paceCtx,
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].category.id, presente.id);
    assert.equal(items[0].limit, 0);
    assert.equal(items[0].spent, 150);
    assert.equal(items[0].paceStatus, null);
    assert.equal(items[0].alert, null);
  });

  it('une planejamento e gastos: orçamento sem gasto + gasto sem orçamento', () => {
    const items = buildBudgetProgress({
      budgets: [
        { categoryId: mercado.id, limitAmount: 2000, category: mercado },
        { categoryId: delivery.id, limitAmount: 400, category: delivery },
      ],
      spentByCategory: [
        { categoryId: delivery.id, spent: 100 },
        { categoryId: presente.id, spent: 80 },
      ],
      categoriesById: new Map([
        [mercado.id, mercado],
        [delivery.id, delivery],
        [presente.id, presente],
      ]),
      ...paceCtx,
    });

    const byId = new Map(items.map((item) => [item.category.id, item]));
    assert.equal(items.length, 3);
    assert.equal(byId.get(mercado.id)?.spent, 0);
    assert.equal(byId.get(mercado.id)?.limit, 2000);
    assert.equal(byId.get(delivery.id)?.spent, 100);
    assert.equal(byId.get(delivery.id)?.limit, 400);
    assert.equal(byId.get(presente.id)?.spent, 80);
    assert.equal(byId.get(presente.id)?.limit, 0);
  });

  it('ignora orçamento zerado sem gasto e gasto sem categoryId', () => {
    const items = buildBudgetProgress({
      budgets: [{ categoryId: mercado.id, limitAmount: 0, category: mercado }],
      spentByCategory: [
        { categoryId: null, spent: 50 },
        { categoryId: presente.id, spent: 0 },
      ],
      categoriesById: new Map([
        [mercado.id, mercado],
        [presente.id, presente],
      ]),
      ...paceCtx,
    });

    assert.equal(items.length, 0);
  });
});
