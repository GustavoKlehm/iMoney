import { supabase } from '../lib/supabase';

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const fetchWithToken = (token?: string) => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    return fetch(`${API_BASE}${path}`, { ...options, headers });
  };

  const { data } = await supabase.auth.getSession();
  let res = await fetchWithToken(data.session?.access_token);

  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    res = await fetchWithToken(refreshed.session?.access_token);

    if (res.status === 401) {
      await supabase.auth.signOut();
    }
  }

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
    update: (id: string, data: Partial<CreateCategory> & { isActive?: boolean }) =>
      request<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<void>(`/categories/${id}`, { method: 'DELETE' }),
  },

  accounts: {
    list: () => request<Account[]>('/accounts'),
    create: (data: CreateAccount) =>
      request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateAccount> & { isActive?: boolean }) =>
      request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    setDefault: (id: string) =>
      request<Account>(`/accounts/${id}/default`, { method: 'POST' }),
    remove: (id: string) =>
      request<Account | void>(`/accounts/${id}`, { method: 'DELETE' }),
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
    get: (id: string) => request<Transaction>(`/transactions/${id}`),
    update: (id: string, data: Partial<CreateTransaction>) =>
      request<Transaction>(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/transactions/${id}`, { method: 'DELETE' }),
    cancel: (id: string) =>
      request<Transaction>(`/transactions/${id}/cancel`, { method: 'POST' }),
  },

  budgetTemplates: {
    list: () => request<BudgetTemplate[]>('/budget-templates'),
    create: (data: CreateBudgetTemplate) =>
      request<BudgetTemplate>('/budget-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<BudgetTemplate>(`/budget-templates/${id}`),
    update: (id: string, data: UpdateBudgetTemplate) =>
      request<BudgetTemplate>(`/budget-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    apply: (id: string, data: ApplyBudgetTemplate) =>
      request<ApplyBudgetResult>(`/budget-templates/${id}/apply`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/budget-templates/${id}`, { method: 'DELETE' }),
  },

  budgets: {
    list: (year: number, month: number) =>
      request<Budget[]>(`/budgets?year=${year}&month=${month}`),
    update: (id: string, data: { limitAmount: number }) =>
      request<Budget>(`/budgets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  plans: {
    listGoals: () => request<Goal[]>('/plans?type=GOAL'),
    createGoal: (data: CreateGoal) =>
      request<Goal>('/plans', { method: 'POST', body: JSON.stringify(data) }),
    updateGoal: (id: string, data: UpdateGoal) =>
      request<Goal>(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    removeGoal: (id: string) =>
      request<void>(`/plans/${id}`, { method: 'DELETE' }),
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
  hasHistory?: boolean;
  children?: Category[];
}

export interface Account {
  id: string;
  name: string;
  description: string | null;
  isReserved: boolean;
  isDefault: boolean;
  isActive: boolean;
  balance?: number;
  hasHistory?: boolean;
}

export interface CreateAccount {
  name: string;
  description?: string;
  isReserved?: boolean;
  openingBalance?: number;
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
  toAccount: Account | null;
  isOpeningBalance?: boolean;
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

export interface BudgetTemplateLine {
  id: string;
  templateId: string;
  categoryId: string;
  amount: string;
  category: Category;
}

export interface BudgetPeriod {
  year: number;
  month: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  lines: BudgetTemplateLine[];
  budgets?: BudgetPeriod[];
  hasGeneratedMonths?: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  sourceTemplateId: string | null;
  year: number;
  month: number;
  limitAmount: string;
  category: Category;
}

export interface BudgetTemplateLineInput {
  categoryId: string;
  amount: number;
}

export interface CreateBudgetTemplate {
  name: string;
  lines: BudgetTemplateLineInput[];
}

export interface UpdateBudgetTemplate {
  name?: string;
  lines?: BudgetTemplateLineInput[];
}

export interface ApplyBudgetTemplate {
  startYear: number;
  startMonth: number;
  months: number;
  overwrite: boolean;
  monthLines?: {
    year: number;
    month: number;
    lines: BudgetTemplateLineInput[];
  }[];
}

export interface ApplyBudgetResult {
  created: number;
  skipped: number;
}

export type PlanStatus = 'ACTIVE' | 'ACHIEVED' | 'PAUSED' | 'CANCELLED' | 'CLOSED';

export interface Goal {
  id: string;
  name: string;
  type: 'GOAL';
  accountId: string;
  account: Account;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  remaining: number;
  progress: number;
  monthsRemaining: number | null;
  monthlyReserve: number;
}

export interface CreateGoal {
  name: string;
  accountId: string;
  targetAmount: number;
  startDate?: string;
  endDate: string;
}

export type UpdateGoal = Partial<Omit<CreateGoal, 'startDate'>>;

export type PaceStatus = 'on_track' | 'warning' | 'over_pace' | 'over_limit';

export interface BudgetProgress {
  category: Category;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  projected: number;
  expectedToDate: number;
  paceRatio: number;
  paceStatus: PaceStatus | null;
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
    plannedLimits: number;
    unplannedExpenses: number;
    projectedFreeBalance: number;
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
