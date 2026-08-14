# iMoney — Experiência financeira (contas, lançamentos, planos e objetivos)

**Data:** 2026-08-13  
**Status:** aprovado em conversa; aguardando revisão do arquivo  
**Produto:** controle financeiro do casal (iMoney)

## 1. Problema

A plataforma hoje registra sobretudo **saídas** (atalho **+ Gasto** na navegação), mostra categorias em cards só leitura e não oferece cadastro de contas, orçamento mensal replicável nem objetivos ligados a cofrinhos. O casal precisa: registrar entrada, saída e transferência a partir de Lançamentos; saber onde o dinheiro está; planejar limites **por mês** (não um teto eterno); e poupar para um alvo com prazo.

## 2. Princípios

- **80/20:** a UI chega usável. O usuário só muda exceções.
- **Planejado ≠ realizado:** orçamento alerta, nunca bloqueia gasto.
- **Saldo livre ≠ saldo total:** cofrinhos entram no reservado.
- **Transferência interna não é renda nem despesa.**
- **Dinheiro do casal é compartilhado.** Lançamento não tem “quem gastou” — evita discórdia. Login identifica a pessoa na sessão, não o gasto.
- Interface e rotas em português; valores em BRL.
- Mobile-first (mínimo 375px); toques ≥ 44px; cor não é o único indicador de estado.

## 3. Fora de escopo

- Multi-tenant / RLS por pessoa (os dois logins veem o **mesmo** casal)
- Cadastro público, OAuth, magic link, “esqueci a senha” nesta fatia (usuários criados no painel Supabase)
- Recorrências e fechamento de mês (modelos já existem; sem telas novas)
- Importação de extrato, câmbio, notificações push
- Tabela de “etapas” de objetivo (aumentar a aposta edita o mesmo registro)
- Reordenação visual sofisticada de categorias
- Ícones/cores obrigatórios no cadastro de categoria
- Integração bancária

## 3.1 Autenticação (Supabase)

Dois logins: um e-mail/senha para cada pessoa do casal. Ambos acessam os **mesmos** dados. Sem signup no app — criar os dois usuários em Authentication → Users no projeto Supabase já usado pelo Postgres.

| Peça | Comportamento |
|---|---|
| Tela | `/login` — e-mail, senha, **Entrar**. Sem “criar conta”. |
| Cliente | `@supabase/supabase-js` com `persistSession: true` (localStorage) e `autoRefreshToken: true` (refresh silencioso). |
| Sessão | Reabrir o app já entra logado. `onAuthStateChange` + `getSession` na subida. |
| API | `Authorization: Bearer <access_token>` em `/api/*` exceto `GET /api/health`. 401 → tenta refresh uma vez; se falhar, `/login`. |
| Header | e-mail (ou nome) de quem está logado + **Sair** (`signOut`). |
| Lançamento | **não** grava responsável nem userId de auth. Gasto é do casal. |

Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend); `SUPABASE_URL`, `SUPABASE_ANON_KEY` (backend, validar JWT via `auth.getUser(jwt)`). Nunca no git.

## 4. Navegação e rotas

Barra principal: **Dashboard** · **Lançamentos** · **Cadastros**. O item **+ Gasto** some. Sem sessão, qualquer rota autenticada redireciona para `/login`.

| Rota | Função |
|---|---|
| `/login` | E-mail e senha (pública) |
| `/` | Dashboard do mês |
| `/lancamentos` | Lista + botão Adicionar |
| `/lancamentos/novo` | Form único (entrada / saída / transferência) |
| `/cadastros` | Índice dos quatro cadastros |
| `/contas` | Contas e cofrinhos |
| `/categorias` | Lista em acordeão + cadastro |
| `/planejamentos` | Moldes e meses gerados |
| `/planejamentos/:id` | Detalhe do molde / meses |
| `/objetivos` | Lista de objetivos |
| `/objetivos/:id` | Detalhe (progresso, ações) |

No celular os três itens da barra cabem; Cadastros concentra o resto. Sem menu extra no desktop.

## 5. Lançamentos

### 5.1 Lista

Cabeçalho: título, período do mês corrente, botão **Adicionar lançamento** (sempre visível). Empty state aponta para o mesmo botão — texto sem “gasto” como único caminho.

Cada linha: descrição; categoria ou rótulo “Transferência”; conta origem (e destino se transferência); valor (`+` entrada, `−` saída, sem sinal na transferência); data e hora. **Sem** campo/rótulo de responsável.

### 5.2 Formulário

Uma rota, um form. Segmented control no topo: **Entrada** | **Saída** | **Transferência**. Default: **Saída**. Troca campos, não a rota.

Defaults (80/20):

| Campo | Default |
|---|---|
| Tipo | Saída |
| Data e hora | instante atual (`datetime-local`) |
| Conta origem | conta **padrão** |
| Destino (transferência) | vazio (nunca pré-preenche a mesma conta) |

| Tipo | Obrigatório | Efeito |
|---|---|---|
| Saída | valor, descrição, categoria filha de saída, data/hora | diminui saldo da origem |
| Entrada | valor, descrição, categoria filha de entrada, data/hora | aumenta saldo da origem |
| Transferência | valor, descrição, data/hora, origem e destino **diferentes** | move saldo; **sem categoria** |

- Categoria: só filhas ativas do tipo correspondente. Pai não é selecionável.
- Conta: sugerida a padrão; usuário troca se for outra. Saída **não** sugere cofrinho.
- Sem duas contas ativas, Transferência desabilitada com texto para Cadastros → Contas.
- Sem conta padrão, origem começa vazia (usuário escolhe).
- Salvar → volta para `/lancamentos`.
- Transferência não entra nos totais de renda/despesa do mês.
- Não enviar `responsible` nem `userId`. A coluna pode existir no banco; a UI e o POST não a usam.

`Transaction.date` deixa de ser só data: passa a **data e hora**. Filtro de mês usa a data civil do valor persistido. Cliente envia `YYYY-MM-DDTHH:mm` no fuso local do casal (um fuso; sem conversão sofisticada nesta fatia).

## 6. Contas e cofrinhos

Mesmo modelo `Account`. Diferem só no propósito.

| | Conta | Cofrinho |
|---|---|---|
| `isReserved` | `false` | `true` |
| Saldo | livre | reservado |
| Padrão | pode ser | **não** pode ser |
| Transferência | de/para qualquer outra | igual |

Lista em `/contas`: nome, tipo, saldo, selo **Padrão**. Botão **Nova conta ou cofrinho**.

**Conta padrão:** exatamente uma conta comum (`isReserved = false`, `isActive = true`) com `isDefault = true`. Marcar outra desmarca a anterior. A primeira conta comum criada vira padrão automaticamente. Ao desativar a conta padrão, se existir outra conta comum ativa, ela (menor `sortOrder`) vira padrão. Se não existir outra, a API recusa (400). Cofrinho nunca é padrão.

**Saldo inicial:** campo opcional no cadastro. Se preenchido, cria lançamento `INCOME` com `isOpeningBalance = true` na data/hora do cadastro, naquela conta. Esse lançamento:

- entra no **saldo da conta**;
- **não** entra em renda do mês nem nos totais de receita do Dashboard;
- na lista de lançamentos aparece como entrada com selo **Saldo inicial** (descrição `"Saldo inicial — {nome da conta}"`); o form de novo lançamento **não** oferece essa flag.

**Saldo da conta:** `income − expense + transfersIn − transfersOut` (incluindo abertura).

Gasto a partir de cofrinho é permitido (é o mesmo tipo de lugar), mas o form de saída continua sugerindo a conta padrão.

Desativar não apaga histórico. Cofrinho com objetivo ativo permanece na lista; desativa, não exclui.

## 7. Categorias

Lista em acordeão. Blocos: **Saídas**, depois **Entradas**. Cada pai (Moradia, Alimentação…) abre/fecha. Filhas dentro. No celular, pais começam **fechados**. Controle com `aria-expanded`; toque ≥ 44px.

Cadastro no contexto:

- Topo: **Nova categoria** — grupo (pai) ou subcategoria (escolhe o pai; tipo herda).
- Pai: adicionar filha, editar nome, desativar.
- Filha: editar, desativar. Excluir só sem lançamentos; senão desativa.
- Inativas no fim do grupo, rótulo visível, fora do select de novo lançamento.

Sem reordenação drag-and-drop nesta fatia (`sortOrder` permanece). Sem ícone/cor obrigatórios.

## 8. Planejamentos (orçamento mensal)

Um planejamento é um **molde** (`BudgetTemplate`) com nome e linhas: categoria filha de saída + valor mensal. Não é teto eterno.

**Criar:** nome; mês inicial (default: mês atual); quantidade de meses (default: **3**). Categorias de saída filhas já listadas; valor vazio ou zero = sem limite naquele mês. **Gerar meses** cria registros `Budget` independentes (`categoryId + year + month` único).

**Depois:** o detalhe do molde lista os meses gerados. Abrir um mês mostra as linhas `Budget` daquele mês para editar (agosto não altera setembro). Dashboard do mês lê só os `Budget` daquele mês.

**Reaplicar:** ação explícita. Se já existir `Budget` para aquele par categoria+mês, **não sobrescreve** — avisa e pula — salvo confirmação **Substituir**. Dois moldes não somam no mesmo par; há um único limite.

Alertas de faixa (50 / 75 / 90 / estourou) continuam **informativos**. Categoria sem `Budget` no mês não entra no ritmo.

## 9. Dashboard — ritmo proporcional

Para cada categoria com limite no mês corrente:

- `esperadoAteHoje = limite × (diaAtual ÷ diasDoMês)`  
  Dia civil do calendário (sem descontar fim de semana). No dia 10 de um mês de 30 dias, esperado de R$ 900 = R$ 300.
- `projecaoMes = (gastoAteHoje ÷ diaAtual) × diasDoMês`. Só o **mês corrente** usa `diaAtual = dia de hoje` e as cores de ritmo. Mês passado ou futuro: sem `paceStatus` de ritmo; só gasto vs limite (`over_limit` se estourou).
- `percentualRitmo = gastoAteHoje ÷ esperadoAteHoje` (se esperado = 0, não pinta ritmo).

Cores sobre o **proporcional até hoje**, não sobre o limite cheio:

| Estado | Condição | Exemplo (esperado R$ 300) |
|---|---|---|
| Verde — no ritmo | `percentualRitmo ≤ 0,80` | até R$ 240 |
| Amarelo — atenção | `0,80 < percentualRitmo ≤ 1,00` | R$ 240 a R$ 300 |
| Vermelho — acima do ritmo | `percentualRitmo > 1,00` | mais que R$ 300 |

Se `gasto ≥ limite` do mês: vermelho (estourou o mês), independentemente do ritmo.

O card mostra: gasto, limite, esperado até hoje, projeção se o ritmo seguir, e **texto** do estado (“no ritmo”, “atenção”, “acima do ritmo”, “estourou”). Tokens: `--success`, `--warning`, `--danger`.

Nada bloqueia lançamento.

## 10. Objetivos de longo prazo

Campos: nome, cofrinho (`Account` com `isReserved = true`), valor-alvo, prazo (data final).

- Progresso = **saldo atual do cofrinho** (calculado na leitura; não gravar `currentAmount` como fonte da verdade para GOAL).
- Um cofrinho: no máximo **um** objetivo com status `ACTIVE`.
- Reserva mensal sugerida (não cria lançamento):  
  `(valorAlvo − saldoCofrinho) ÷ mesesRestantes`  
  `mesesRestantes = (anoPrazo − anoHoje) × 12 + (mêsPrazo − mêsHoje)`. Se o resultado for `0` e a data-prazo ainda é hoje ou futura, usar `1`. Se saldo ≥ meta: sugerido = 0, status `ACHIEVED`. Se a data-prazo já passou e ainda falta valor: status permanece `ACTIVE`, a UI mostra selo **Prazo vencido**, sugerido não é calculado (não divide por número negativo); mostra só quanto falta.

Defaults do form: prazo = hoje + 12 meses; cofrinho = select de contas reservadas, ou criar cofrinho na hora com nome pré-preenchido do objetivo.

**Aportar:** botão no detalhe abre `/lancamentos/novo` em Transferência, origem = conta padrão, destino = cofrinho do objetivo.

**Editar** a qualquer momento: nome, valor-alvo, prazo, cofrinho (o novo não pode ter outro `ACTIVE`). Recalcula sugestão. Se saldo ≥ nova meta → `ACHIEVED`.

### 10.1 Atingido

Quando saldo ≥ valor-alvo: status `ACHIEVED`, sugerido R$ 0, dinheiro **não se move**. Ações:

1. **Manter no cofrinho** — segue reservado; não entra no saldo livre.
2. **Liberar** — form de transferência: origem = cofrinho, destino = **conta padrão pré-preenchida**, usuário pode escolher outra. Objetivo permanece `ACHIEVED`. Cofrinho sem objetivo `ACTIVE` pode receber um **novo** objetivo (atingido não ocupa a vaga).
3. **Aumentar a aposta** — mesmo `Plan`, mesmo cofrinho: sobe valor-alvo e/ou prazo; status volta a `ACTIVE`; sugestão recalcula. Sem tabela de etapas. Cada PATCH em `targetAmount` ou `endDate` grava uma linha em `PlanAudit` (`field`, `oldValue`, `newValue`, `changedAt`), no mesmo espírito de `TransactionAudit`.

Lista: nome, cofrinho, barra, prazo, sugerido mensal. Atingido permanece visível (não some).

## 11. Modelo de dados (deltas)

Estender Prisma existente.

**Account:** `isDefault Boolean @default(false)`. Constraint de aplicação: no máximo um `isDefault && !isReserved && isActive`.

**Transaction:** `date` como `DateTime` (com hora). `isOpeningBalance Boolean @default(false)`.

**BudgetTemplate:** `id`, `name`, `createdAt`, `updatedAt`.  
**BudgetTemplateLine:** `templateId`, `categoryId`, `amount` (Decimal; 0 = ignorar na geração).  
**Budget:** inalterado na unicidade; opcional `sourceTemplateId` para rastreio.

**Plan:** `accountId String?` (FK Account) — obrigatório quando `type = GOAL`. Para GOAL, saldo lido da conta; `currentAmount` no banco pode existir mas a API de leitura **recalcula**.  
**PlanAudit:** `id`, `planId`, `field`, `oldValue`, `newValue`, `changedAt`.

## 12. API (contratos)

Prefixo `/api`. Validação Zod. Erros em português via `errorHandler`.

- `GET/POST /accounts`, `PATCH /accounts/:id`, `POST /accounts/:id/default`
- `GET /accounts/:id/balance` (já existe; incluir abertura)
- Categorias: GET/POST/PATCH/DELETE já existem; UI passa a usá-los
- `POST /transactions` — aceitar datetime; `isOpeningBalance` só via fluxo de conta (não exposto no form de lançamento)
- `GET/POST /budget-templates`, `PATCH /budget-templates/:id`, `POST /budget-templates/:id/apply` body `{ startYear, startMonth, months, overwrite: boolean }`
- `GET /budgets?year&month`, `PATCH /budgets/:id` (editar um mês)
- `GET/POST /plans`, `PATCH /plans/:id` (objetivos GOAL com `accountId`)
- Dashboard `/dashboard/monthly` — incluir `expectedToDate`, `paceRatio`, `paceStatus: 'on_track' | 'warning' | 'over_pace' | 'over_limit'` por categoria com budget; `summary.income` **exclui** `isOpeningBalance`

Frontend: tipos em `frontend/src/api/client.ts` alinhados.

## 13. Erros e bordas

| Situação | Comportamento |
|---|---|
| Transferência origem = destino | 400, mensagem clara |
| Transferência sem duas contas | controle desabilitado na UI; 400 na API |
| Cofrinho com outro GOAL `ACTIVE` | 400 ao criar/mover objetivo |
| Desativar ou desmarcar a única padrão | se existir outra conta comum ativa, promove a de menor `sortOrder` e segue; se não existir, 400 (“cadastre outra conta antes”) |
| Apply sem nenhuma linha com valor > 0 | 400 |
| Liberar cofrinho com saldo 0 | 400 / botão desabilitado |
| Categoria com lançamentos | DELETE vira desativar (já existe) |
| Mês do dashboard ≠ mês corrente | sem faixa verde/amarelo/vermelho de “hoje”; só gasto vs limite |
| Sem Bearer ou JWT inválido | 401; frontend vai a `/login` |
| Credencial errada | mensagem “E-mail ou senha incorretos” na tela de login |

## 14. Testes de regra (aceitação)

1. Conta com saldo inicial R$ 100 + saída R$ 30 + transferência R$ 20 para cofrinho → saldos 50 e 20; renda do mês = 0 pela abertura.
2. Dia 10, mês 30 dias, limite 900, gasto 240 → `on_track`; 270 → `warning`; 301 → `over_pace`; 900 → `over_limit`.
3. Meta 12 000, saldo 3 000, 9 meses restantes → sugerido 1 000.
4. Saldo do cofrinho ≥ meta → `ACHIEVED`; aumentar alvo acima do saldo → `ACTIVE` de novo.
5. `apply` com `overwrite: false` não altera `Budget` existente.
6. Segunda conta marcada padrão desmarca a primeira; cofrinho recusa `isDefault`.
7. Transferência não altera `summary.income` nem `summary.expenses`.

## 15. Ordem de implementação

0. Auth Supabase (dois logins, sessão persistida, API protegida)  
1. Contas/cofrinhos + padrão + saldo inicial  
2. Lançamentos (nav, botão, três tipos, data/hora, defaults; **sem** responsável)  
3. Categorias em acordeão + CRUD na lista  
4. Planejamentos (molde, gerar meses, editar mês)  
5. Objetivos (CRUD, aporte, atingido, liberar, aumentar aposta)  
6. Dashboard: ritmo proporcional e cores  

Cada fatia entrega UI usável no celular (375px) e tipos API sincronizados.

## 16. Decisões registradas

- Conta e cofrinho = mesmo tipo de lugar; propósito diferente.
- Molde gera meses independentes; reaplicar não sobrescreve sozinho.
- Progresso do objetivo = saldo do cofrinho; sem transferência automática.
- Um GOAL ativo por cofrinho.
- Atingido: manter / liberar (destino padrão, escolhível) / aumentar a aposta no mesmo registro.
- Dois logins (e-mail/senha); dados únicos do casal; lançamento sem “quem gastou”.
- Spec única; implementação fatiada na ordem acima.
