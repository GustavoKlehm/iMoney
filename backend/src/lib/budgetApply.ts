export function monthSequence(
  startYear: number,
  startMonth: number,
  count: number,
): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  let year = startYear;
  let month = startMonth;
  for (let i = 0; i < count; i++) {
    out.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

export type ApplyLine = { categoryId: string; amount: number };
export type ExistingBudget = { categoryId: string; year: number; month: number };

export function budgetsToUpsert(
  lines: ApplyLine[],
  months: { year: number; month: number }[],
  existing: ExistingBudget[],
  overwrite: boolean,
): {
  upsert: { categoryId: string; year: number; month: number; amount: number }[];
  skipped: number;
} {
  const existingSet = new Set(existing.map((e) => `${e.categoryId}:${e.year}:${e.month}`));
  const upsert: { categoryId: string; year: number; month: number; amount: number }[] = [];
  let skipped = 0;
  const positive = lines.filter((l) => l.amount > 0);
  for (const m of months) {
    for (const line of positive) {
      const key = `${line.categoryId}:${m.year}:${m.month}`;
      if (existingSet.has(key) && !overwrite) {
        skipped += 1;
        continue;
      }
      upsert.push({
        categoryId: line.categoryId,
        year: m.year,
        month: m.month,
        amount: line.amount,
      });
    }
  }
  return { upsert, skipped };
}
