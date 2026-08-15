export function sumPlannedLimits(budgets: Array<{ limitAmount: number }>) {
  return budgets.reduce((sum, budget) => sum + Math.max(0, budget.limitAmount), 0);
}

export function sumUnplannedExpenses(
  spentByCategory: Array<{ categoryId: string | null; spent: number }>,
  plannedCategoryIds: Iterable<string>,
) {
  const planned = new Set(plannedCategoryIds);
  return spentByCategory.reduce((sum, row) => {
    if (row.categoryId && planned.has(row.categoryId)) return sum;
    return sum + row.spent;
  }, 0);
}

export function projectedFreeBalance(input: {
  freeBalance: number;
  plannedLimits: number;
  unplannedExpenses: number;
}) {
  return Math.round((input.freeBalance - input.plannedLimits - input.unplannedExpenses) * 100) / 100;
}
