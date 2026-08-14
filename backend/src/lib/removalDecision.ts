export type AccountRemovalDecision = 'delete' | 'deactivate' | 'reject-default';
export type CategoryRemovalDecision = 'delete' | 'deactivate';
export type TemplateRemovalDecision = 'delete' | 'unlink-and-delete';

export function accountRemovalDecision(input: {
  hasTransactions: boolean;
  hasGoal: boolean;
  hasRecurrence: boolean;
  isDefault: boolean;
  hasOtherActiveCommonAccount: boolean;
}): AccountRemovalDecision {
  const hasHistory = input.hasTransactions || input.hasGoal || input.hasRecurrence;
  if (!hasHistory) return 'delete';
  if (input.isDefault && !input.hasOtherActiveCommonAccount) return 'reject-default';
  return 'deactivate';
}

export function categoryRemovalDecision(input: {
  hasTransactions: boolean;
  hasChildren: boolean;
  hasBudgetLines: boolean;
  hasBudgets: boolean;
  hasPlans: boolean;
}): CategoryRemovalDecision {
  if (
    input.hasTransactions
    || input.hasChildren
    || input.hasBudgetLines
    || input.hasBudgets
    || input.hasPlans
  ) {
    return 'deactivate';
  }
  return 'delete';
}

export function templateRemovalDecision(hasGeneratedMonths: boolean): TemplateRemovalDecision {
  return hasGeneratedMonths ? 'unlink-and-delete' : 'delete';
}
