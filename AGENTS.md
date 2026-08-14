# iMoney — Guia para Agentes

Sistema de controle financeiro do casal. Registra entradas/saídas, orçamentos, metas e saldo livre.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + Vite + TypeScript + React Router + TanStack Query |
| Backend | Node.js + Express + TypeScript + Zod |
| Banco | PostgreSQL (Supabase) via Prisma ORM |
| Deploy | Vercel (frontend estático + API serverless em `api/`) |

## Estrutura

```
iMoney/
├── api/                 # Entry point serverless (Vercel)
├── backend/
│   ├── prisma/          # Schema, migrations e seed
│   └── src/routes/      # Endpoints REST
├── frontend/src/
│   ├── api/client.ts    # Cliente HTTP + tipos
│   ├── pages/           # Dashboard, Lançamentos, Categorias
│   └── components/
└── .cursor/
    ├── rules/           # Regras do projeto
    └── skills/          # Skills (UI/UX Pro Max, etc.)
```

## Comandos

```bash
npm install          # instalar dependências (monorepo)
npm run dev          # frontend :5173 + backend :3001
npm run db:push      # sincronizar schema no Supabase
npm run db:seed      # dados iniciais
npm run build        # build produção
```

## Domínio de negócio

Consulte `especificacao_sistema_financeiro.md` para regras de negócio completas.

Conceitos centrais:
- **Saldo livre** ≠ saldo total (reservas e objetivos são separados)
- **Planejado** ≠ **realizado** (orçamento alerta, não bloqueia)
- Lançamentos: `INCOME`, `EXPENSE`, `TRANSFER`
- Responsável: `USER`, `PARTNER`, `COUPLE`
- UI em português (rotas: `/lancamentos`, `/categorias`)

## UI/UX

Toda tela ou componente de frontend **deve** seguir `.cursor/rules/frontend-ui-ux.mdc`: usar a skill `.cursor/skills/ui-ux-pro-max/` e ser responsivo (mobile-first, mínimo 375px). Produto: Personal Finance Tracker. Stack: React + CSS custom properties (sem Tailwind).

## Princípios de código

- Escopo mínimo: altere só o necessário
- Siga convenções existentes (ESM, TypeScript strict)
- Valide inputs no backend com Zod
- Nunca commite `.env` ou secrets
- Não instale dependências ou ferramentas de sistema sem pedir ao usuário
