import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ItemActions } from '../components/ItemActions';
import { MoneyInput } from '../components/MoneyInput';
import { PageToolbar } from '../components/PageToolbar';
import { PageLoading } from '../components/PageLoading';
import { Select } from '../components/Select';
import { useConfirm } from '../components/ConfirmProvider';
import { removalCopy } from '../utils/confirmRemoval';
import { formatCurrency } from '../utils/format';
import './Goals.css';

const CREATE_PIGGY = '__create_piggy__';

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultEndDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 12);
  return dateInputValue(date);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

export function GoalsPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [piggyName, setPiggyName] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: api.plans.listGoals,
  });
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  });

  const createGoal = useMutation({
    mutationFn: async () => {
      let selectedAccountId = accountId;
      if (accountId === CREATE_PIGGY) {
        const piggy = await api.accounts.create({
          name: piggyName.trim(),
          isReserved: true,
        });
        selectedAccountId = piggy.id;
      }
      return api.plans.createGoal({
        name: name.trim(),
        accountId: selectedAccountId,
        targetAmount,
        endDate,
      });
    },
    onSuccess: async (goal) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
      navigate(`/objetivos/${goal.id}`);
    },
  });

  const removeGoal = useMutation({
    mutationFn: api.plans.removeGoal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const reservedAccounts = (accountsQuery.data ?? []).filter(
    (account) => account.isReserved && account.isActive,
  );
  const validAmount = targetAmount > 0;
  const canCreate = Boolean(
    name.trim()
      && validAmount
      && endDate
      && (accountId !== CREATE_PIGGY ? accountId : piggyName.trim()),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canCreate) createGoal.mutate();
  }

  if (goalsQuery.isLoading || accountsQuery.isLoading) {
    return <PageLoading message="Carregando objetivos..." />;
  }

  const pageError = goalsQuery.error ?? accountsQuery.error;
  if (pageError) {
    return <div className="page-error">Erro: {(pageError as Error).message}</div>;
  }

  const goals = goalsQuery.data ?? [];

  return (
    <div className="goals-page">
      <PageToolbar
        title="Objetivos"
        subtitle="Transforme seus cofrinhos em planos de longo prazo"
        backTo="/cadastros"
        action={{
          label: showForm ? 'Fechar formulário' : 'Novo objetivo',
          onClick: () => setShowForm((current) => !current),
          expanded: showForm,
          controls: 'new-goal',
        }}
      />

      {showForm && (
        <form id="new-goal" className="goal-form glass-module" onSubmit={handleSubmit}>
          <div className="glass-field goal-form__wide">
            <label htmlFor="goal-name">Nome do objetivo</label>
            <input
              id="goal-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Entrada do apartamento"
              maxLength={100}
              required
              autoFocus
            />
          </div>

          <div className="glass-field">
            <label htmlFor="goal-account">Cofrinho</label>
            <Select
              id="goal-account"
              value={accountId}
              onChange={setAccountId}
              placeholder="Selecione..."
              required
              options={[
                ...reservedAccounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
                { value: CREATE_PIGGY, label: 'Criar cofrinho' },
              ]}
            />
          </div>

          {accountId === CREATE_PIGGY && (
            <div className="glass-field">
              <label htmlFor="goal-piggy-name">Nome do novo cofrinho</label>
              <input
                id="goal-piggy-name"
                value={piggyName}
                onChange={(event) => setPiggyName(event.target.value)}
                placeholder="Ex.: Nosso apartamento"
                maxLength={100}
                required
              />
            </div>
          )}

          <div className="glass-field">
            <label htmlFor="goal-target">Valor-alvo (R$)</label>
            <MoneyInput
              id="goal-target"
              value={targetAmount}
              onChange={setTargetAmount}
              required
            />
          </div>

          <div className="glass-field">
            <label htmlFor="goal-end-date">Prazo</label>
            <input
              id="goal-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </div>

          <button className="btn-submit goal-form__submit" type="submit" disabled={createGoal.isPending || !canCreate}>
            {createGoal.isPending ? 'Criando...' : 'Criar objetivo'}
          </button>
        </form>
      )}

      {createGoal.error && (
        <p className="goals-feedback goals-feedback--error" role="alert">
          Erro: {(createGoal.error as Error).message}
        </p>
      )}
      {removeGoal.error && (
        <p className="goals-feedback goals-feedback--error" role="alert">
          Erro: {(removeGoal.error as Error).message}
        </p>
      )}

      {goals.length === 0 ? (
        <div className="empty-state goals-empty">
          <h2>Seu próximo sonho começa aqui</h2>
          <p>Crie um objetivo e acompanhe quanto reservar por mês.</p>
        </div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const expired = goal.monthsRemaining === null && goal.currentAmount < goal.targetAmount;
            return (
              <article key={goal.id} className="goal-card glass-module">
                <div className="goal-card__toolbar">
                  <ItemActions
                    name={goal.name}
                    actions={[
                      {
                        id: 'edit',
                        label: 'Editar',
                        onSelect: () => navigate(`/objetivos/${goal.id}`),
                      },
                      {
                        id: 'remove',
                        label: 'Excluir',
                        danger: true,
                        disabled: removeGoal.isPending,
                        onSelect: () => {
                          void confirm(removalCopy(goal.name, false)).then((ok) => {
                            if (ok) removeGoal.mutate(goal.id);
                          });
                        },
                      },
                    ]}
                  />
                </div>
                <Link to={`/objetivos/${goal.id}`} className="goal-card__hit">
                <div className="goal-card__heading">
                  <div>
                    <h2>{goal.name}</h2>
                    <p>{goal.account.name}</p>
                  </div>
                  {goal.status === 'ACHIEVED' && (
                    <span className="goal-badge goal-badge--achieved">Atingido</span>
                  )}
                  {expired && <span className="goal-badge goal-badge--expired">Prazo vencido</span>}
                </div>

                <div className="goal-progress" aria-label={`${goal.progress}% do objetivo`}>
                  <span style={{ width: `${Math.min(goal.progress, 100)}%` }} />
                </div>
                <div className="goal-card__amounts">
                  <strong>{formatCurrency(goal.currentAmount)}</strong>
                  <span>de {formatCurrency(goal.targetAmount)}</span>
                </div>

                <div className="goal-card__footer">
                  <span>Prazo: {formatDate(goal.endDate)}</span>
                  <strong>{formatCurrency(goal.monthlyReserve)} /mês</strong>
                </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
