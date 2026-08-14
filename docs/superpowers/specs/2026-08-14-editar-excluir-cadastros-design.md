# iMoney — Editar e excluir cadastros e lançamentos

**Data:** 2026-08-14  
**Status:** aprovado em conversa; aguardando revisão do arquivo  
**Produto:** controle financeiro do casal (iMoney)

## 1. Problema

Dá para criar contas, categorias, planejamentos, objetivos e lançamentos, mas a interface quase não oferece **Editar** nem **Excluir**. O casal precisa corrigir um nome, apagar um cadastro feito por engano ou remover um lançamento errado sem sair do app.

Hoje:

| Tela | Criar | Editar na UI | Excluir na UI |
|---|---|---|---|
| Contas | sim | não | não (só “Definir como padrão”) |
| Categorias | sim | sim (nome) | desativar; excluir só subcategoria |
| Planejamentos | sim | no detalhe (limites) | não |
| Objetivos | sim | no detalhe | não |
| Lançamentos | sim | não | não |

A API já tem `PATCH` de conta, categoria, lançamento, molde e objetivo. Faltam `DELETE` (conta, lançamento, objetivo, planejamento) e os botões.

## 2. Princípios

- Um único botão **⋯** por item. Não espalhar Editar/Excluir/Padrão na cara do card.
- **Apagar de verdade** se não houver histórico; **desativar** (cadastro) se houver. Lançamento é exceção: **sempre apaga de verdade**, com confirmação.
- Reaproveitar formulários existentes. Sem páginas novas de edição, salvo reusar `/lancamentos/novo` com `?id=`.
- Confirmação nativa (`window.confirm`), já usada em Categorias.
- Mobile-first: toque do ⋯ ≥ 44×44px; o menu não navega quando o card é um `Link`.
- Ícone SVG (três pontos), não emoji. Sem pacote novo de ícones.
- Interface em português.

## 3. Fora de escopo

- Diálogo visual customizado no lugar do `confirm` nativo
- Trocar o tipo do lançamento na edição (entrada ↔ saída ↔ transferência)
- Botão **Cancelar** lançamento (riscado). O ⋯ só tem Editar e Excluir. O endpoint `POST /transactions/:id/cancel` permanece, sem UI nova.
- Campo `isActive` em planejamento (molde some da lista; meses gerados ficam)
- Excluir o cofrinho junto com o objetivo
- Reordenação, ícones/cores de categoria, recorrências, fechamento de mês
- Páginas `/contas/:id/editar` ou `/lancamentos/:id/editar`

## 4. Menu ⋯ (`ItemActions`)

Componente compartilhado em `frontend/src/components/ItemActions.tsx` (+ CSS ao lado).

| Peça | Comportamento |
|---|---|
| Gatilho | botão 44×44px, `aria-label="Ações de {nome}"`, `aria-haspopup="menu"`, `aria-expanded` |
| Menu | `role="menu"` colado no botão; fecha com clique fora, Escape ou ao escolher um item |
| Itens | `role="menuitem"`; Excluir com ênfase de perigo (`--danger`); desabilitados quando a ação não cabe |
| Card-link | `stopPropagation` no gatilho e no menu para não abrir objetivo/planejamento |
| Posição | abaixo do botão; se não couber na viewport, abre acima |

Itens por tela:

| Tela | Menu |
|---|---|
| Conta ativa comum (não padrão) | Editar · Definir como padrão · Excluir |
| Conta padrão | Editar · Excluir |
| Cofrinho ativo | Editar · Excluir |
| Conta/cofrinho inativo | Reativar · Excluir |
| Grupo de categoria | Editar · Adicionar filha (se ativo) · Excluir ou Reativar |
| Subcategoria | Editar · Excluir ou Reativar |
| Planejamento | Editar (abre `/planejamentos/:id`) · Excluir |
| Objetivo (lista) | Editar (abre `/objetivos/:id`) · Excluir |
| Objetivo (detalhe) | o botão **Editar objetivo** permanece; o ⋯ extra no header traz Excluir |
| Lançamento | Editar · Excluir |

“Definir como padrão” sai do rodapé do card e entra no ⋯. Categorias deixam de mostrar a fileira de botões; as mesmas ações vão para o ⋯.

## 5. Confirmação de exclusão

`window.confirm` **antes** da chamada. Texto:

- Sem histórico (vai apagar): `Apagar “{nome}”? Esta ação não pode ser desfeita.`
- Com histórico (vai desativar): `“{nome}” tem histórico e será desativado, não apagado. Continuar?`
- Lançamento (sempre apaga): `Apagar o lançamento “{descrição}”? O valor sai do saldo e do histórico.`

Se o usuário cancelar o diálogo, nada acontece.

## 6. Comportamento por entidade

### 6.1 Contas e cofrinhos

**Editar:** o form **Nova conta ou cofrinho** vira edição: título “Editar conta”, campos Nome e “É cofrinho”, sem saldo inicial (saldo inicial é lançamento, não se reedita aqui). Salvar chama `PATCH /accounts/:id`. Conta padrão não pode virar cofrinho — a API já recusa (400); o checkbox fica desabilitado nesse caso.

**Excluir** (`DELETE /accounts/:id`):

| Situação | Resultado |
|---|---|
| Nenhum lançamento (origem ou destino), nenhum objetivo, nenhuma recorrência | `204`, registro some |
| Tem lançamento (incluindo saldo inicial), objetivo ou recorrência | `isActive: false`; responde o registro + `deactivated: true` |
| Conta padrão e não existe outra conta comum ativa | `400` “Cadastre outra conta antes de desativar a padrão” (mesma regra do `PATCH`) |

Lista continua mostrando inativas, com selo **Inativa**, no fim. Selects de lançamento já filtram `isActive`.

**Reativar:** `PATCH` com `{ isActive: true }`.

### 6.2 Categorias

**Editar:** como hoje — o nome vira input no próprio item.

**Adicionar filha:** como hoje — foca o form “Nova categoria” em modo subcategoria.

**Excluir** (`DELETE /categories/:id`, já existe; ajustar a regra):

Apaga (`204`) só se **não** houver: lançamentos, filhas, linhas de molde, orçamentos do mês, objetivos. Qualquer um desses → desativa (`isActive: false`, `deactivated: true`). Grupo com filhas nunca é apagado (FK e histórico).

**Reativar:** `PATCH` `{ isActive: true }`. Filhas inativas não reativam sozinhas.

### 6.3 Planejamentos

**Editar:** navega para o detalhe já existente (`/planejamentos/:id`).

**Excluir** (`DELETE /budget-templates/:id`):

| Situação | Resultado |
|---|---|
| Nenhum `Budget` com `sourceTemplateId` deste molde | apaga molde e linhas (`onDelete: Cascade` nas linhas) |
| Já gerou meses | `sourceTemplateId` dos `Budget` vira `null`; molde e linhas são apagados; limites mensais **permanecem**. O molde não volta à lista. |

Sem coluna nova. Sem estado “inativo” de molde.

### 6.4 Objetivos

**Editar:** navega para `/objetivos/:id` (editor que já existe). Na lista, “Editar” no ⋯ faz o mesmo.

**Excluir** (`DELETE /plans/:id`): apaga o `Plan` (auditoria em cascade). `planId` em lançamentos vira `null`. **Não** apaga nem desativa o cofrinho. Dinheiro reservado permanece no cofrinho.

### 6.5 Lançamentos

**Editar:** `/lancamentos/novo?id={id}`. A página `NewTransaction` detecta `id`, busca `GET /transactions/:id`, preenche o form, título **Editar lançamento**, submit com `PATCH /transactions/:id`.

- Tipo (Entrada / Saída / Transferência) **travado**: os botões de tipo ficam `disabled`.
- Lançamento cancelado: a API já recusa `PATCH` (400); a UI nem oferece Editar no ⋯.
- Saldo inicial: pode editar valor/descrição/data e pode excluir; não oferece trocar tipo.

**Excluir:** `DELETE /transactions/:id` — apaga o registro e os `TransactionAudit` (cascade). Some da lista. Recalcula saldo na leitura (não há saldo gravado). Sem cancelamento nesta fatia.

Há `GET /transactions/:id` novo: a tela de edição não depende do lançamento estar no mês listado. Sem esse GET, um `?id=` direto quebraria.

## 7. API

Nenhum breaking change nos `PATCH` atuais. Resposta de delete-or-deactivate: `204` se apagou; `200` JSON do registro + `deactivated: true` se desativou. O cliente trata `204` como sucesso sem body (já faz isso).

| Método | Rota | Notas |
|---|---|---|
| `PATCH` | `/accounts/:id` | já existe |
| `DELETE` | `/accounts/:id` | novo; regra da §6.1 |
| `DELETE` | `/categories/:id` | existe; ampliar dependências da §6.2 |
| `DELETE` | `/budget-templates/:id` | novo; regra da §6.3 |
| `PATCH` | `/plans/:id` | já existe |
| `DELETE` | `/plans/:id` | novo; só `type=GOAL` nesta fatia (404 se outro tipo) |
| `PATCH` | `/transactions/:id` | já existe; tipo pode ser enviado mas **se vier diferente do atual → 400** “Tipo do lançamento não pode ser alterado” |
| `DELETE` | `/transactions/:id` | novo; hard delete |
| `GET` | `/transactions/:id` | novo; 404 se não existir |

Cliente em `frontend/src/api/client.ts`: `accounts.remove`, `transactions.get`, `transactions.update`, `transactions.remove`, `plans.removeGoal`, `budgetTemplates.remove`. Tipos alinhados.

## 8. Frontend — arquivos

| Arquivo | Papel |
|---|---|
| `frontend/src/components/ItemActions.tsx` | menu ⋯ |
| `frontend/src/components/ItemActions.css` | layout, foco, 375px |
| `frontend/src/pages/Accounts.tsx` | ⋯, editar no form existente, reativar |
| `frontend/src/pages/Categories.tsx` | trocar fileira de botões por ⋯ |
| `frontend/src/pages/BudgetPlans.tsx` | ⋯ no card-link |
| `frontend/src/pages/BudgetPlanDetail.tsx` | ⋯ Excluir no header, além da lista |
| `frontend/src/pages/Goals.tsx` | ⋯ no card-link |
| `frontend/src/pages/GoalDetail.tsx` | Excluir no ⋯ do header |
| `frontend/src/pages/Transactions.tsx` | ⋯ por linha |
| `frontend/src/pages/NewTransaction.tsx` | modo edição via `?id=` |
| `frontend/src/api/client.ts` | métodos novos |

Erros de mutation: o mesmo `role="alert"` de cada página.

## 9. Regras extraídas para teste

Funções puras em `backend/src/lib/` (nomes finais livres, uma responsabilidade cada):

1. **Conta** — dados: `hasTransactions`, `hasGoal`, `hasRecurrence`, `isDefault`, `hasOtherActiveCommonAccount` → `'delete' | 'deactivate' | 'reject-default'`.
2. **Categoria** — dados: `hasTransactions`, `hasChildren`, `hasBudgetLines`, `hasBudgets`, `hasPlans` → `'delete' | 'deactivate'`.
3. **Planejamento** — dados: `hasGeneratedMonths` → `'delete' | 'unlink-and-delete'`.

Testes ao lado (`*.test.ts`), no estilo dos libs atuais. Rotas usam essas funções; não duplicar a regra no handler.

## 10. UX (375px)

- O ⋯ não causa scroll horizontal nem cobre o valor do lançamento: fica à direita da linha, depois do valor, ou no canto do card.
- Menu com fundo `var(--surface)`, borda `var(--border)`, texto `var(--text)`; item Excluir em `var(--danger)`.
- `:focus-visible` no gatilho e nos itens.
- `prefers-reduced-motion`: abrir/fechar sem animação (ou só opacidade instantânea).
- Cor não é o único sinal de Excluir: o rótulo é a palavra **Excluir**.

## 11. Critério de pronto

- Em contas, categorias, planejamentos, objetivos e lançamentos, todo item ativo tem ⋯ com Editar e Excluir.
- Conta sem lançamento some ao excluir; conta com lançamento fica **Inativa**.
- Lançamento some ao excluir e o saldo/dashboard refletem a ausência.
- Edição de lançamento não permite mudar o tipo.
- Nenhuma tela nova além do modo edição em `/lancamentos/novo?id=`.
- Testes das três funções de regra passam.
