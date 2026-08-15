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

export function monthLinesFromWizard(
  defaults: ApplyLine[],
  drafts: ApplyLine[],
  existingCategoryIds: Iterable<string> = [],
): ApplyLine[] {
  const defaultMap = new Map(defaults.map((line) => [line.categoryId, line.amount]));
  const draftMap = new Map(drafts.map((line) => [line.categoryId, line.amount]));
  const existing = new Set(existingCategoryIds);
  const ids = new Set([...defaultMap.keys(), ...draftMap.keys(), ...existing]);
  const lines: ApplyLine[] = [];

  for (const categoryId of ids) {
    const fallback = defaultMap.get(categoryId) ?? 0;
    const amount = draftMap.has(categoryId) ? draftMap.get(categoryId)! : fallback;
    if (amount > 0 || fallback > 0 || (amount === 0 && existing.has(categoryId))) {
      lines.push({ categoryId, amount });
    }
  }

  return lines;
}

export function budgetsToUpsert(
  lines: ApplyLine[],
  months: { year: number; month: number }[],
  existing: ExistingBudget[],
  overwrite: boolean,
  includeZero = false,
): {
  upsert: { categoryId: string; year: number; month: number; amount: number }[];
  skipped: number;
} {
  const existingSet = new Set(existing.map((e) => `${e.categoryId}:${e.year}:${e.month}`));
  const upsert: { categoryId: string; year: number; month: number; amount: number }[] = [];
  let skipped = 0;
  const eligible = includeZero ? lines : lines.filter((line) => line.amount > 0);
  for (const m of months) {
    for (const line of eligible) {
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
