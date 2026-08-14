export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ status: string; service: string }>('/health'),

  dashboard: (year: number, month: number) =>
    request<DashboardData>(`/dashboard/monthly?year=${year}&month=${month}`),

  categories: {
    list: () => request<Category[]>('/categories'),
    create: (data: CreateCategory) =>
      request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  },

  accounts: {
    list: () => request<Account[]>('/accounts'),
  },

  transactions: {
    list: (params?: TransactionListParams) => {
      const qs = new URLSearchParams();
      if (params?.year) qs.set('year', String(params.year));
      if (params?.month) qs.set('month', String(params.month));
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<TransactionListResponse>(`/transactions${query ? `?${query}` : ''}`);
    },
    create: (data: CreateTransaction) =>
      request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: string) =>
      request<Transaction>(`/transactions/${id}/cancel`, { method: 'POST' }),
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type Responsible = 'USER' | 'PARTNER' | 'COUPLE';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  isActive: boolean;
  children?: Category[];
}

export interface Account {
  id: string;
  name: string;
  description: string | null;
  isReserved: boolean;
  balance?: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: string;
  type: TransactionType;
  description: string;
  responsible: Responsible | null;
  isCancelled: boolean;
  category: Category | null;
  account: Account | null;
}

export interface CreateCategory {
  name: string;
  type: TransactionType;
  parentId?: string;
}

export interface CreateTransaction {
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  categoryId?: string;
  accountId?: string;
  toAccountId?: string;
  responsible?: Responsible;
}

export interface TransactionListParams {
  year?: number;
  month?: number;
  limit?: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
}

export interface BudgetProgress {
  category: Category;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  projected: number;
  alert: string | null;
}

export interface DashboardData {
  period: { year: number; month: number; daysInMonth: number; daysElapsed: number };
  summary: {
    income: number;
    expenses: number;
    balance: number;
    totalBalance: number;
    reservedTotal: number;
    freeBalance: number;
  };
  budgetProgress: BudgetProgress[];
  accountBalances: Account[];
  activePlans: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    remaining: number;
    progress: number;
  }>;
}
