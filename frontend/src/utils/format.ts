export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string'
    ? new Date(date.includes('T') ? date : `${date}T12:00:00`)
    : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCurrentPeriod(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const RESPONSIBLE_LABELS: Record<string, string> = {
  USER: 'Gustavo',
  PARTNER: 'Noiva',
  COUPLE: 'Casal',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: 'Entrada',
  EXPENSE: 'Saída',
  TRANSFER: 'Transferência',
};

export const ALERT_LABELS: Record<string, string> = {
  '50_percent': '50% do orçamento',
  '75_percent': '75% do orçamento',
  '90_percent': '90% do orçamento',
  over_limit: 'Acima do limite',
  pace_above_budget: 'Ritmo acima do orçamento',
};
