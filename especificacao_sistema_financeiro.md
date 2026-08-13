# ESPECIFICAÇÃO DE REGRAS DE NEGÓCIO
## Sistema de Controle Financeiro do Casal
**Documento funcional • Contexto financeiro • Regras de negócio • Requisitos de comportamento**

| Item | Definição |
|---|---|
| **Objetivo** | Criar um sistema simples e completo para registrar o dinheiro no momento em que entra ou sai, organizar por categorias, acompanhar limites e planejamentos e visualizar a evolução financeira do casal. |
| **Público** | Duas pessoas que administram a vida financeira em conjunto, podendo registrar quem realizou cada lançamento. |
| **Escopo** | Somente contexto, regras de negócio, comportamentos e necessidades funcionais. Não há definição de tecnologia, arquitetura, banco de dados ou implementação. |
| **Princípio central** | O sistema deve ajudar o casal a tomar decisões antes de gastar, e não apenas registrar o que já aconteceu. |

## 1. Visão do produto
O sistema será um controle financeiro doméstico para o casal. A operação principal é registrar entradas e saídas imediatamente, com valor, categoria e descrição. A partir desses registros o sistema deve consolidar o mês, comparar o realizado com o planejado, controlar compromissos futuros e permitir a criação de objetivos com prazo e meta.
O sistema deve ser útil tanto para registrar um gasto pequeno no celular quanto para fazer um planejamento de vários meses. Ele deve separar claramente: dinheiro disponível, dinheiro já comprometido, dinheiro reservado para objetivos e dinheiro que está efetivamente livre para consumo.

## 2. Contexto financeiro real usado como referência

### 2.1 Renda do casal
| Pessoa | Renda bruta informada | Descontos informados | Valor disponível estimado |
|---|---|---|---|
| **Usuário** | R$ 15.000 | IR R$ 900 + INSS R$ 440 + contabilidade R$ 187 | R$ 13.473 |
| **Esposa** | R$ 4.100 | INSS + IR ~R$ 500 | R$ 3.600 |
| **Casal** | | | R$ 17.073 |

*Regra/observação: Os valores de renda são referências do cenário atual; o sistema não deve assumir que toda renda é mensal fixa nem que os descontos serão sempre iguais. O usuário precisa poder alterar ou registrar novas entradas.*

### 2.2 Compromissos e despesas recorrentes atuais
| Categoria/Descrição | Valor mensal |
|---|---|
| Parcela da casa | R$ 1.700 |
| Parcela do lote | R$ 750 |
| Internet | R$ 110 |
| Telefone do usuário | R$ 60 |
| Telefone da esposa | R$ 50 |
| Academia da esposa | R$ 76 |
| Meli+ Disney | R$ 19,90 |
| Amazon Prime + HBO | R$ 44,90 |
| Amazon Prime | R$ 19,90 |
| Energia | ~R$ 220 |
| Água | ~R$ 130 |
| Combustível | ~R$ 600 |
| Fundo carro/IPVA/manutenção | R$ 260 |
| Barbearia do usuário | R$ 80 |

### 2.3 Compromissos temporários atuais
| Compromisso | Valor | Prazo/Condição |
|---|---|---|
| Viagem | R$ 2.290/mês | Até 28/12; parcelas mensais |
| Dólares da viagem | R$ 4.000 convertidos | Valor já separado e intocável para a viagem |
| Decoração do casamento | R$ 400 | Pagamento futuro; casamento em ~2 meses |
| Músico da igreja | R$ 800 | Pagamento futuro |
| Vestido da noiva | R$ 280 | Saldo restante |
| Maquiagem da noiva | ~R$ 230 | Estimativa |
| Cabelo da noiva | R$ 400 | Estimativa/previsão |

### 2.4 Fotografia do mês em andamento (agosto/2026)
Data de referência informada: 13/08/2026. As despesas fixas do mês já foram pagas. O saldo atual informado é R$ 7.750, depois de retirar R$ 4.000 para compra de dólares da viagem. Os dólares não devem ser tratados como dinheiro disponível para despesas correntes.

| Categoria | Gasto acumulado em agosto |
|---|---|
| Mercado/alimentação | R$ 960 |
| Delivery/lanches | R$ 643 |
| Bobeiras/presentes | R$ 385 |
| Combustível | R$ 370 |
| Farmácia | R$ 304 |
| Salão | R$ 100 |
| **Total informado** | **R$ 2.762** |

*Regra/observação: O mês anterior teve aproximadamente R$ 2.000 em mercado/limpeza, R$ 1.100 em delivery/lanches, R$ 682 em farmácia e R$ 5.000 em presentes/bobeiras. Esses dados são referência para definir limites e metas de redução, não são regras permanentes.*

## 3. Princípios de negócio do sistema
- Cada entrada e cada saída deve ser registrada como um fato financeiro individual, com data, valor, tipo, categoria e descrição.
- Categorias devem ser configuráveis pelo usuário: criar, editar, desativar e excluir quando não houver dependências que impeçam a exclusão.
- O sistema deve diferenciar despesa realizada de compromisso futuro. Uma parcela futura pode existir no planejamento sem aparecer como dinheiro já gasto.
- Planejamento e realizado são conceitos diferentes: o planejamento define intenção/meta; os lançamentos mostram o que realmente aconteceu.
- Valores reservados para objetivos não devem ser confundidos com dinheiro livre. Exemplos atuais: dólares da viagem, valores já destinados ao casamento e reservas.
- O sistema deve permitir entradas além dos salários, porque podem existir rendas extras, reembolsos, vendas, devoluções ou outras receitas.
- Todo gasto deve poder indicar quem realizou o lançamento: usuário, esposa ou casal.
- O sistema deve permitir correção de lançamentos sem perder a rastreabilidade do valor final.
- O orçamento não deve impedir o gasto. Ele deve sinalizar quando o usuário está próximo ou acima do limite.
- Objetivos com prazo devem mostrar quanto já foi acumulado, quanto falta e qual valor periódico seria necessário para atingir a meta.

## 4. Lançamentos financeiros

### 4.1 Saídas
Registrar uma saída é a ação mais frequente do sistema. Deve ser possível fazê-la em poucos passos, inclusive pelo celular.

| Campo | Obrigatório | Regra de negócio |
|---|---|---|
| **Data** | Sim | Data em que o gasto ocorreu ou foi efetivamente pago. |
| **Valor** | Sim | Valor monetário positivo. A natureza entrada/saída define o efeito no saldo. |
| **Tipo** | Sim | Saída. |
| **Categoria** | Sim | Deve ser selecionável entre categorias ativas. |
| **Descrição** | Sim | Texto curto explicando o gasto; ex.: "mercado Carrefour", "pizza sexta-feira". |
| **Responsável** | Recomendado | Usuário, esposa ou casal. |
| **Conta/caixa** | Recomendado | Indica de onde saiu o dinheiro; ex.: conta corrente, dinheiro, carteira da viagem. |
| **Planejamento vinculado** | Opcional | Permite associar a um planejamento/meta, quando aplicável. |
| **Observação** | Opcional | Campo livre para detalhes adicionais. |

### 4.2 Entradas
O sistema também deve registrar dinheiro recebido. Não deve existir lógica específica apenas para salário.

| Exemplos de entrada | Comportamento |
|---|---|
| **Salário do usuário** | Entrada recorrente ou lançamento manual. |
| **Salário da esposa** | Entrada recorrente ou lançamento manual. |
| **Renda extra** | Lançamento avulso. |
| **Reembolso** | Entrada que pode ser vinculada a uma despesa anterior, quando aplicável. |
| **Devolução/estorno** | Entrada financeira que reduz o impacto líquido de uma saída anterior. |
| **Transferência recebida** | Deve poder ser classificada como transferência interna quando for apenas movimentação entre contas próprias. |

*Regra/observação: Transferências internas não devem ser somadas como renda, para evitar inflar artificialmente a receita.*

## 5. Categorias
Categorias são a principal forma de organizar os lançamentos e comparar planejamento x realizado. O usuário deve ter autonomia para administrar a taxonomia.

### 5.1 Operações permitidas
- Criar categoria.
- Editar nome e propriedades.
- Desativar categoria para impedir novos lançamentos sem apagar histórico.
- Excluir categoria quando for seguro fazê-lo.
- Reordenar ou organizar categorias.
- Definir se a categoria é de entrada ou saída, ou permitir uso compartilhado quando fizer sentido.
- Definir categoria pai/subcategoria, caso o produto queira suportar uma estrutura hierárquica.

*Regra/observação: Desativação é preferível à exclusão quando já existem lançamentos históricos. O histórico financeiro não deve desaparecer apenas porque uma categoria deixou de ser usada.*

### 5.2 Categorias iniciais sugeridas para o casal
| Grupo | Categorias sugeridas |
|---|---|
| **Moradia** | Casa, lote, energia, água, internet, telefone |
| **Alimentação** | Mercado, limpeza, delivery/lanches, restaurantes |
| **Transporte** | Combustível, manutenção, IPVA, estacionamento, transporte por aplicativo |
| **Saúde** | Farmácia, consultas, exames |
| **Pessoal** | Barbearia, salão, roupas, autocuidado |
| **Lazer** | Passeios, jogos, assinaturas |
| **Presentes e extras** | Presentes, bobeiras/compras pessoais |
| **Viagem** | Parcela da viagem, câmbio/dólares, gastos durante viagem |
| **Casamento** | Decoração, músico, vestido, maquiagem, cabelo, outros |
| **Patrimônio** | Reserva de emergência, investimentos, objetivos patrimoniais |
| **Renda** | Salário usuário, salário esposa, renda extra, reembolsos |

## 6. Planejamentos, metas e orçamentos
O sistema deve permitir criar planejamentos com prazo, valor-alvo e regras de contribuição. Planejamento é mais amplo que orçamento mensal: pode representar uma viagem, casamento, reserva, compra, quitação de dívida ou qualquer objetivo.

| Elemento | Descrição |
|---|---|
| **Nome** | Ex.: Reserva de emergência 2026, Viagem, Casamento. |
| **Tipo** | Meta de valor, orçamento de categoria, fundo/reserva, compromisso parcelado ou outro tipo configurável. |
| **Valor-alvo** | Quanto se deseja acumular ou respeitar. |
| **Valor já realizado** | Quanto já foi separado/gasto/atingido, conforme o tipo. |
| **Data inicial** | Quando o planejamento começa. |
| **Prazo final** | Quando o objetivo deve ser concluído. |
| **Periodicidade** | Mensal, semanal, quinzenal, anual ou avulsa. |
| **Meta periódica** | Valor sugerido por período para atingir o alvo. |
| **Categoria relacionada** | Categoria que recebe os lançamentos associados. |
| **Status** | Ativo, atingido, pausado, cancelado ou encerrado. |
| **Prioridade** | Baixa, média ou alta; útil para decidir distribuição de sobra. |

### 6.1 Exemplos do contexto atual
| Planejamento | Valor/meta | Prazo | Regra |
|---|---|---|---|
| **Viagem** | R$ 2.290 por mês | 28/12/2026 | Compromisso mensal até dezembro; R$ 4.000 em dólares já separados. |
| **Casamento** | R$ 2.110 de compromissos conhecidos | Out/2026 | Separar o dinheiro antes dos pagamentos. |
| **Reserva de emergência** | Primeira meta: R$ 10.000 | Sem prazo rígido inicial | Depois aumentar conforme evolução. |
| **Lote** | R$ 750/mês | 08/2027 | Ao terminar, liberar R$ 750 para patrimônio e não aumentar padrão de vida. |

## 7. Orçamento mensal
O usuário deve poder definir limites mensais por categoria e acompanhar o consumo em tempo real. O orçamento não precisa ser fixo para sempre; pode mudar mês a mês.

| Categoria | Meta mensal de referência |
|---|---|
| Mercado + limpeza | R$ 1.700 |
| Delivery/lanches | R$ 500 |
| Farmácia | R$ 300 |
| Bobeiras/presentes | R$ 700 |
| Salão/barbearia | R$ 200 |
| Combustível | R$ 600 |
| Fundo carro/IPVA/manutenção | R$ 260 |

*Regra/observação: Essas metas são o ponto de partida definido na conversa e podem ser alteradas pelo usuário. Farmácia deve ser tratada como orçamento indicativo, não como incentivo a reduzir gastos necessários de saúde.*

### 7.1 Alertas de orçamento
- Atingiu 50% do limite.
- Atingiu 75% do limite.
- Atingiu 90% do limite.
- Ultrapassou o limite.
- Ritmo projetado acima do orçamento, mesmo que o limite ainda não tenha sido atingido.

*Regra/observação: O sistema deve mostrar tanto o percentual consumido quanto o valor restante. Se o mês tiver 10 dias restantes e só houver 5% do orçamento disponível, isso precisa ser perceptível.*

## 8. Contas, saldos e dinheiro reservado
Embora o pedido original esteja centrado em categorias e lançamentos, um controle confiável precisa distinguir onde o dinheiro está. O sistema deve permitir múltiplas contas/caixas e transferências entre elas.

| Conceito | Regra |
|---|---|
| **Conta** | Local lógico onde existe dinheiro: conta corrente, poupança, carteira, conta conjunta etc. |
| **Saldo** | Entradas menos saídas naquela conta, considerando transferências. |
| **Transferência interna** | Move dinheiro entre contas próprias sem alterar receita ou despesa total. |
| **Reserva/fundo** | Valor separado para finalidade específica; pode ficar em uma conta específica ou apenas ser marcado como reservado. |
| **Dinheiro intocável** | Valor que o usuário marca como indisponível para gastos comuns. Exemplo atual: R$ 4.000 convertidos em dólares para a viagem. |
| **Saldo livre** | Saldo não comprometido com reservas, metas ou contas futuras. |

## 9. Recorrências e compromissos futuros
O sistema deve permitir cadastrar uma obrigação recorrente sem exigir que cada parcela seja digitada manualmente. Isso é importante para a casa, lote, assinaturas e viagem.
- Definir valor fixo ou estimado.
- Definir data de vencimento/pagamento.
- Definir periodicidade.
- Definir data final ou quantidade de ocorrências.
- Permitir alterar o valor de uma ocorrência sem necessariamente alterar a série futura.
- Permitir pausar ou encerrar uma recorrência.
- Distinguir "previsto" de "pago".
- Mostrar compromissos futuros no fluxo de caixa.

## 10. Fechamento e acompanhamento do mês
O sistema deve apresentar uma visão mensal e permitir comparar o orçamento com o realizado. Não é necessário impedir lançamentos retroativos, mas deve existir transparência sobre o período ao qual cada registro pertence.

| Indicador | Exibição desejada |
|---|---|
| **Receitas** | Total recebido no período. |
| **Despesas** | Total pago no período. |
| **Saldo do mês** | Receitas menos despesas. |
| **Comprometido futuro** | Obrigações cadastradas e ainda não pagas. |
| **Reservado** | Valor separado para metas/fundos. |
| **Saldo livre** | O que resta depois de compromissos e reservas. |
| **Poupança do mês** | Valor que foi efetivamente destinado a reserva/investimentos. |
| **Desvio do orçamento** | Diferença entre planejado e realizado por categoria. |

## 11. Dashboard e relatórios

### 11.1 Dashboard mensal
- Saldo atual por conta.
- Receitas do mês.
- Despesas do mês.
- Quanto já foi reservado.
- Quanto está comprometido com planejamentos.
- Saldo livre estimado.
- Categorias que mais consumiram orçamento.
- Orçamento restante por categoria.
- Projeção até o fim do mês com base no ritmo atual.
- Próximos compromissos e vencimentos.
- Metas em andamento e progresso.

### 11.2 Relatórios históricos
- Gastos por categoria por mês.
- Evolução da renda.
- Evolução da taxa de poupança.
- Comparação de meses.
- Maior e menor gasto por categoria.
- Gastos por responsável.
- Gastos recorrentes.
- Metas concluídas e atrasadas.
- Evolução do patrimônio/reservas, quando contas e fundos estiverem cadastrados.

## 12. Correções, cancelamentos e histórico
- Um lançamento não deve desaparecer silenciosamente após exclusão.
- Preferencialmente, excluir deve significar cancelar/inativar e preservar histórico, principalmente após o fechamento de um mês.
- Alterações de valor, data, categoria e conta devem atualizar os saldos e indicadores afetados.
- O usuário deve conseguir identificar lançamentos editados ou cancelados.
- Estornos devem ser tratados como nova movimentação ou vínculo de correção, sem apagar o fato original.

## 13. Regras de comportamento financeiro do casal incorporadas ao sistema
Estas regras não são apenas sugestões de interface; representam a forma de uso que o sistema deve apoiar.
- O saldo da conta não deve ser apresentado como se fosse todo dinheiro disponível; o sistema deve destacar reservas e compromissos.
- Dinheiro de viagem já convertido em dólar deve poder ser marcado como reservado/intocável.
- Gastos pessoais podem ter limite próprio para cada membro do casal. Exemplo atual: R$ 350/mês para cada um dentro da verba de bobeiras/compras pessoais.
- Gastos de delivery devem possuir orçamento próprio, separado de supermercado.
- Manutenção e IPVA do carro devem poder ser provisionados em um fundo mensal (atualmente R$ 260/mês).
- Quando uma despesa parcelada termina, o sistema deve alertar que aquele valor foi liberado no orçamento. Ex.: viagem termina em 28/12; lote termina em 08/2027.
- O sistema deve permitir transformar uma despesa liberada em nova contribuição de meta, sem aumentar automaticamente o padrão de consumo.
- Categorias de necessidade variável, especialmente saúde, podem ter orçamento orientativo e não devem gerar bloqueio ou incentivo a economizar de forma inadequada.
- O objetivo do sistema é dar previsibilidade, não punir o usuário por ultrapassar uma meta.

## 14. Cenário-base proposto a partir dos dados atuais
Este quadro é uma referência para o sistema começar com um orçamento plausível. Ele não deve ser tratado como valor imutável.

| Bloco | Valor mensal |
|---|---|
| Renda líquida estimada | R$ 17.073 |
| Despesas fixas/recorrentes atuais | R$ 4.120,70 |
| Viagem até dez/2026 | R$ 2.290 |
| Mercado + limpeza | R$ 1.700 |
| Delivery/lanches | R$ 500 |
| Farmácia | R$ 300 |
| Bobeiras/presentes | R$ 700 |
| Salão/barbearia | R$ 200 |
| Combustível | R$ 600 |
| Fundo carro/IPVA/manutenção | R$ 260 |
| **Total planejado de consumo/compromissos** | **R$ 10.670,70** |
| **Capacidade teórica restante** | **R$ 6.402,30** |

*Regra/observação: O valor restante é capacidade teórica e ainda deve considerar metas, reservas, despesas sazonais e eventos extraordinários. O sistema deve deixar o usuário definir como distribuir a sobra.*

## 15. Linha do tempo financeira de referência

| Período | Evento | Comportamento esperado do sistema |
|---|---|---|
| **Agosto/2026** | Controle de gastos em andamento; saldo de conta R$ 7.750; R$ 4.000 separados em dólares. | Mostrar saldo livre, compromissos do casamento e parcela da viagem. |
| **Outubro/2026** | Casamento. | Alertar compromissos de decoração, músico, vestido, maquiagem e cabelo. |
| **Dezembro/2026** | Fim das parcelas mensais da viagem em 28/12. | Sinalizar liberação de R$ 2.290/mês no orçamento. |
| **Agosto/2027** | Última parcela do lote em 08/2027. | Sinalizar liberação de R$ 750/mês no orçamento. |
| **Após 08/2027** | Lote quitado conforme informação do usuário. | Sugerir replanejamento do orçamento e redirecionamento do valor liberado. |

## 16. Casos de uso essenciais
- **Registrar gasto:** "Gastei R$ 85 no mercado" → selecionar categoria Mercado, informar R$ 85, descrição e salvar. O saldo e o orçamento são atualizados imediatamente.
- **Registrar entrada:** "Recebi R$ 500 de renda extra" → selecionar Entrada/Renda extra e adicionar o valor. O saldo aumenta.
- **Criar categoria:** "Quero uma categoria para viagens" → criar categoria Viagem e utilizá-la em novos lançamentos.
- **Criar meta:** "Quero formar R$ 10.000 de reserva até uma data" → criar planejamento com valor, prazo e contribuições.
- **Cadastrar recorrência:** "A parcela da viagem é R$ 2.290 até dezembro" → criar compromisso mensal com data final.
- **Ver orçamento:** O usuário abre agosto e vê quanto já gastou em mercado, delivery, bobeiras etc. e quanto resta.
- **Corrigir lançamento:** Um gasto foi lançado como R$ 180, mas era R$ 108 → editar e recalcular saldos/indicadores.
- **Cancelar gasto:** Uma compra foi estornada → registrar estorno ou cancelar o lançamento mantendo histórico.
- **Transferir reserva:** Separar dinheiro da conta corrente para uma reserva → registrar transferência, sem contar como renda ou despesa.
- **Ver futuro:** O sistema mostra os próximos compromissos, incluindo parcelas de viagem, casamento e lote.

## 17. Critérios de aceitação de negócio
- Nenhuma saída pode ser salva sem valor e categoria.
- Uma entrada não pode ser contabilizada como despesa.
- Transferências entre contas próprias não devem alterar renda/despesa consolidada.
- Categorias inativas não podem ser usadas em novos lançamentos.
- Excluir uma categoria não pode apagar silenciosamente o histórico financeiro.
- Um lançamento editado deve atualizar todos os relatórios dependentes.
- Planejamento futuro não deve reduzir o saldo de uma conta antes do pagamento acontecer.
- Uma despesa recorrente deve permitir identificar previsto, pago e pendente.
- Um planejamento com prazo deve apresentar progresso e valor restante.
- O sistema deve permitir comparar orçamento x realizado por categoria.
- O sistema deve permitir identificar o responsável pelo gasto quando essa informação for usada.
- Uma meta de reserva pode receber contribuições sem que elas sejam confundidas com consumo.
- O usuário deve conseguir consultar o histórico de todos os lançamentos por período.
- O sistema deve permitir fechar/reabrir meses sem apagar históricos.
- Alertas de orçamento devem ser informativos e não bloqueadores, salvo regra futura criada explicitamente pelo usuário.

## 18. Fora do escopo deste documento
- Tecnologia e linguagem de programação.
- Arquitetura de software.
- Banco de dados e modelo físico.
- Hospedagem e infraestrutura.
- Autenticação técnica.
- Integrações bancárias ou APIs externas.
- Design visual detalhado.
- Estratégia de investimento específica ou recomendação de produtos financeiros.

## 19. Melhorias futuras recomendadas
- Importação de extrato bancário para facilitar conciliação.
- Notificações de vencimentos e orçamento.
- Captura rápida por voz: "gastei 50 reais no mercado".
- Leitura de comprovante/nota fiscal para sugerir categoria.
- Metas em conjunto e individuais.
- Modo viagem separado para acompanhar gastos no exterior.
- Conversão cambial para contas e reservas em moeda estrangeira.
- Conciliação: diferença entre saldo informado pelo banco e saldo calculado pelo sistema.
- Calendário financeiro de compromissos futuros.
- Cenários: "e se reduzirmos delivery em R$ 200?" ou "e se aumentarmos a reserva em R$ 1.000?".
- Painel de evolução patrimonial.
- Exportação de dados.

## 20. Glossário de negócio

| Termo | Definição |
|---|---|
| **Entrada** | Qualquer dinheiro recebido que aumente o patrimônio disponível. |
| **Saída** | Qualquer dinheiro pago/gasto que reduza o patrimônio disponível. |
| **Transferência** | Movimentação entre contas próprias, sem representar receita ou despesa. |
| **Categoria** | Classificação usada para organizar lançamentos. |
| **Orçamento** | Limite ou valor planejado para uma categoria/período. |
| **Planejamento** | Conjunto de regras para atingir uma meta ou controlar um compromisso ao longo do tempo. |
| **Meta** | Resultado desejado, normalmente com valor e prazo. |
| **Reserva** | Dinheiro separado para uma finalidade ou para emergência. |
| **Compromisso futuro** | Despesa que ainda não aconteceu, mas já é conhecida. |
| **Saldo livre** | Valor não comprometido com despesas futuras ou reservas. |
| **Lançamento** | Registro individual de uma entrada, saída ou transferência. |
| **Recorrência** | Regra que gera compromissos/lançamentos repetidos até uma condição de encerramento. |

## 21. Encerramento
O sistema deve ser construído ao redor de uma ideia simples: o casal precisa saber, a qualquer momento, quanto entrou, quanto saiu, em que saiu, quanto ainda pode gastar, quanto está comprometido e quanto está construindo para o futuro. A experiência deve facilitar o registro imediato dos gastos e, ao mesmo tempo, permitir planejamento de longo prazo. O histórico financeiro real do casal deve servir como base para metas progressivas, especialmente na redução de gastos com delivery e compras impulsivas e na formação de uma reserva de emergência.
