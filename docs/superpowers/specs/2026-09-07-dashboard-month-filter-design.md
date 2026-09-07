# Dashboard — filtro por mês

## Problema

O Dashboard sempre mostra o mês corrente (`getCurrentPeriod()`). Não há como analisar o mês anterior ou um mês qualquer com lançamentos.

## Solução

Controle de período no header do Dashboard:

1. **Pill “Mês atual”** — seleciona o mês calendário corrente (timezone `America/Sao_Paulo`).
2. **Pill “Mês anterior”** — seleciona o mês calendário imediatamente anterior.
3. **Ícone de funil** — abre `<input type="month">` nativo, com `min`/`max` cobrindo o intervalo do primeiro ao último mês que tem lançamentos (não cancelados).

Estado sincronizado na URL: `?ano=YYYY&mes=M`.

## Comportamento

| Ação | Resultado |
|------|-----------|
| Abrir `/` sem params | Mês atual |
| Clicar “Mês atual” | `ano`/`mes` = período atual; pill ativa |
| Clicar “Mês anterior” | Período − 1 mês; pill ativa |
| Escolher no `type="month"` | Atualiza URL e query; se o valor for atual ou anterior, a pill correspondente fica ativa; senão nenhuma pill de atalho fica ativa e o funil fica em estado “filtro ativo” |
| Mês sem lançamentos no meio do intervalo | Dashboard carrega com zeros/vazio (limitação do input nativo: só `min`/`max`, sem desabilitar buracos) |

O subtítulo fixo “{Mês} de {ano}” passa a refletir o período selecionado (continua útil para contexto).

## API

- `GET /dashboard/monthly?year=&month=` — **já existe**; sem mudança de contrato.
- Novo `GET /dashboard/periods` → `{ earliest: { year, month } \| null, latest: { year, month } \| null }` derivado de `Transaction` com `isCancelled: false`. Se não houver lançamentos, `earliest`/`latest` são `null` e o funil usa só o mês atual como `min`=`max`.

## UI / a11y

- Pills: `role="group"` + `aria-label="Período do dashboard"`; cada pill `aria-pressed`.
- Funil: botão 44×44px, `aria-label="Escolher mês"`; input de mês acessível (visually associated / label).
- Estilo: pills no padrão de segment (`--primary` / `--primary-light` quando ativas); funil alinhado ao toggle de filtros de Lançamentos.
- Mobile-first (≥375px): pills + ícone em uma linha com wrap se necessário; alvos ≥44px.

## Fora de escopo

- Histórico de saldo/metas por mês (metas e contas continuam ponto-no-tempo atual).
- Lista customizada de meses (popover); ficou o input nativo.
- Alterar Lançamentos ou Orçamento.

## Arquivos principais

- `backend/src/routes/dashboard.ts` (+ lib/teste de agregação de períodos se extrair)
- `frontend/src/api/client.ts`
- `frontend/src/pages/Dashboard.tsx` + `Dashboard.css`
- Helpers de período: reutilizar/extrair `periodKey` / parse se fizer sentido (`format.ts` ou `period.ts`)
