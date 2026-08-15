import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type Goal } from '../api/client';
import { ItemActions } from '../components/ItemActions';
import { MoneyInput } from '../components/MoneyInput';
import { PageLoading } from '../components/PageLoading';
import { Select } from '../components/Select';
import { useConfirm } from '../components/ConfirmProvider';
import { removalCopy } from '../utils/confirmRemoval';
import { formatCurrency } from '../utils/format';
import './GoalDetail.css';

type EditorMode = 'edit' | 'raise' | null;

function inputDate(value: string): string {
  return value.slice(0, 10);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

export function GoalDetailPage() {
  const { id = '' } = useParams();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [endDate, setEndDate] = useState('');

  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: api.plans.listGoals,
  });
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  });

  const goal = goalsQuery.data?.find((item) => item.id === id);

  useEffect(() => {
    if (!goal || editorMode !== null) return;
    setName(goal.name);
    setAccountId(goal.accountId);
    setTargetAmount(goal.targetAmount);
    setEndDate(inputDate(goal.endDate));
  }, [editorMode, goal]);

  const updateGoal = useMutation({
    mutationFn: (currentGoal: Goal) =>
      api.plans.updateGoal(
        currentGoal.id,
        editorMode === 'raise'
          ? {
              targetAmount,
              endDate,
            }
          : {
              name: name.trim(),
              accountId,
              targetAmount,
              endDate,
            },
      ),
    onSuccess: async () => {
      setEditorMode(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });

  const removeGoal = useMutation({
    mutationFn: () => api.plans.removeGoal(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      navigate('/objetivos');
    },
  });

  if (goalsQuery.isLoading || accountsQuery.isLoading) {
    return <PageLoading message="Carregando objetivo..." />;
  }

  const pageError = goalsQuery.error ?? accountsQuery.error;
  if (pageError) {
    return <div className="page-error">Erro: {(pageError as Error).message}</div>;
  }
  if (!goal) return <div className="page-error">Objetivo não encontrado.</div>;

  const reservedAccounts = (accountsQuery.data ?? []).filter(
    (account) => account.isReserved && account.isActive,
  );
  const defaultAccount = (accountsQuery.data ?? []).find(
    (account) => account.isDefault && account.isActive && !account.isReserved,
  );
  const transferToGoal = `/lancamentos/novo?type=TRANSFER&toAccountId=${encodeURIComponent(goal.accountId)}`;
  const releaseGoal = defaultAccount
    ? `/lancamentos/novo?type=TRANSFER&accountId=${encodeURIComponent(goal.accountId)}&toAccountId=${encodeURIComponent(defaultAccount.id)}`
    : '';
  const validForm = editorMode === 'raise'
    ? Boolean(targetAmount > 0 && endDate)
    : Boolean(name.trim() && accountId && targetAmount > 0 && endDate);

  function openEditor(mode: Exclude<EditorMode, null>) {
    if (!goal) return;
    setName(goal.name);
    setAccountId(goal.accountId);
    setTargetAmount(goal.targetAmount);
    setEndDate(inputDate(goal.endDate));
    setEditorMode(mode);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validForm && goal) updateGoal.mutate(goal);
  }

  return (
    <div className="goal-detail-page">
      <header className="page-header goal-detail-header">
        <div>
          <div className="goal-detail-title">
            <h1>{goal.name}</h1>
            {goal.status === 'ACHIEVED' && (
              <span className="goal-badge goal-badge--achieved">Atingido</span>
            )}
          </div>
          <p className="subtitle">Cofrinho {goal.account.name}</p>
        </div>
        <div className="goal-detail-header__actions">
          <button type="button" className="goal-secondary-button" onClick={() => openEditor('edit')}>
            Editar objetivo
          </button>
          <ItemActions
            name={goal.name}
            actions={[
              {
                id: 'remove',
                label: 'Excluir',
                danger: true,
                disabled: removeGoal.isPending,
                onSelect: () => {
                  void confirm(removalCopy(goal.name, false)).then((ok) => {
                    if (ok) removeGoal.mutate();
                  });
                },
              },
            ]}
          />
        </div>
      </header>
      {removeGoal.error && (
        <p className="goal-detail-feedback goal-detail-feedback--error" role="alert">
          Erro: {(removeGoal.error as Error).message}
        </p>
      )}

      <section className="goal-detail-summary glass-module" aria-label="Progresso do objetivo">
        <div className="goal-detail-progress" aria-label={`${goal.progress}% do objetivo`}>
          <span style={{ width: `${Math.min(goal.progress, 100)}%` }} />
        </div>
        <div className="goal-detail-balance">
          <strong>{formatCurrency(goal.currentAmount)}</strong>
          <span>de {formatCurrency(goal.targetAmount)}</span>
        </div>
        <div className="goal-detail-metrics">
          <div>
            <span>Falta juntar</span>
            <strong>{formatCurrency(goal.remaining)}</strong>
          </div>
          <div>
            <span>Reserva sugerida</span>
            <strong>{formatCurrency(goal.monthlyReserve)} /mês</strong>
          </div>
          <div>
            <span>Prazo</span>
            <strong>{formatDate(goal.endDate)}</strong>
          </div>
          <div>
            <span>Tempo restante</span>
            <strong>
              {goal.monthsRemaining === null
                ? 'Prazo vencido'
                : `${goal.monthsRemaining} ${goal.monthsRemaining === 1 ? 'mês' : 'meses'}`}
            </strong>
          </div>
        </div>
      </section>

      <section className="goal-detail-actions" aria-label="Ações do objetivo">
        <Link to={transferToGoal} className="btn-primary">Aportar</Link>
        {goal.status === 'ACHIEVED' && (
          <>
            <Link to="/objetivos" className="goal-secondary-button">Manter no cofrinho</Link>
            {goal.currentAmount > 0 && releaseGoal ? (
              <Link to={releaseGoal} className="goal-secondary-button">Liberar</Link>
            ) : (
              <button type="button" className="goal-secondary-button" disabled>
                Liberar
              </button>
            )}
            <button type="button" className="goal-secondary-button" onClick={() => openEditor('raise')}>
              Aumentar a aposta
            </button>
          </>
        )}
      </section>

      {goal.status === 'ACHIEVED' && !defaultAccount && (
        <p className="goal-detail-feedback goal-detail-feedback--error" role="alert">
          Defina uma conta padrão para liberar o valor deste cofrinho.
        </p>
      )}

      {editorMode && (
        <section className="goal-editor glass-module">
          <div className="goal-editor__heading">
            <div>
              <h2>{editorMode === 'raise' ? 'Aumentar a aposta' : 'Editar objetivo'}</h2>
              <p>
                {editorMode === 'raise'
                  ? 'Eleve a meta ou ajuste o prazo para continuar avançando.'
                  : 'Atualize os dados e acompanhe a nova reserva sugerida.'}
              </p>
            </div>
            <button type="button" className="goal-editor__close" onClick={() => setEditorMode(null)}>
              Fechar
            </button>
          </div>

          <form className="goal-editor__form" onSubmit={handleSubmit}>
            {editorMode === 'edit' && (
              <>
                <div className="glass-field">
                  <label htmlFor="goal-edit-name">Nome</label>
                  <input
                    id="goal-edit-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="glass-field">
                  <label htmlFor="goal-edit-account">Cofrinho</label>
                  <Select
                    id="goal-edit-account"
                    value={accountId}
                    onChange={setAccountId}
                    required
                    options={reservedAccounts.map((account) => ({
                      value: account.id,
                      label: account.name,
                    }))}
                  />
                </div>
              </>
            )}
            <div className="glass-field">
              <label htmlFor="goal-edit-target">Valor-alvo (R$)</label>
              <MoneyInput
                id="goal-edit-target"
                value={targetAmount}
                onChange={setTargetAmount}
                required
              />
            </div>
            <div className="glass-field">
              <label htmlFor="goal-edit-date">Prazo</label>
              <input
                id="goal-edit-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
            <button className="btn-submit goal-editor__submit" type="submit" disabled={updateGoal.isPending || !validForm}>
              {updateGoal.isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>

          {updateGoal.error && (
            <p className="goal-detail-feedback goal-detail-feedback--error" role="alert">
              Erro: {(updateGoal.error as Error).message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
