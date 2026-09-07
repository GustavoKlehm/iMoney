# Dashboard Month Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir filtrar o Dashboard por mês atual, mês anterior ou qualquer mês no intervalo com lançamentos (input nativo).

**Architecture:** Backend expõe `GET /dashboard/periods` (earliest/latest). Frontend mantém período em `?ano=&mes=`, pills de atalho + funil com `input type="month"` (min/max). `GET /dashboard/monthly` já recebe year/month.

**Tech Stack:** Express + Zod + Prisma; React 19 + TanStack Query + React Router; CSS variables existentes (sem Tailwind).

## Global Constraints

- UI em português; rotas/labels existentes preservados
- Timezone app: `America/Sao_Paulo` (`getCurrentPeriod` / `getAppPeriod`)
- Mobile-first, alvos ≥44px, SVG (não emoji) para o funil
- Escopo mínimo: só Dashboard + endpoint de períodos
- Testes backend em `node:test` + tsx; extrair lógica pura quando possível

---

## File map

| File | Responsibility |
|------|----------------|
| `backend/src/lib/dashboardPeriods.ts` | Agregar min/max year-month a partir de datas |
| `backend/src/lib/dashboardPeriods.test.ts` | Testes do agregador |
| `backend/src/routes/dashboard.ts` | `GET /periods` |
| `frontend/src/api/client.ts` | `api.dashboardPeriods()` + tipo |
| `frontend/src/utils/period.ts` | Helpers `periodKey`, `parsePeriod`, `previousPeriod`, `isSamePeriod` |
| `frontend/src/pages/Dashboard.tsx` | UI pills + funil + URL sync |
| `frontend/src/pages/Dashboard.css` | Estilos do seletor |

---

### Task 1: Backend — períodos com lançamentos

**Files:**
- Create: `backend/src/lib/dashboardPeriods.ts`
- Create: `backend/src/lib/dashboardPeriods.test.ts`
- Modify: `backend/src/routes/dashboard.ts`

- [ ] **Step 1: Teste falhando**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTransactionPeriods } from './dashboardPeriods.ts';

describe('summarizeTransactionPeriods', () => {
  it('retorna nulls sem datas', () => {
    assert.deepEqual(summarizeTransactionPeriods([]), { earliest: null, latest: null });
  });

  it('calcula earliest e latest por ano-mês', () => {
    assert.deepEqual(
      summarizeTransactionPeriods([
        new Date('2026-01-15T12:00:00-03:00'),
        new Date('2026-03-01T00:00:00-03:00'),
        new Date('2025-12-31T23:00:00-03:00'),
      ]),
      {
        earliest: { year: 2025, month: 12 },
        latest: { year: 2026, month: 3 },
      },
    );
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `cd backend && node --import tsx --test src/lib/dashboardPeriods.test.ts`

- [ ] **Step 3: Implementar `summarizeTransactionPeriods`** usando partes de data no fuso app (`appDateParts` / equivalente já usado no backend).

- [ ] **Step 4: Endpoint `GET /dashboard/periods`**

Query distinct min/max via Prisma (`findFirst` orderBy date asc/desc, `isCancelled: false`) → passar datas para o helper → `res.json({ earliest, latest })`.

- [ ] **Step 5: Testes verdes + commit**

```bash
cd backend && npm test
git add backend/src/lib/dashboardPeriods.ts backend/src/lib/dashboardPeriods.test.ts backend/src/routes/dashboard.ts
git commit -m "feat: endpoint de períodos do Dashboard com lançamentos"
```

---

### Task 2: Cliente API + helpers de período

**Files:**
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/utils/period.ts` (e teste só se o repo já testa utils no frontend; senão helpers simples sem teste front)

- [ ] **Step 1:** Tipar e expor:

```ts
dashboardPeriods: () => request<{
  earliest: { year: number; month: number } | null;
  latest: { year: number; month: number } | null;
}>('/dashboard/periods'),
```

- [ ] **Step 2:** Helpers: `periodKey`, `parsePeriod`, `previousPeriod(period)`, `isSamePeriod(a,b)`, `clampPeriodToRange(period, earliest, latest)` se útil.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: cliente e helpers de período do Dashboard"
```

---

### Task 3: UI Dashboard — pills + funil

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/Dashboard.css`
- Consultar: skill ui-ux-pro-max (busca pontual filter/chips)

- [ ] **Step 1:** Ler período de `useSearchParams` (`ano`, `mes`); default `getCurrentPeriod()`; invalid → fallback atual.
- [ ] **Step 2:** `useQuery` dashboard com year/month do URL; `useQuery` periods.
- [ ] **Step 3:** Renderizar group de pills + botão funil; input `type="month"` (pode ser escondido e aberto via ref/`showPicker()` quando suportado, ou visível compacto ao lado).
- [ ] **Step 4:** CSS mobile-first; funil `.has-filters` quando período ≠ atual e ≠ anterior.
- [ ] **Step 5:** Commit

```bash
git commit -m "feat: filtro de mês no Dashboard (pills + funil)"
```

---

### Task 4: Verificação

- [ ] `npm test -w backend`
- [ ] `npm run build -w frontend` (ou tsc/vite build)
- [ ] Checagem mental 375px: pills + funil sem overflow horizontal
- [ ] Push + PR
