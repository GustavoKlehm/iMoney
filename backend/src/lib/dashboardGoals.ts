import { isGoalAchieved } from './goal.js';

export type DashboardGoalInput = {
  accountId: string | null;
  targetAmount: number;
  currentAmount: number;
};

/** Metas do Dashboard: só GOAL com cofrinho e ainda não atingidas. */
export function filterDashboardGoals<T extends DashboardGoalInput>(plans: T[]): T[] {
  return plans.filter((plan) => {
    if (plan.accountId == null) return false;
    return !isGoalAchieved(plan.targetAmount, plan.currentAmount);
  });
}
