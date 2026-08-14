export function monthsRemaining(today: Date, endDate: Date): number | null {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  if (e < t) return null;
  const months = (e.getFullYear() - t.getFullYear()) * 12 + (e.getMonth() - t.getMonth());
  return months <= 0 ? 1 : months;
}

export function monthlyReserve(
  target: number,
  balance: number,
  months: number | null,
): number {
  if (balance >= target) return 0;
  if (months === null || months <= 0) return 0;
  return (target - balance) / months;
}

export function isGoalAchieved(target: number, balance: number): boolean {
  return balance >= target;
}
