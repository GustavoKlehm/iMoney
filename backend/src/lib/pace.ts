export type PaceStatus = 'on_track' | 'warning' | 'over_pace' | 'over_limit';

export function expectedToDate(limit: number, day: number, daysInMonth: number): number {
  if (daysInMonth <= 0) return 0;
  return limit * (day / daysInMonth);
}

export function projectedMonth(spent: number, day: number, daysInMonth: number): number {
  if (day <= 0) return 0;
  return (spent / day) * daysInMonth;
}

export function paceStatus(params: {
  spent: number;
  limit: number;
  day: number;
  daysInMonth: number;
  isCurrentMonth: boolean;
}): PaceStatus | null {
  if (params.spent >= params.limit) return 'over_limit';
  if (!params.isCurrentMonth) return null;
  const expected = expectedToDate(params.limit, params.day, params.daysInMonth);
  if (expected <= 0) return null;
  const ratio = params.spent / expected;
  if (ratio > 1) return 'over_pace';
  if (ratio > 0.8) return 'warning';
  return 'on_track';
}
