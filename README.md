# iMoney — Controle Financeiro do Casal

Sistema pessoal para registrar entradas/saídas, acompanhar orçamentos, metas e saldo livre — baseado na [especificação de negócio](./especificacao_sistema_financeiro.md).

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + Vite + TypeScript + React Router + TanStack Query |
| Backend | Node.js + Express + TypeScript |
| Banco | PostgreSQL (Supabase) via Prisma ORM |
| Deploy | Vercel (frontend estático + API serverless) |

## Estrutura do projeto

```
iMoney/
├── api/                 # Entry point serverless (Vercel)
├── backend/
│   ├── prisma/          # Schema, migrations e seed
│   └── src/
│       ├── routes/      # Endpoints REST
│       └── app.ts       # Express app
├── frontend/
│   └── src/
│       ├── api/         # Cliente HTTP
│       ├── pages/       # Dashboard, Lançamentos, Categorias
│       └── components/
└── vercel.json
```

## Setup local

### 1. Clonar e instalar

```bash
npm install
```

### 2. Configurar Supabase

No painel do Supabase: **Project Settings → Database → Connection string**

Copie e cole em `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Preencha:
- `DATABASE_URL` — connection string com **pooling** (porta **6543**, `?pgbouncer=true`)
- `DIRECT_URL` — connection string **direct** (porta **5432**) — usada pelo Prisma Migrate

### 3. Criar tabelas e dados iniciais

```bash
npm run db:push      # cria tabelas no Supabase
npm run db:seed      # categorias, contas, orçamentos e metas iniciais
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api/health

## Deploy na Vercel

1. Conecte o repositório na Vercel
2. Configure as variáveis de ambiente:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `FRONTEND_URL` (URL do app na Vercel, ex: `https://imoney.vercel.app`)
3. O build roda `prisma generate` + build do frontend automaticamente
4. Rotas `/api/*` vão para a função serverless em `api/index.ts`

## API (primeira versão)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check + conexão DB |
| GET/POST/PATCH/DELETE | `/api/categories` | CRUD de categorias |
| GET/POST/PATCH | `/api/accounts` | Contas e saldos |
| GET/POST/PATCH | `/api/transactions` | Lançamentos |
| POST | `/api/transactions/:id/cancel` | Cancelar lançamento |
| GET | `/api/dashboard/monthly?year=&month=` | Dashboard do mês |

## Próximos passos sugeridos

- [ ] Autenticação (Supabase Auth — só vocês dois)
- [ ] Tela de entradas e transferências
- [ ] CRUD de orçamentos mensais
- [ ] Recorrências e compromissos futuros
- [ ] Importar dados reais de agosto/2026
- [ ] PWA para registrar gasto rápido no celular

## Scripts úteis

```bash
npm run dev              # frontend + backend
npm run db:studio        # Prisma Studio (visualizar dados)
npm run build            # build produção
```
