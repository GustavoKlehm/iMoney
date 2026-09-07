export type YearMonth = { year: number; month: number };

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function periodKey(period: YearMonth): string {
  return `${period.year}-${pad(period.month)}`;
}

export function parsePeriod(value: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return { year, month };
}

export function isSamePeriod(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export function isBeforePeriod(a: YearMonth, b: YearMonth): boolean {
  return a.year < b.year || (a.year === b.year && a.month < b.month);
}

export function previousPeriod(period: YearMonth): YearMonth {
  if (period.month === 1) return { year: period.year - 1, month: 12 };
  return { year: period.year, month: period.month - 1 };
}

export function maxPeriod(a: YearMonth, b: YearMonth): YearMonth {
  return isBeforePeriod(a, b) ? b : a;
}

export function minPeriod(a: YearMonth, b: YearMonth): YearMonth {
  return isBeforePeriod(a, b) ? a : b;
}

export function readPeriodFromSearch(
  params: URLSearchParams,
  fallback: YearMonth,
): YearMonth {
  const year = Number(params.get('ano'));
  const month = Number(params.get('mes'));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return fallback;
  }
  return { year, month };
}
