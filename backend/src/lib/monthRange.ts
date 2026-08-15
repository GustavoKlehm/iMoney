import { monthStart } from './appTime.js';

export function monthRange(year: number, month: number) {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: monthStart(year, month),
    end: monthStart(nextYear, nextMonth),
  };
}
