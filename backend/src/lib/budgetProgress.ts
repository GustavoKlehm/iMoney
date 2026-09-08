import {
  expectedToDate,
  paceStatus,
  projectedMonth,
  type PaceStatus,
} from './pace.js';

export type BudgetProgressCategory = {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BudgetProgressItem = {
  category: BudgetProgressCategory;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  projected: number;
  expectedToDate: number;
  paceRatio: number;
  paceStatus: PaceStatus | null;
  alert: string | null;
};

export type BudgetProgressInput = {
  budgets: Array<{
    categoryId: string;
    limitAmount: number;
    category: BudgetProgressCategory;
  }>;
  spentByCategory: Array<{ categoryId: string | null; spent: number }>;
  categoriesById: Map<string, BudgetProgressCategory>;
  daysElapsed: number;
  daysInMonth: number;
  isCurrentMonth: boolean;
};

function buildItem(
  category: BudgetProgressCategory,
  limit: number,
  spent: number,
  daysElapsed: number,
  daysInMonth: number,
  isCurrentMonth: boolean,
): BudgetProgressItem {
  const remaining = limit - spent;
  const percent = limit > 0 ? (spent / limit) * 100 : 0;
  const projected = projectedMonth(spent, daysElapsed, daysInMonth);
  const expected = expectedToDate(limit, daysElapsed, daysInMonth);
  const status = paceStatus({
    spent,
    limit,
    day: daysElapsed,
    daysInMonth,
    isCurrentMonth,
  });
  const paceRatio = expected > 0 ? spent / expected : 0;

  let alert: string | null = null;
  if (limit > 0) {
    if (percent >= 100) alert = 'over_limit';
    else if (percent >= 90) alert = '90_percent';
    else if (percent >= 75) alert = '75_percent';
    else if (percent >= 50) alert = '50_percent';
    else if (projected > limit) alert = 'pace_above_budget';
  }

  return {
    category,
    limit,
    spent,
    remaining,
    percent: Math.round(percent * 10) / 10,
    projected: Math.round(projected * 100) / 100,
    expectedToDate: expected,
    paceRatio,
    paceStatus: status,
    alert,
  };
}

/**
 * Orçamento do Dashboard: categorias com limite no planejamento (mesmo sem gasto)
 * e categorias com gasto no mês (mesmo sem planejamento).
 */
export function buildBudgetProgress(input: BudgetProgressInput): BudgetProgressItem[] {
  const spentMap = new Map<string, number>();
  for (const row of input.spentByCategory) {
    if (!row.categoryId || row.spent <= 0) continue;
    spentMap.set(row.categoryId, (spentMap.get(row.categoryId) ?? 0) + row.spent);
  }

  const items: BudgetProgressItem[] = [];
  const seen = new Set<string>();

  for (const budget of input.budgets) {
    const spent = spentMap.get(budget.categoryId) ?? 0;
    const limit = budget.limitAmount;
    if (limit <= 0 && spent <= 0) continue;

    items.push(
      buildItem(
        budget.category,
        limit,
        spent,
        input.daysElapsed,
        input.daysInMonth,
        input.isCurrentMonth,
      ),
    );
    seen.add(budget.categoryId);
  }

  for (const [categoryId, spent] of spentMap) {
    if (seen.has(categoryId)) continue;
    const category = input.categoriesById.get(categoryId);
    if (!category) continue;

    items.push(
      buildItem(
        category,
        0,
        spent,
        input.daysElapsed,
        input.daysInMonth,
        input.isCurrentMonth,
      ),
    );
  }

  return items;
}
