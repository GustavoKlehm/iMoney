export function canBeDefault(account: { isReserved: boolean; isActive: boolean }): boolean {
  return !account.isReserved && account.isActive;
}
