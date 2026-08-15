export function compareByName(first: string, second: string) {
  return first.localeCompare(second, 'pt-BR', { sensitivity: 'base' });
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((first, second) => compareByName(first.name, second.name));
}
