# Editar e excluir cadastros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada conta, categoria, planejamento, objetivo e lançamento ganha um menu ⋯ com Editar e Excluir, reusando os formulários atuais.

**Architecture:** Regras “apaga vs desativa” em funções puras em `backend/src/lib/`. Rotas DELETE novas (conta, lançamento, objetivo, molde) e DELETE de categoria ampliado. UI: componente `ItemActions` (menu ⋯); cards-link não envolvem o botão (HTML válido). Edição de lançamento em `/lancamentos/novo?id=`.

**Tech Stack:** Node 20, Express, Prisma, Zod, React 19, TanStack Query, CSS por componente. Testes: `node:test` + `tsx` em `backend/src/lib/*.test.ts`.

## Global Constraints

- UI e erros em **português**; rotas em português; valores em **BRL**.
- Mobile-first, mínimo **375px**; toques ≥ **44px**; `cursor: pointer`; `:focus-visible`; ícone SVG, sem emoji.
- Tokens: `--primary`, `--success`, `--warning`, `--danger`, `--text`, `--surface`, `--border`, `--bg` (e tokens glass já usados).
- Confirmação via `window.confirm` (sem diálogo customizado).
- Lançamento: exclusão **hard delete**; tipo **não** muda na edição.
- Cadastro: apaga se não houver histórico; senão desativa.
- Tipos em `frontend/src/api/client.ts` sincronizados com o backend.
- Spec: `docs/superpowers/specs/2026-08-14-editar-excluir-cadastros-design.md`.
- Sem commit a menos que o usuário peça.

## File map

| Arquivo | Responsabilidade |
|---|---|
| `backend/src/lib/removalDecision.ts` | Regras puras conta / categoria / molde |
| `backend/src/lib/removalDecision.test.ts` | Testes das regras |
| `backend/src/routes/accounts.ts` | `DELETE /:id` + `hasHistory` na lista |
| `backend/src/routes/categories.ts` | DELETE ampliado + `hasHistory` |
| `backend/src/routes/budgetTemplates.ts` | `DELETE /:id` + `hasGeneratedMonths` |
| `backend/src/routes/plans.ts` | `DELETE /:id` GOAL |
| `backend/src/routes/transactions.ts` | `DELETE /:id`; PATCH recusa troca de tipo |
| `frontend/src/api/client.ts` | `remove` / `get` / `update` |
| `frontend/src/components/ItemActions.tsx` | Menu ⋯ |
| `frontend/src/pages/*` | Botões nas listas e detalhe; form de edição |

---

### Task 1: Funções de decisão (TDD)

**Files:**
- Create: `backend/src/lib/removalDecision.ts`
- Test: `backend/src/lib/removalDecision.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `accountRemovalDecision(input) → 'delete' | 'deactivate' | 'reject-default'`
  - `categoryRemovalDecision(input) → 'delete' | 'deactivate'`
  - `templateRemovalDecision(hasGeneratedMonths: boolean) → 'delete' | 'unlink-and-delete'`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accountRemovalDecision,
  categoryRemovalDecision,
  templateRemovalDecision,
} from './removalDecision.ts';

const accountBase = {
  hasTransactions: false,
  hasGoal: false,
  hasRecurrence: false,
  isDefault: false,
  hasOtherActiveCommonAccount: false,
};

describe('accountRemovalDecision', () => {
  it('apaga conta sem histórico', () => {
    assert.equal(accountRemovalDecision(accountBase), 'delete');
  });

  it('desativa conta com lançamento', () => {
    assert.equal(accountRemovalDecision({ ...accountBase, hasTransactions: true }), 'deactivate');
  });

  it('desativa conta com objetivo', () => {
    assert.equal(accountRemovalDecision({ ...accountBase, hasGoal: true }), 'deactivate');
  });

  it('desativa conta com recorrência', () => {
    assert.equal(accountRemovalDecision({ ...accountBase, hasRecurrence: true }), 'deactivate');
  });

  it('recusa desativar a única conta padrão', () => {
    assert.equal(
      accountRemovalDecision({
        ...accountBase,
        hasTransactions: true,
        isDefault: true,
        hasOtherActiveCommonAccount: false,
      }),
      'reject-default',
    );
  });

  it('desativa padrão se existir outra conta comum ativa', () => {
    assert.equal(
      accountRemovalDecision({
        ...accountBase,
        hasTransactions: true,
        isDefault: true,
        hasOtherActiveCommonAccount: true,
      }),
      'deactivate',
    );
  });

  it('apaga padrão sem histórico mesmo sendo a única', () => {
    assert.equal(
      accountRemovalDecision({
        ...accountBase,
        isDefault: true,
        hasOtherActiveCommonAccount: false,
      }),
      'delete',
    );
  });
});

describe('categoryRemovalDecision', () => {
  const clean = {
    hasTransactions: false,
    hasChildren: false,
    hasBudgetLines: false,
    hasBudgets: false,
    hasPlans: false,
  };

  it('apaga categoria sem dependências', () => {
    assert.equal(categoryRemovalDecision(clean), 'delete');
  });

  it('desativa se tiver lançamentos', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasTransactions: true }), 'deactivate');
  });

  it('desativa grupo com filhas', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasChildren: true }), 'deactivate');
  });

  it('desativa se tiver linha de molde', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasBudgetLines: true }), 'deactivate');
  });

  it('desativa se tiver orçamento do mês', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasBudgets: true }), 'deactivate');
  });

  it('desativa se tiver objetivo', () => {
    assert.equal(categoryRemovalDecision({ ...clean, hasPlans: true }), 'deactivate');
  });
});

describe('templateRemovalDecision', () => {
  it('apaga molde sem meses gerados', () => {
    assert.equal(templateRemovalDecision(false), 'delete');
  });

  it('desvincula e apaga molde com meses gerados', () => {
    assert.equal(templateRemovalDecision(true), 'unlink-and-delete');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w backend -- src/lib/removalDecision.test.ts`

Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implement**

```ts
export type AccountRemovalDecision = 'delete' | 'deactivate' | 'reject-default';
export type CategoryRemovalDecision = 'delete' | 'deactivate';
export type TemplateRemovalDecision = 'delete' | 'unlink-and-delete';

export function accountRemovalDecision(input: {
  hasTransactions: boolean;
  hasGoal: boolean;
  hasRecurrence: boolean;
  isDefault: boolean;
  hasOtherActiveCommonAccount: boolean;
}): AccountRemovalDecision {
  const hasHistory = input.hasTransactions || input.hasGoal || input.hasRecurrence;
  if (!hasHistory) return 'delete';
  if (input.isDefault && !input.hasOtherActiveCommonAccount) return 'reject-default';
  return 'deactivate';
}

export function categoryRemovalDecision(input: {
  hasTransactions: boolean;
  hasChildren: boolean;
  hasBudgetLines: boolean;
  hasBudgets: boolean;
  hasPlans: boolean;
}): CategoryRemovalDecision {
  if (
    input.hasTransactions
    || input.hasChildren
    || input.hasBudgetLines
    || input.hasBudgets
    || input.hasPlans
  ) {
    return 'deactivate';
  }
  return 'delete';
}

export function templateRemovalDecision(hasGeneratedMonths: boolean): TemplateRemovalDecision {
  return hasGeneratedMonths ? 'unlink-and-delete' : 'delete';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w backend`

Expected: PASS, inclusive os testes já existentes.

---

### Task 2: Rotas DELETE / PATCH tipo travado / flags na lista

**Files:**
- Modify: `backend/src/routes/accounts.ts`
- Modify: `backend/src/routes/categories.ts`
- Modify: `backend/src/routes/budgetTemplates.ts`
- Modify: `backend/src/routes/plans.ts`
- Modify: `backend/src/routes/transactions.ts`

**Interfaces:**
- Consumes: funções da Task 1
- Produces: DELETE 204 ou 200 `{ ...record, deactivated: true }`; GET lista com `hasHistory` (conta/categoria) e `hasGeneratedMonths` (molde)

- [ ] **Step 1: Contas — lista com `hasHistory` e DELETE**

No `GET /`, para cada conta calcular:

```ts
const [fromCount, toCount, goalCount, recurrenceCount] = await Promise.all([
  tx.transaction.count({ where: { accountId: account.id } }),
  tx.transaction.count({ where: { toAccountId: account.id } }),
  tx.plan.count({ where: { accountId: account.id } }),
  tx.recurrence.count({ where: { accountId: account.id } }),
]);
hasHistory: fromCount + toCount + goalCount + recurrenceCount > 0
```

(Pode agregar no `findMany` com `_count`.)

`DELETE /:id`:

```ts
router.delete('/:id', async (req, res, next) => {
  try {
    const current = await findAccountOrThrow(req.params.id);
    const [fromCount, toCount, goalCount, recurrenceCount, otherDefault] = await Promise.all([
      prisma.transaction.count({ where: { accountId: current.id } }),
      prisma.transaction.count({ where: { toAccountId: current.id } }),
      prisma.plan.count({ where: { accountId: current.id } }),
      prisma.recurrence.count({ where: { accountId: current.id } }),
      prisma.account.findFirst({
        where: { id: { not: current.id }, isReserved: false, isActive: true },
      }),
    ]);
    const decision = accountRemovalDecision({
      hasTransactions: fromCount + toCount > 0,
      hasGoal: goalCount > 0,
      hasRecurrence: recurrenceCount > 0,
      isDefault: current.isDefault,
      hasOtherActiveCommonAccount: Boolean(otherDefault),
    });
    if (decision === 'reject-default') {
      throw new AppError(400, 'Cadastre outra conta antes de desativar a padrão');
    }
    if (decision === 'delete') {
      await prisma.account.delete({ where: { id: current.id } });
      return res.status(204).send();
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (current.isDefault) {
        const replacement = await tx.account.findFirst({
          where: { id: { not: current.id }, isReserved: false, isActive: true },
          orderBy: { sortOrder: 'asc' },
        });
        if (!replacement) {
          throw new AppError(400, 'Cadastre outra conta antes de desativar a padrão');
        }
        await tx.account.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
      return tx.account.update({
        where: { id: current.id },
        data: { isActive: false, ...(current.isDefault ? { isDefault: false } : {}) },
      });
    });
    res.json({ ...updated, deactivated: true });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: Categorias — DELETE usa `categoryRemovalDecision`**

No GET, incluir `_count` de `transactions`, `children`, `budgets`, `budgetTemplateLines`, `plans`. Expor `hasHistory` booleano.

DELETE:

```ts
const [transactions, children, budgetLines, budgets, plans] = await Promise.all([
  prisma.transaction.count({ where: { categoryId: req.params.id } }),
  prisma.category.count({ where: { parentId: req.params.id } }),
  prisma.budgetTemplateLine.count({ where: { categoryId: req.params.id } }),
  prisma.budget.count({ where: { categoryId: req.params.id } }),
  prisma.plan.count({ where: { categoryId: req.params.id } }),
]);
const decision = categoryRemovalDecision({
  hasTransactions: transactions > 0,
  hasChildren: children > 0,
  hasBudgetLines: budgetLines > 0,
  hasBudgets: budgets > 0,
  hasPlans: plans > 0,
});
if (decision === 'deactivate') {
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  return res.json({ ...category, deactivated: true });
}
await prisma.category.delete({ where: { id: req.params.id } });
res.status(204).send();
```

- [ ] **Step 3: Planejamentos — DELETE**

Lista: `_count: { budgets: true }` → `hasGeneratedMonths: count > 0`.

```ts
router.delete('/:id', async (req, res, next) => {
  try {
    const template = await prisma.budgetTemplate.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { budgets: true } } },
    });
    if (!template) throw new AppError(404, 'Planejamento não encontrado');
    const decision = templateRemovalDecision(template._count.budgets > 0);
    await prisma.$transaction(async (tx) => {
      if (decision === 'unlink-and-delete') {
        await tx.budget.updateMany({
          where: { sourceTemplateId: template.id },
          data: { sourceTemplateId: null },
        });
      }
      await tx.budgetTemplate.delete({ where: { id: template.id } });
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 4: Objetivos — DELETE GOAL**

```ts
router.delete('/:id', async (req, res, next) => {
  try {
    const current = await prisma.plan.findFirst({
      where: { id: req.params.id, type: PlanType.GOAL },
    });
    if (!current) throw new AppError(404, 'Objetivo não encontrado');
    await prisma.$transaction(async (tx) => {
      await tx.transaction.updateMany({
        where: { planId: current.id },
        data: { planId: null },
      });
      await tx.plan.delete({ where: { id: current.id } });
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 5: Lançamentos — recusar troca de tipo + DELETE**

No `PATCH`, depois de achar `existing`:

```ts
if (data.type !== undefined && data.type !== existing.type) {
  throw new AppError(400, 'Tipo do lançamento não pode ser alterado');
}
```

(`data` parseado **antes** desta checagem.)

```ts
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Lançamento não encontrado');
    await prisma.transaction.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
```

`GET /:id` já existe — não recriar.

- [ ] **Step 6: `npx tsc --noEmit` no backend**

Expected: sem erro.

---

### Task 3: Cliente HTTP

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Métodos e tipos**

```ts
accounts: {
  // existentes...
  remove: (id: string) => request<Account | void>(`/accounts/${id}`, { method: 'DELETE' }),
},
transactions: {
  // existentes...
  get: (id: string) => request<Transaction>(`/transactions/${id}`),
  update: (id: string, data: Partial<CreateTransaction>) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
},
budgetTemplates: {
  // existentes...
  remove: (id: string) => request<void>(`/budget-templates/${id}`, { method: 'DELETE' }),
},
plans: {
  // existentes...
  removeGoal: (id: string) => request<void>(`/plans/${id}`, { method: 'DELETE' }),
},
```

Em `Account` e `Category` acrescentar `hasHistory?: boolean`. Em `BudgetTemplate` acrescentar `hasGeneratedMonths?: boolean`.

---

### Task 4: `ItemActions` + CSS

**Files:**
- Create: `frontend/src/components/ItemActions.tsx`
- Create: `frontend/src/components/ItemActions.css`

Seguir `.cursor/skills/ui-ux-pro-max/SKILL.md`: busca `overflow menu icon button` `--domain ux` e `--stack react`.

- [ ] **Step 1: Componente**

```tsx
export interface ItemAction {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function ItemActions({ name, actions }: { name: string; actions: ItemAction[] }) {
  // botão 44×44, aria-label={`Ações de ${name}`}, aria-haspopup="menu", aria-expanded
  // SVG três pontos (círculos), aria-hidden
  // menu role="menu" position absolute; fecha clique fora + Escape
  // stopPropagation no botão, menu e mousedown (cards-link vizinhos)
  // se o menu não couber abaixo, classe --up
}
```

CSS: `min-width/min-height: 44px`; fundo `var(--surface)`; borda `var(--border)`; item perigo `var(--danger)`; `:focus-visible`; `@media (prefers-reduced-motion: reduce)` sem transição.

O ⋯ **não** fica dentro de `<Link>`/`<a>`. O card vira `article` + link irmão (Task 5).

---

### Task 5: Telas

**Files:**
- Modify: `frontend/src/pages/Accounts.tsx` + `.css`
- Modify: `frontend/src/pages/Categories.tsx`
- Modify: `frontend/src/pages/BudgetPlans.tsx` + `.css`
- Modify: `frontend/src/pages/BudgetPlanDetail.tsx`
- Modify: `frontend/src/pages/Goals.tsx` + `.css`
- Modify: `frontend/src/pages/GoalDetail.tsx`
- Modify: `frontend/src/pages/Transactions.tsx` + `.css`
- Modify: `frontend/src/pages/NewTransaction.tsx`

Helper de confirmação (no próprio arquivo ou `frontend/src/utils/confirmRemoval.ts`):

```ts
export function confirmRemoval(name: string, hasHistory: boolean): boolean {
  return hasHistory
    ? window.confirm(`“${name}” tem histórico e será desativado, não apagado. Continuar?`)
    : window.confirm(`Apagar “${name}”? Esta ação não pode ser desfeita.`);
}

export function confirmTransactionRemoval(description: string): boolean {
  return window.confirm(
    `Apagar o lançamento “${description}”? O valor sai do saldo e do histórico.`,
  );
}
```

- [ ] **Step 1: Contas**

- Ordenar inativas no fim; selo **Inativa**.
- Form: se `editingId`, título “Editar conta”, sem saldo inicial; `PATCH`; checkbox cofrinho `disabled` se `isDefault`.
- ⋯: Editar; Definir como padrão (comum ativa não-padrão); Reativar (inativa); Excluir.
- Remover o botão “Definir como padrão” do rodapé do card.

- [ ] **Step 2: Categorias**

Trocar a fileira de botões por ⋯: Editar; Adicionar filha (grupo ativo); Reativar (inativa); Excluir. Confirmar com `hasHistory` (ou `!isActive` não entra em excluir hard se a API desativar).

- [ ] **Step 3: Planejamentos**

Lista: `article.glass-module` com `ItemActions` absoluto e `Link` irmão. Editar → `/planejamentos/:id`. Excluir com `hasGeneratedMonths` no texto de histórico. Detalhe: ⋯ no header só com Excluir; `navigate('/planejamentos')` após sucesso.

- [ ] **Step 4: Objetivos**

Mesmo padrão de card. Editar → `/objetivos/:id`. Excluir sempre hard (`hasHistory: false` no confirm de apagar). Detalhe: ⋯ Excluir no header; `navigate('/objetivos')`.

- [ ] **Step 5: Lançamentos**

⋯ na linha (fora de qualquer link): Editar (omitir se `isCancelled`) → `/lancamentos/novo?id=`; Excluir com `confirmTransactionRemoval`. Invalidar `transactions` e `dashboard`.

- [ ] **Step 6: NewTransaction modo edição**

Se `searchParams.get('id')`: `useQuery(['transaction', id], () => api.transactions.get(id))`; preencher campos; título **Editar lançamento**; botões de tipo `disabled`; submit `api.transactions.update`. Converter `date` ISO → `YYYY-MM-DDTHH:mm` local; `amount` string → input.

```ts
function toDatetimeLocal(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
```

- [ ] **Step 7: Verificar**

Run: `npm test -w backend` e `npm run build -w frontend` (ou `tsc -b` no frontend).

Expected: testes backend verdes; frontend typechecks.

---

## Spec coverage

| Spec | Task |
|---|---|
| Menu ⋯, 44px, SVG, stopPropagation, confirm | 4–5 |
| Conta editar/excluir/reativar/padrão | 2, 5.1 |
| Categoria ⋯ | 2, 5.2 |
| Molde unlink-and-delete | 2, 5.3 |
| Objetivo delete sem cofrinho | 2, 5.4 |
| Lançamento edit + hard delete + tipo travado | 2, 5.5–5.6 |
| GET /transactions/:id | já existe; cliente Task 3 |
| Testes das três funções | 1 |
