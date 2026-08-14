export function accountBalance(p: {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
}): number {
  return p.income - p.expense + p.transferIn - p.transferOut;
}
