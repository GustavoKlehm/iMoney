import { appNowParts } from './appTime.js';

export type YearMonth = { year: number; month: number };

export type PeriodBounds = {
  earliest: YearMonth | null;
  latest: YearMonth | null;
};

function isBefore(a: YearMonth, b: YearMonth): boolean {
  return a.year < b.year || (a.year === b.year && a.month < b.month);
}

/** Deriva o intervalo ano-mês (fuso do app) a partir de datas de lançamentos. */
export function summarizeTransactionPeriods(dates: Date[]): PeriodBounds {
  if (dates.length === 0) {
    return { earliest: null, latest: null };
  }

  let earliest: YearMonth | null = null;
  let latest: YearMonth | null = null;

  for (const date of dates) {
    const { year, month } = appNowParts(date);
    const period = { year, month };
    if (!earliest || isBefore(period, earliest)) earliest = period;
    if (!latest || isBefore(latest, period)) latest = period;
  }

  return { earliest, latest };
}
