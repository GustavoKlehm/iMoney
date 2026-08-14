# Experiência financeira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a experiência aprovada em `docs/superpowers/specs/2026-08-13-experiencia-financeira-design.md`: login Supabase (dois e-mails), contas/cofrinhos, lançamentos com três tipos **sem responsável**, categorias em acordeão, planejamentos mensais, objetivos ligados a cofrinho e ritmo proporcional no dashboard.

**Architecture:** Auth no frontend com `@supabase/supabase-js` (`persistSession` + `autoRefreshToken`); API Express valida o JWT. Regras de negócio em funções puras em `backend/src/lib/`. Conta e cofrinho são o mesmo `Account`. Orçamento em `Budget` + `BudgetTemplate`. Objetivo é `Plan` GOAL com `accountId`. Os dois logins veem o mesmo casal.

**Tech Stack:** Node 20, Express, Prisma/PostgreSQL, Zod, React 19, Vite, TanStack Query, React Router v7, `@supabase/supabase-js`, CSS por componente. Testes: `node:test` + `tsx`.

## Global Constraints

- UI e erros em **português**; rotas em português; valores em **BRL**.
- Mobile-first, mínimo **375px**; toques ≥ **44px**; `cursor: pointer`; `:focus-visible`; sem emoji como ícone.
- Cores só via tokens existentes: `--primary`, `--success`, `--warning`, `--danger`, `--text`, `--surface`, `--border`, `--bg`.
- Orçamento **nunca bloqueia** gasto.
- Transferência **não** conta como renda nem despesa.
- Lançamento **não** tem responsável. Dinheiro é do casal.
- Tipos em `frontend/src/api/client.ts` sincronizados com o backend em cada fatia.
- Seguir `frontend-ui-ux.mdc` (skill ui-ux-pro-max) ao implementar páginas.
- Única dependência nova permitida: `@supabase/supabase-js` (frontend e backend). Testes com `node:test`.
- Spec: `docs/superpowers/specs/2026-08-13-experiencia-financeira-design.md`.

## File map

| Arquivo | Responsabilidade |
|---|---|
| `backend/src/lib/pace.ts` | Ritmo proporcional (esperado, projeção, status) |
| `backend/src/lib/goal.ts` | Meses restantes, reserva mensal, atingido |
| `backend/src/lib/budgetApply.ts` | Sequência de meses e upsert vs skip |
| `backend/src/lib/accountRules.ts` | Quem pode ser padrão |
| `backend/src/lib/accountBalance.ts` | Fórmula de saldo |
| `backend/prisma/schema.prisma` | Deltas de modelo |
| `backend/src/routes/accounts.ts` | CRUD, padrão, saldo inicial |
| `backend/src/routes/transactions.ts` | Datetime |
| `backend/src/routes/budgetTemplates.ts` | Moldes + apply |
| `backend/src/routes/budgets.ts` | Listar/editar mês |
| `backend/src/routes/plans.ts` | Objetivos GOAL |
| `backend/src/routes/dashboard.ts` | Renda sem abertura; pace; progresso do cofrinho |
| `frontend/src/api/client.ts` | Cliente HTTP + tipos |
| `frontend/src/components/Layout.tsx` + `GlassNav.tsx` | Nav Dashboard / Lançamentos / Cadastros |
| `frontend/src/pages/Cadastros.tsx` | Índice |
| `frontend/src/pages/Accounts.tsx` | Contas e cofrinhos |
| `frontend/src/pages/Transactions.tsx` | Lista + botão Adicionar |
| `frontend/src/pages/NewTransaction.tsx` | Form três tipos + query params |
| `frontend/src/pages/Categories.tsx` | Acordeão + CRUD |
| `frontend/src/pages/BudgetPlans.tsx` | Moldes |
| `frontend/src/pages/BudgetPlanDetail.tsx` | Gerar meses / editar mês |
| `frontend/src/pages/Goals.tsx` + `GoalDetail.tsx` | Objetivos |
| `frontend/src/pages/Dashboard.tsx` | Cores de ritmo |
| `frontend/src/App.tsx` | Rotas |
| `frontend/src/lib/supabase.ts` | Cliente Supabase (persistSession + autoRefreshToken) |
| `frontend/src/auth/AuthProvider.tsx` | Sessão, login, logout |
| `frontend/src/pages/Login.tsx` | E-mail e senha |
| `backend/src/middleware/requireAuth.ts` | Bearer JWT via `auth.getUser` |
| `backend/.env.example` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

---

### Task 0: Auth Supabase (dois logins, sessão persistida)

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/auth/AuthProvider.tsx`
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Login.css`
- Create: `backend/src/middleware/requireAuth.ts`
- Modify: `backend/src/app.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `backend/.env.example`
- Modify: `frontend/package.json` e `backend/package.json` (`@supabase/supabase-js`)

**Interfaces:**
- Consumes: projeto Supabase já usado no Postgres
- Produces: `useAuth()` `{ session, user, signIn, signOut, loading }`; `requireAuth` Express; `request()` anexa Bearer

- [ ] **Step 1: Instalar cliente**

Run (na raiz do monorepo):

```bash
npm install @supabase/supabase-js -w frontend -w backend
```

Expected: pacote nas duas workspaces.

- [ ] **Step 2: Env de exemplo**

`backend/.env.example` — acrescentar:

```
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_ANON_KEY="[ANON_KEY]"
```

O usuário copia para `backend/.env` e cria `frontend/.env` (não commitado):

```
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

Mesmo URL/anon key do painel Supabase → Settings → API.

- [ ] **Step 3: Cliente frontend**

`frontend/src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios');
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 4: AuthProvider**

`frontend/src/auth/AuthProvider.tsx` — `createContext`; no mount `supabase.auth.getSession()` e `onAuthStateChange`; `signIn(email, password)` chama `signInWithPassword`; `signOut` chama `signOut()`. Exportar `useAuth()`.

- [ ] **Step 5: Login UI**

`Login.tsx`: form e-mail + senha (autocomplete, `type=password`, labels visíveis, toque ≥ 44px). Submit → `signIn`. Erro Auth → “E-mail ou senha incorretos”. Sem link de cadastro. Se `session` já existe, `<Navigate to="/" replace />`. CSS no estilo de `NewTransaction.css` (form glass).

- [ ] **Step 6: Rotas protegidas**

`App.tsx`: `AuthProvider` envolvendo o Router. Rota `/login` fora do `Layout`. Demais rotas: se `loading`, “Carregando...”; se sem `session`, `<Navigate to="/login" replace />`.

- [ ] **Step 7: API client com Bearer**

Em `request()`, antes do fetch:

```ts
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;
```

Header `Authorization: Bearer ${token}` quando houver token. Se `res.status === 401`, `await supabase.auth.refreshSession()` uma vez e repetir o fetch; se ainda 401, `await supabase.auth.signOut()` (o AuthProvider manda a `/login`).

- [ ] **Step 8: Backend requireAuth**

`backend/src/middleware/requireAuth.ts`: ler `Authorization`; se não Bearer → `AppError(401, 'Não autenticado')`. `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY).auth.getUser(token)`; se `error` ou sem user → 401. Não anexar user ao lançamento.

`app.ts`: `app.use('/api', requireAuth)` **depois** de montar `/api/health` **ou** no middleware pular se `req.path === '/health'` (o router está em `/api`, então `req.path` no app-level pode ser `/api/health` — pular quando `req.path === '/health' || req.originalUrl.startsWith('/api/health')`).

Implementação segura: em `app.ts`, `app.use('/api/health', healthRoutes)` **antes** de `app.use('/api', requireAuth)` e `app.use('/api', routes)` — ou o middleware ignora `GET /health`.

- [ ] **Step 9: Header Sair**

`Layout.tsx`: texto do `user.email` + botão **Sair** (min 44px) que chama `signOut()`.

- [ ] **Step 10: Verificar**

Criar dois usuários no painel Supabase (e-mail de cada um). Run `npm run dev`. Expected: sem login não vê dashboard; login persiste após F5; Sair volta a `/login`; `/api/accounts` sem token → 401.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/lib/supabase.ts frontend/src/auth frontend/src/pages/Login.tsx frontend/src/pages/Login.css frontend/src/api/client.ts frontend/src/App.tsx frontend/src/components/Layout.tsx backend/src/middleware/requireAuth.ts backend/src/app.ts backend/.env.example frontend/package.json backend/package.json package-lock.json
git commit -m "feat: add Supabase email/password auth with persisted session"
```

---

### Task 1: Kernel de regras + runner de testes

**Files:**
- Create: `backend/src/lib/pace.ts`
- Create: `backend/src/lib/pace.test.ts`
- Create: `backend/src/lib/goal.ts`
- Create: `backend/src/lib/goal.test.ts`
- Create: `backend/src/lib/budgetApply.ts`
- Create: `backend/src/lib/budgetApply.test.ts`
- Create: `backend/src/lib/accountRules.ts`
- Create: `backend/src/lib/accountRules.test.ts`
- Create: `backend/src/lib/accountBalance.ts`
- Create: `backend/src/lib/accountBalance.test.ts`
- Modify: `backend/package.json` (script `test`)
- Modify: `backend/tsconfig.json` (exclude `src/**/*.test.ts`)

**Interfaces:**
- Consumes: nada
- Produces:
  - `paceStatus({ spent, limit, day, daysInMonth, isCurrentMonth }): 'on_track' | 'warning' | 'over_pace' | 'over_limit' | null`
  - `expectedToDate(limit, day, daysInMonth): number`
  - `projectedMonth(spent, day, daysInMonth): number`
  - `monthsRemaining(today: Date, endDate: Date): number | null`
  - `monthlyReserve(target, balance, monthsRemaining): number`
  - `isGoalAchieved(target, balance): boolean`
  - `canBeDefault(account: { isReserved: boolean; isActive: boolean }): boolean`
  - `accountBalance({ income, expense, transferIn, transferOut }): number`
  - `monthSequence(startYear, startMonth, count): { year: number; month: number }[]`
  - `budgetsToUpsert(lines, months, existing, overwrite): { upsert: Array<{ categoryId, year, month, amount }>; skipped: number }`

- [ ] **Step 1: Script de teste e exclude no tsc**

Em `backend/package.json`, adicionar:

```json
"test": "node --import tsx --test src/lib/*.test.ts"
```

Em `backend/tsconfig.json`, `exclude` vira:

```json
"exclude": ["node_modules", "dist", "src/**/*.test.ts"]
```

- [ ] **Step 2: Testes de ritmo (devem falhar)**

`backend/src/lib/pace.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { expectedToDate, paceStatus, projectedMonth } from './pace.ts';

describe('expectedToDate', () => {
  it('dia 10 de 30 dias, limite 900 → 300', () => {
    assert.equal(expectedToDate(900, 10, 30), 300);
  });
});

describe('projectedMonth', () => {
  it('500 no dia 10 de 30 → 1500', () => {
    assert.equal(projectedMonth(500, 10, 30), 1500);
  });
});

describe('paceStatus mês corrente', () => {
  const base = { limit: 900, day: 10, daysInMonth: 30, isCurrentMonth: true };

  it('240 → on_track (80% do proporcional)', () => {
    assert.equal(paceStatus({ ...base, spent: 240 }), 'on_track');
  });
  it('270 → warning', () => {
    assert.equal(paceStatus({ ...base, spent: 270 }), 'warning');
  });
  it('301 → over_pace', () => {
    assert.equal(paceStatus({ ...base, spent: 301 }), 'over_pace');
  });
  it('900 → over_limit', () => {
    assert.equal(paceStatus({ ...base, spent: 900 }), 'over_limit');
  });
});

describe('paceStatus outro mês', () => {
  it('só over_limit ou null', () => {
    assert.equal(
      paceStatus({ spent: 100, limit: 900, day: 10, daysInMonth: 30, isCurrentMonth: false }),
      null,
    );
    assert.equal(
      paceStatus({ spent: 900, limit: 900, day: 10, daysInMonth: 30, isCurrentMonth: false }),
      'over_limit',
    );
  });
});
```

- [ ] **Step 3: Testes de objetivo, saldo, padrão e apply (devem falhar)**

`backend/src/lib/goal.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isGoalAchieved, monthlyReserve, monthsRemaining } from './goal.ts';

describe('monthsRemaining', () => {
  it('mesmo mês, prazo futuro → 1', () => {
    assert.equal(monthsRemaining(new Date(2026, 7, 13), new Date(2026, 7, 31)), 1);
  });
  it('9 meses à frente', () => {
    assert.equal(monthsRemaining(new Date(2026, 7, 13), new Date(2027, 4, 13)), 9);
  });
  it('prazo vencido → null', () => {
    assert.equal(monthsRemaining(new Date(2026, 7, 13), new Date(2026, 6, 1)), null);
  });
});

describe('monthlyReserve', () => {
  it('meta 12000, saldo 3000, 9 meses → 1000', () => {
    assert.equal(monthlyReserve(12000, 3000, 9), 1000);
  });
  it('já atingido → 0', () => {
    assert.equal(monthlyReserve(10000, 10000, 3), 0);
  });
  it('prazo vencido (months null) → 0', () => {
    assert.equal(monthlyReserve(10000, 3000, null), 0);
  });
});

describe('isGoalAchieved', () => {
  it('saldo >= meta', () => {
    assert.equal(isGoalAchieved(40000, 40000), true);
    assert.equal(isGoalAchieved(40000, 39999), false);
  });
});
```

`backend/src/lib/accountBalance.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accountBalance } from './accountBalance.ts';

describe('accountBalance', () => {
  it('abertura 100 − saída 30 − transferência 20 → 50', () => {
    assert.equal(
      accountBalance({ income: 100, expense: 30, transferIn: 0, transferOut: 20 }),
      50,
    );
  });
  it('cofrinho recebe 20', () => {
    assert.equal(
      accountBalance({ income: 0, expense: 0, transferIn: 20, transferOut: 0 }),
      20,
    );
  });
});
```

`backend/src/lib/accountRules.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canBeDefault } from './accountRules.ts';

describe('canBeDefault', () => {
  it('conta comum ativa pode', () => {
    assert.equal(canBeDefault({ isReserved: false, isActive: true }), true);
  });
  it('cofrinho não pode', () => {
    assert.equal(canBeDefault({ isReserved: true, isActive: true }), false);
  });
  it('inativa não pode', () => {
    assert.equal(canBeDefault({ isReserved: false, isActive: false }), false);
  });
});
```

`backend/src/lib/budgetApply.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { budgetsToUpsert, monthSequence } from './budgetApply.ts';

describe('monthSequence', () => {
  it('nov a jan atravessa o ano', () => {
    assert.deepEqual(monthSequence(2026, 11, 3), [
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });
});

describe('budgetsToUpsert', () => {
  const lines = [{ categoryId: 'cat-1', amount: 900 }];
  const months = [{ year: 2026, month: 8 }];

  it('cria quando não existe', () => {
    const r = budgetsToUpsert(lines, months, [], false);
    assert.equal(r.upsert.length, 1);
    assert.equal(r.skipped, 0);
  });
  it('pula existente se overwrite false', () => {
    const r = budgetsToUpsert(
      lines,
      months,
      [{ categoryId: 'cat-1', year: 2026, month: 8 }],
      false,
    );
    assert.equal(r.upsert.length, 0);
    assert.equal(r.skipped, 1);
  });
  it('substitui se overwrite true', () => {
    const r = budgetsToUpsert(
      lines,
      months,
      [{ categoryId: 'cat-1', year: 2026, month: 8 }],
      true,
    );
    assert.equal(r.upsert.length, 1);
  });
  it('ignora linha com amount 0', () => {
    const r = budgetsToUpsert([{ categoryId: 'cat-1', amount: 0 }], months, [], false);
    assert.equal(r.upsert.length, 0);
  });
});
```

- [ ] **Step 4: Rodar testes — devem falhar**

Run: `npm test -w backend`

Expected: FAIL (`Cannot find module` ou `ERR_MODULE_NOT_FOUND` para `./pace.ts` etc.)

- [ ] **Step 5: Implementar as funções**

`backend/src/lib/pace.ts`:

```ts
export type PaceStatus = 'on_track' | 'warning' | 'over_pace' | 'over_limit';

export function expectedToDate(limit: number, day: number, daysInMonth: number): number {
  if (daysInMonth <= 0) return 0;
  return limit * (day / daysInMonth);
}

export function projectedMonth(spent: number, day: number, daysInMonth: number): number {
  if (day <= 0) return 0;
  return (spent / day) * daysInMonth;
}

export function paceStatus(params: {
  spent: number;
  limit: number;
  day: number;
  daysInMonth: number;
  isCurrentMonth: boolean;
}): PaceStatus | null {
  if (params.spent >= params.limit) return 'over_limit';
  if (!params.isCurrentMonth) return null;
  const expected = expectedToDate(params.limit, params.day, params.daysInMonth);
  if (expected <= 0) return null;
  const ratio = params.spent / expected;
  if (ratio > 1) return 'over_pace';
  if (ratio > 0.8) return 'warning';
  return 'on_track';
}
```

`backend/src/lib/goal.ts`:

```ts
export function monthsRemaining(today: Date, endDate: Date): number | null {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  if (e < t) return null;
  const months = (e.getFullYear() - t.getFullYear()) * 12 + (e.getMonth() - t.getMonth());
  return months <= 0 ? 1 : months;
}

export function monthlyReserve(
  target: number,
  balance: number,
  months: number | null,
): number {
  if (balance >= target) return 0;
  if (months === null || months <= 0) return 0;
  return (target - balance) / months;
}

export function isGoalAchieved(target: number, balance: number): boolean {
  return balance >= target;
}
```

`backend/src/lib/accountBalance.ts`:

```ts
export function accountBalance(p: {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
}): number {
  return p.income - p.expense + p.transferIn - p.transferOut;
}
```

`backend/src/lib/accountRules.ts`:

```ts
export function canBeDefault(account: { isReserved: boolean; isActive: boolean }): boolean {
  return !account.isReserved && account.isActive;
}
```

`backend/src/lib/budgetApply.ts`:

```ts
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
```

- [ ] **Step 6: Rodar testes — devem passar**

Run: `npm test -w backend`

Expected: PASS (todos os testes acima)

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib backend/package.json backend/tsconfig.json
git commit -m "test: add finance domain rules (pace, goals, budgets, accounts)"
```

---

### Task 2: Schema Prisma — contas, datetime, moldes, objetivos

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`
- Test: reusa testes da Task 1 (sem mudança)

**Interfaces:**
- Consumes: Task 1
- Produces: campos `Account.isDefault`, `Transaction.date` DateTime, `Transaction.isOpeningBalance`, `Budget.sourceTemplateId`, modelos `BudgetTemplate`, `BudgetTemplateLine`, `Plan.accountId`, `PlanAudit`

- [ ] **Step 1: Alterar schema**

Em `Account`, depois de `isActive`:

```prisma
  isDefault   Boolean @default(false) @map("is_default")
```

Em `Transaction`, trocar `date DateTime @db.Date` por `date DateTime` e adicionar:

```prisma
  isOpeningBalance Boolean @default(false) @map("is_opening_balance")
```

Em `Budget`:

```prisma
  sourceTemplateId String? @map("source_template_id")
  sourceTemplate   BudgetTemplate? @relation(fields: [sourceTemplateId], references: [id])
```

Em `Plan`, após `category`:

```prisma
  accountId String?  @map("account_id")
  account   Account? @relation(fields: [accountId], references: [id])
  auditLogs PlanAudit[]
```

Em `Account`, adicionar:

```prisma
  plans Plan[]
```

Novos models no fim do schema (antes do fechamento):

```prisma
model BudgetTemplate {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  lines   BudgetTemplateLine[]
  budgets Budget[]

  @@map("budget_templates")
}

model BudgetTemplateLine {
  id         String         @id @default(uuid())
  templateId String         @map("template_id")
  template   BudgetTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  categoryId String         @map("category_id")
  category   Category       @relation(fields: [categoryId], references: [id])
  amount     Decimal        @db.Decimal(12, 2)

  @@unique([templateId, categoryId])
  @@map("budget_template_lines")
}

model PlanAudit {
  id        String   @id @default(uuid())
  planId    String   @map("plan_id")
  plan      Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  field     String
  oldValue  String?  @map("old_value")
  newValue  String?  @map("new_value")
  changedAt DateTime @default(now()) @map("changed_at")

  @@map("plan_audits")
}
```

Em `Category`, adicionar `budgetTemplateLines BudgetTemplateLine[]`.

- [ ] **Step 2: Seed — conta corrente padrão**

No `upsert` de `contaCorrente`, incluir `isDefault: true`. No de `reservaViagem`, `isDefault` permanece false.

- [ ] **Step 3: Push do schema**

Run: `npm run db:push`

Expected: schema sincronizado no Supabase, sem erro. Se `db:push` falhar por permissão, parar e pedir ao usuário.

- [ ] **Step 4: Generate client**

Run: `npm run db:generate`

Expected: Prisma Client atualizado.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/seed.ts
git commit -m "feat: extend schema for default accounts, datetime, budget templates and goal piggy banks"
```

---

### Task 3: API e UI de contas/cofrinhos + navegação Cadastros

**Files:**
- Modify: `backend/src/routes/accounts.ts` (arquivo inteiro)
- Modify: `backend/src/routes/dashboard.ts` (filtro `isOpeningBalance: false` no aggregate de income)
- Modify: `backend/src/routes/index.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/GlassNav.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/Cadastros.tsx`
- Create: `frontend/src/pages/Cadastros.css`
- Create: `frontend/src/pages/Accounts.tsx`
- Create: `frontend/src/pages/Accounts.css`

**Interfaces:**
- Consumes: `canBeDefault`, `accountBalance` (Task 1); schema Task 2
- Produces:
  - `GET /api/accounts` → `Account[]` com `balance`, `isDefault`, `isReserved`, `isActive`
  - `POST /api/accounts` body `{ name, description?, isReserved?, openingBalance? }`
  - `PATCH /api/accounts/:id` body parcial + `isActive?`
  - `POST /api/accounts/:id/default`
  - Rotas UI `/cadastros`, `/contas`

- [ ] **Step 1: Reescrever `accounts.ts`**

Substituir o arquivo por esta lógica (manter imports Prisma/Zod/AppError iguais ao estilo atual):

- `sumParts(accountId)` — quatro aggregates iguais aos de `dashboard.ts` linhas 80–97, depois `accountBalance(...)`.
- `GET /` — `findMany` orderBy `sortOrder`; mapear cada conta com `balance`.
- `POST /` — parse `{ name: z.string().min(1).max(100), description: z.string().optional(), isReserved: z.boolean().optional(), openingBalance: z.number().nonnegative().optional() }`. Se `isReserved === true`, `isDefault` false. Se primeira conta comum ativa, `isDefault true`. Se `openingBalance > 0`, no mesmo `$transaction` criar `Transaction` `{ type: INCOME, amount: openingBalance, description: \`Saldo inicial — ${name}\`, date: new Date(), isOpeningBalance: true, accountId }`.
- `POST /:id/default` — carregar conta; se `!canBeDefault(conta)` → `AppError(400, 'Cofrinho ou conta inativa não pode ser padrão')`. `updateMany` `{ isDefault: true }` → `{ isDefault: false }`; depois `update` desta `{ isDefault: true }`.
- `PATCH /:id` — se `isReserved === true` e `isDefault`, recusar. Se `isActive === false` e era padrão: achar outra comum ativa (`isReserved false`, `id not`, `isActive true`, orderBy `sortOrder`, take 1); se não houver → `AppError(400, 'Cadastre outra conta antes de desativar a padrão')`; senão promover essa e desativar a atual.

Incluir `isOpeningBalance` no GET balance existente (já soma INCOME; abertura entra no saldo — correto).

- [ ] **Step 2: Dashboard — renda do mês sem abertura**

Em `backend/src/routes/dashboard.ts`, no `incomeAgg` `where`, adicionar `isOpeningBalance: false`.

- [ ] **Step 3: Client frontend**

Estender `Account`:

```ts
export interface Account {
  id: string;
  name: string;
  description: string | null;
  isReserved: boolean;
  isDefault: boolean;
  isActive: boolean;
  balance?: number;
}

export interface CreateAccount {
  name: string;
  description?: string;
  isReserved?: boolean;
  openingBalance?: number;
}
```

`api.accounts`:

```ts
list: () => request<Account[]>('/accounts'),
create: (data: CreateAccount) =>
  request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
update: (id: string, data: Partial<CreateAccount> & { isActive?: boolean }) =>
  request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
setDefault: (id: string) =>
  request<Account>(`/accounts/${id}/default`, { method: 'POST' }),
```

- [ ] **Step 4: GlassNav — Cadastros ativo nas sub-rotas**

Em `GlassNavItem` adicionar `matchPrefix?: string[]`. No `className` do `NavLink`, se `matchPrefix` existir, `isActive` vira `matchPrefix.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))`.

`Layout.tsx` `navItems`:

```ts
const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/lancamentos', label: 'Lançamentos' },
  {
    to: '/cadastros',
    label: 'Cadastros',
    matchPrefix: ['/cadastros', '/contas', '/categorias', '/planejamentos', '/objetivos'],
  },
];
```

Remover `{ to: '/lancamentos/novo', label: '+ Gasto' }` e `{ to: '/categorias', label: 'Categorias' }`.

- [ ] **Step 5: Páginas Cadastros e Contas**

`Cadastros.tsx`: header “Cadastros”; lista de links (min-height 44px) para Contas e cofrinhos `/contas`, Categorias `/categorias`, Planejamentos `/planejamentos`, Objetivos `/objetivos`. CSS lista vertical, gap 0.75rem, mesmo glass das outras páginas.

`Accounts.tsx`:
- Query `api.accounts.list`.
- Header + botão **Nova conta ou cofrinho**.
- Form (mostrar ao clicar): nome, checkbox “É cofrinho”, saldo inicial opcional, submit.
- Lista: nome, selo Conta/Cofrinho, selo **Padrão**, saldo `formatCurrency`. Botão **Definir como padrão** só se `!isReserved && !isDefault`.
- Empty state: “Nenhuma conta ainda.”

Rotas em `App.tsx`:

```tsx
<Route path="cadastros" element={<CadastrosPage />} />
<Route path="contas" element={<AccountsPage />} />
```

Manter `/categorias` (Task 5 troca o conteúdo).

- [ ] **Step 6: Verificar no browser**

Run: `npm run dev`

Expected: nav com 3 itens; `/contas` cria conta com saldo inicial; selo Padrão na primeira conta comum; cofrinho sem botão padrão; Dashboard receitas **não** sobem com o saldo inicial.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/accounts.ts backend/src/routes/dashboard.ts backend/src/routes/index.ts frontend/src/api/client.ts frontend/src/components/Layout.tsx frontend/src/components/GlassNav.tsx frontend/src/App.tsx frontend/src/pages/Cadastros.tsx frontend/src/pages/Cadastros.css frontend/src/pages/Accounts.tsx frontend/src/pages/Accounts.css
git commit -m "feat: add accounts, piggy banks and Cadastros navigation"
```

---

### Task 4: Lançamentos — três tipos, data/hora, defaults 80/20

**Files:**
- Modify: `backend/src/routes/transactions.ts` (schema `date`)
- Modify: `frontend/src/pages/Transactions.tsx`
- Modify: `frontend/src/pages/Transactions.css`
- Modify: `frontend/src/pages/NewTransaction.tsx`
- Modify: `frontend/src/pages/NewTransaction.css`
- Modify: `frontend/src/utils/format.ts`
- Modify: `frontend/src/api/client.ts` (`CreateTransaction.date` aceita datetime; `toAccount` no tipo `Transaction`)

**Interfaces:**
- Consumes: `GET /accounts` com `isDefault`; categorias existentes
- Produces: form em `/lancamentos/novo` com `?type=TRANSFER&accountId=&toAccountId=`; lista com botão Adicionar; `date` ISO `YYYY-MM-DDTHH:mm`

- [ ] **Step 1: Zod datetime**

Trocar em `baseTransactionSchema`:

```ts
date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/),
```

`new Date(data.date)` no create/patch permanece. Incluir `toAccount` no `include` (já existe). `isOpeningBalance` **não** entra no schema público do POST.

- [ ] **Step 2: `formatDateTime`**

Em `format.ts`:

```ts
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
```

Ajustar `formatDate` para não concatenar `T12:00:00` se a string já tiver `T`.

Em `Transaction` do client, adicionar `toAccount: Account | null` e `isOpeningBalance?: boolean`.

- [ ] **Step 3: Lista**

Header de `Transactions.tsx`: título, subtítulo, `<Link to="/lancamentos/novo" className="btn-primary">Adicionar lançamento</Link>` (min-height 44px). Empty: “Nenhum lançamento ainda.” + mesmo botão (sem “gasto”).

Linha: se `isOpeningBalance`, selo “Saldo inicial”. Se `TRANSFER`, meta `origem → destino` (`tx.account?.name` → `tx.toAccount?.name`), valor sem `+`/`−`. Caso contrário só a categoria. **Não** mostrar responsável. Valor: classe `income` / `expense` / `transfer`. Data via `formatDateTime`.

CSS: `.page-header` em flex wrap, botão à direita no desktop, full-width no 375px.

- [ ] **Step 4: Form único**

`NewTransaction.tsx`:
- `useSearchParams`: `type`, `accountId`, `toAccountId`.
- Estado `type: TransactionType` default `EXPENSE`, ou query `type`.
- `nowLocal()` → `YYYY-MM-DDTHH:mm` via `new Date()` com pad.
- Contas: `defaultId = accounts.find(a => a.isDefault)?.id`; origem default = query `accountId` ?? `defaultId` ?? `''`.
- Destino default = query `toAccountId` ?? `''` (nunca igual à origem).
- Segmented control: três `<button type="button">` Entrada / Saída / Transferência, `aria-pressed`, min 44px.
- Campos por tipo conforme spec §5.2. Categorias: filhas ativas (`parentId` truthy) filtradas por `type`. Transferência: dois selects; se `accounts.filter(a => a.isActive).length < 2`, desabilitar o tipo Transferência e mostrar “Cadastre contas em Cadastros → Contas”.
- Submit: `api.transactions.create` com `type`; transferência envia `accountId` + `toAccountId`, sem `categoryId`. **Não** enviar `responsible` nem `userId`. Remover o select “Quem gastou” do form atual.
- Título da página: “Novo lançamento”. Botão: “Salvar”.

CSS do segmented: flex, gap 8px, botão ativo com `--primary` / fundo `--primary-light`.

- [ ] **Step 5: Verificar**

Run: `npm run dev`

Expected: sem **+ Gasto** na nav; Adicionar na lista; form abre em Saída com agora + conta padrão; transferência entre duas contas não muda receitas/despesas do dashboard; query `?type=TRANSFER&toAccountId=` pré-preenche destino.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/transactions.ts frontend/src/pages/Transactions.tsx frontend/src/pages/Transactions.css frontend/src/pages/NewTransaction.tsx frontend/src/pages/NewTransaction.css frontend/src/utils/format.ts frontend/src/api/client.ts
git commit -m "feat: unify income, expense and transfer from Lançamentos"
```

---

### Task 5: Categorias — acordeão + CRUD

**Files:**
- Modify: `frontend/src/api/client.ts` (`categories.update`, `categories.remove`)
- Modify: `backend/src/routes/categories.ts` (já tem POST/PATCH/DELETE — só usar)
- Modify: `frontend/src/pages/Categories.tsx`
- Modify: `frontend/src/pages/Categories.css`

**Interfaces:**
- Consumes: `GET/POST/PATCH/DELETE /categories`
- Produces: UI acordeão; `CreateCategory` + update `{ name?, isActive?, parentId?, type? }`

- [ ] **Step 1: Client**

```ts
update: (id: string, data: Partial<CreateCategory> & { isActive?: boolean }) =>
  request<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
remove: (id: string) =>
  request<void>(`/categories/${id}`, { method: 'DELETE' }),
```

Tratar 204 no `request` (já trata).

- [ ] **Step 2: Página acordeão**

Dois blocos: Saídas (`type === 'EXPENSE' && !parentId`), Entradas (`INCOME && !parentId`).

Cada pai: `<button aria-expanded={open} aria-controls={id}>` nome + badge tipo. Default `open = false`. Filhas em `<ul>` só se aberto. Inativas no fim com classe `inactive`.

Topo: **Nova categoria** — radio Grupo / Subcategoria; se sub, select de pais; nome; tipo só se grupo (INCOME/EXPENSE); submit `api.categories.create`.

Em cada pai: botão **Adicionar filha** (abre o form do topo com `parentId` já preenchido), **Editar** (input de nome no lugar do título, Enter/blur chama `update`), **Desativar** (`update isActive: false`).

Em cada filha: editar, desativar, excluir (`remove` — API já desativa se houver lançamentos).

Invalidar query `['categories']` após mutações.

- [ ] **Step 3: CSS**

Remover grid de cards. Lista full-width. Botão do pai min-height 44px, flex, chevron CSS (`aria-expanded` rotaciona). Sem hover-only actions.

- [ ] **Step 4: Verificar em 375px**

Expected: pais fechados; toque abre filhas; criar “Viagem extra” sob Viagem; inativa some do select de novo lançamento.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Categories.tsx frontend/src/pages/Categories.css frontend/src/api/client.ts
git commit -m "feat: replace category cards with collapsible CRUD list"
```

---

### Task 6: Planejamentos (moldes e meses)

**Files:**
- Create: `backend/src/routes/budgetTemplates.ts`
- Create: `backend/src/routes/budgets.ts`
- Modify: `backend/src/routes/index.ts`
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/pages/BudgetPlans.tsx`
- Create: `frontend/src/pages/BudgetPlans.css`
- Create: `frontend/src/pages/BudgetPlanDetail.tsx`
- Create: `frontend/src/pages/BudgetPlanDetail.css`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `monthSequence`, `budgetsToUpsert` (Task 1)
- Produces:
  - `GET/POST /budget-templates`
  - `GET/PATCH /budget-templates/:id` (PATCH linhas)
  - `POST /budget-templates/:id/apply` `{ startYear, startMonth, months, overwrite }`
  - `GET /budgets?year&month`
  - `PATCH /budgets/:id` `{ limitAmount }`
  - Rotas `/planejamentos`, `/planejamentos/:id`

- [ ] **Step 1: Rotas backend**

`budgetTemplates.ts`:
- GET `/` include `lines` + `category`, orderBy name.
- POST `{ name, lines: { categoryId, amount }[] }` — criar template + `createMany` lines (amount pode 0).
- GET `/:id` include lines e budgets distintos year/month.
- PATCH `/:id` `{ name?, lines?: { categoryId, amount }[] }` — se `lines`, apagar linhas e recriar.
- POST `/:id/apply` body `z.object({ startYear: z.number().int(), startMonth: z.number().int().min(1).max(12), months: z.number().int().min(1).max(36), overwrite: z.boolean() })`. Carregar lines; se nenhuma `Number(amount) > 0` → `AppError(400, 'Informe pelo menos um limite maior que zero')`. `monthsList = monthSequence(...)`. `existing = await prisma.budget.findMany({ where: { OR: monthsList.map(m => ({ year: m.year, month: m.month })) } })`. `budgetsToUpsert(...)`. Para cada upsert: `prisma.budget.upsert({ where: { categoryId_year_month: { categoryId, year, month } }, create: { ..., sourceTemplateId, limitAmount }, update: { limitAmount, sourceTemplateId } })`. Responder `{ created: upsert.length, skipped }`.

`budgets.ts`:
- GET `/?year&month` include category.
- PATCH `/:id` `{ limitAmount: z.number().positive() }`.

Montar em `index.ts`: `/budget-templates`, `/budgets`.

- [ ] **Step 2: Client**

Tipos `BudgetTemplate`, `BudgetTemplateLine`, `Budget`, `ApplyBudgetResult`. Métodos `budgetTemplates.list/create/get/update/apply` e `budgets.list(year, month)`, `budgets.update(id, { limitAmount })`.

- [ ] **Step 3: UI**

`BudgetPlans.tsx`: lista de moldes + **Novo planejamento**. Form: nome. Após criar, navegar para detalhe.

`BudgetPlanDetail.tsx`:
- Carregar template + categorias filhas EXPENSE.
- Tabela/lista: cada filha, input valor (vazio = 0). Salvar linhas via PATCH.
- Bloco replicar: mês inicial (default `getCurrentPeriod()`), quantidade (default 3), checkbox **Substituir existentes**, botão **Gerar meses**.
- Mostrar `created` / `skipped` do apply.
- Lista de meses gerados (derivar de `GET /budgets` para cada mês do intervalo, ou do include do GET template). Ao abrir um mês: inputs `limitAmount` + PATCH.

- [ ] **Step 4: Verificar**

Expected: molde “Rotina” com Mercado 900, gerar 3 meses; mudar só agosto; reaplicar sem substituir não sobrescreve agosto; com substituir, sobrescreve.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/budgetTemplates.ts backend/src/routes/budgets.ts backend/src/routes/index.ts frontend/src/api/client.ts frontend/src/pages/BudgetPlans.tsx frontend/src/pages/BudgetPlans.css frontend/src/pages/BudgetPlanDetail.tsx frontend/src/pages/BudgetPlanDetail.css frontend/src/App.tsx
git commit -m "feat: add replicable monthly budget plans"
```

---

### Task 7: Objetivos de longo prazo

**Files:**
- Create: `backend/src/routes/plans.ts`
- Modify: `backend/src/routes/index.ts`
- Modify: `backend/src/routes/dashboard.ts` (GOAL: `currentAmount` = saldo do cofrinho)
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/pages/Goals.tsx`
- Create: `frontend/src/pages/Goals.css`
- Create: `frontend/src/pages/GoalDetail.tsx`
- Create: `frontend/src/pages/GoalDetail.css`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `monthsRemaining`, `monthlyReserve`, `isGoalAchieved`, `accountBalance` (Task 1); contas Task 3
- Produces:
  - `GET /plans?type=GOAL`
  - `POST /plans` `{ name, accountId, targetAmount, startDate, endDate }` type fixo GOAL
  - `PATCH /plans/:id` nome/alvo/prazo/accountId; audit em targetAmount/endDate; se saldo ≥ alvo → `ACHIEVED`; se alvo sobe acima do saldo e status era ACHIEVED → `ACTIVE`
  - Um `ACTIVE` por `accountId`
  - Rotas `/objetivos`, `/objetivos/:id`
  - Aportar → `/lancamentos/novo?type=TRANSFER&toAccountId=`
  - Liberar → `/lancamentos/novo?type=TRANSFER&accountId=<cofrinho>&toAccountId=<padrão>`

- [ ] **Step 1: Helper de saldo no route**

Função local `async function balanceOf(accountId: string)` usando os quatro aggregates + `accountBalance`.

- [ ] **Step 2: `plans.ts`**

GET: `where: { type: GOAL }`, include account. Para cada: `current = await balanceOf(accountId)`, `months = endDate ? monthsRemaining(new Date(), endDate) : null`, `suggested = monthlyReserve(target, current, months)`, `status` efetivo se `isGoalAchieved` então tratar como atingido na resposta (e persistir `ACHIEVED` se ainda ACTIVE — update lazy no GET ou só no GET compute + PATCH dedicado). **Persistir no GET se ACTIVE e achieved:** `update status ACHIEVED` para a lista refletir.

POST: `type: GOAL`, `accountId` obrigatório, conta deve `isReserved`. Count ACTIVE no mesmo account → se > 0, `AppError(400, 'Este cofrinho já tem um objetivo ativo')`. `startDate` default hoje. `endDate` obrigatório.

PATCH: se muda `accountId`, validar reserved e sem outro ACTIVE. Se `targetAmount` ou `endDate` mudam, `PlanAudit.create`. Recalcular status com saldo.

Não criar transferência no PATCH. Liberar é só o link para o form.

- [ ] **Step 3: Dashboard plans**

Para `type === 'GOAL' && accountId`, `currentAmount = balanceOf(accountId)` em vez de `p.currentAmount`.

- [ ] **Step 4: UI**

`Goals.tsx`: lista nome, cofrinho, barra (`current/target`), prazo, `formatCurrency(suggested)` /mês, selo Atingido / Prazo vencido (`monthsRemaining === null && current < target`). Botão novo.

Form novo (na lista ou `/objetivos` com estado): nome; select cofrinhos (`isReserved`); opção **Criar cofrinho** (chama `accounts.create({ name, isReserved: true })` e usa o id); valor-alvo; `endDate` default hoje+12 meses (`input type=date`).

`GoalDetail.tsx`: números da spec; botões **Aportar**, e se ACHIEVED: **Manter no cofrinho** (só volta à lista), **Liberar**, **Aumentar a aposta** (campos nova meta + novo prazo, PATCH). Liberar desabilitado se `current === 0`. Editar nome/meta/prazo/cofrinho sempre.

- [ ] **Step 5: Verificar**

Expected: objetivo 12 mil / 9 meses / saldo 3 mil → sugerido R$ 1.000; aportar via transferência aumenta barra; atingir mostra três ações; aumentar aposta reativa; segundo GOAL no mesmo cofrinho ativo retorna 400.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/plans.ts backend/src/routes/index.ts backend/src/routes/dashboard.ts frontend/src/api/client.ts frontend/src/pages/Goals.tsx frontend/src/pages/Goals.css frontend/src/pages/GoalDetail.tsx frontend/src/pages/GoalDetail.css frontend/src/App.tsx
git commit -m "feat: add long-term goals linked to piggy banks"
```

---

### Task 8: Dashboard — ritmo com cores

**Files:**
- Modify: `backend/src/routes/dashboard.ts` (map `budgetProgress`)
- Modify: `frontend/src/api/client.ts` (`BudgetProgress`)
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/Dashboard.css`
- Modify: `frontend/src/utils/format.ts` (`PACE_STATUS_LABELS`)

**Interfaces:**
- Consumes: `paceStatus`, `expectedToDate`, `projectedMonth` (Task 1)
- Produces: cada item de `budgetProgress` com `expectedToDate`, `projected`, `paceRatio`, `paceStatus`

- [ ] **Step 1: Enriquecer budgetProgress**

No map atual (após `projected`), com `isCurrentMonth = today.getFullYear()===year && today.getMonth()===month-1` e `day = isCurrentMonth ? today.getDate() : daysInMonth`:

```ts
const expected = expectedToDate(limit, daysElapsed, daysInMonth);
const status = paceStatus({
  spent,
  limit,
  day: daysElapsed,
  daysInMonth,
  isCurrentMonth,
});
const paceRatio = expected > 0 ? spent / expected : 0;
```

Manter `alert` antigo (50/75/90) **e** adicionar `paceStatus`, `expectedToDate: expected`, `paceRatio`. `daysElapsed` no mês corrente já é `today.getDate()` no arquivo.

- [ ] **Step 2: Tipos e labels**

```ts
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

export const PACE_STATUS_LABELS: Record<string, string> = {
  on_track: 'No ritmo',
  warning: 'Atenção',
  over_pace: 'Acima do ritmo',
  over_limit: 'Estourou',
};
```

- [ ] **Step 3: UI**

No card de orçamento, classe `budget-item budget-item--on_track` etc. Cor da barra/`LiquidProgress` `variant`: success / warning / danger. Texto `{PACE_STATUS_LABELS[item.paceStatus]}` + “esperado até hoje {formatCurrency(expectedToDate)}” + se `over_pace` ou `over_limit`, “projeção {formatCurrency(projected)}”. Não usar só cor.

CSS:

```css
.budget-item--on_track { border-color: var(--success); }
.budget-item--warning { border-color: var(--warning); }
.budget-item--over_pace,
.budget-item--over_limit { border-color: var(--danger); }
```

- [ ] **Step 4: Verificar**

Expected: Mercado 900, dia 10, gasto 240 → verde “No ritmo”; 270 → amarelo; 500 → vermelho com projeção ~1500; lançar mais não é bloqueado.

Rodar de novo: `npm test -w backend`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/dashboard.ts frontend/src/api/client.ts frontend/src/pages/Dashboard.tsx frontend/src/pages/Dashboard.css frontend/src/utils/format.ts
git commit -m "feat: show proportional budget pace with green/yellow/red on dashboard"
```

---

## Verificação final (depois da Task 8)

1. `npm test -w backend` — PASS  
2. `npm run build` — PASS  
3. Spec §14: percorrer os 7 casos manualmente (abertura, ritmo dia 10, reserva 1000, atingido, apply skip, segunda padrão, transferência sem inflar renda)

---

## Self-review (cobertura da spec)

| Spec | Task |
|---|---|
| Nav 3 itens, some + Gasto | 0, 3, 4 |
| Auth dois logins + sessão persistida | 0 |
| Lançamentos botão + 3 tipos + datetime + defaults; sem responsável | 4 |
| Contas/cofrinhos, padrão, saldo inicial | 2, 3 |
| Categorias acordeão CRUD | 5 |
| Molde + meses independentes + não sobrescrever | 1, 6 |
| Ritmo 80/100 + cores + texto | 1, 8 |
| Objetivos, cofrinho, sugerido, manter/liberar/aposta | 1, 7 |
| Transferência ≠ renda | 3, 4, 8 |
| Testes de regra §14 | 1 (unit) + verificação final |
