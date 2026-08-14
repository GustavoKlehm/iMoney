import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CreateAccount } from '../api/client';
import { PageLoading } from '../components/PageLoading';
import { formatCurrency } from '../utils/format';
import './Accounts.css';

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [isReserved, setIsReserved] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  });

  const createAccount = useMutation({
    mutationFn: (data: CreateAccount) => api.accounts.create(data),
    onSuccess: async () => {
      setName('');
      setIsReserved(false);
      setOpeningBalance('');
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const setDefault = useMutation({
    mutationFn: api.accounts.setDefault,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (accountsQuery.isLoading) {
    return <PageLoading message="Carregando contas e cofrinhos..." />;
  }

  if (accountsQuery.error) {
    return <div className="page-error">Erro: {(accountsQuery.error as Error).message}</div>;
  }

  const accounts = accountsQuery.data ?? [];
  const mutationError = createAccount.error ?? setDefault.error;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedOpeningBalance =
      openingBalance === '' ? undefined : Number(openingBalance);

    createAccount.mutate({
      name: name.trim(),
      isReserved,
      openingBalance: parsedOpeningBalance,
    });
  }

  return (
    <div className="accounts-page">
      <header className="page-header accounts-header">
        <div>
          <h1>Contas e cofrinhos</h1>
          <p className="subtitle">Separe o dinheiro disponível dos valores reservados</p>
        </div>
        <button
          type="button"
          className="btn-primary accounts-header__action"
          aria-expanded={showForm}
          aria-controls="new-account-form"
          onClick={() => setShowForm((current) => !current)}
        >
          {showForm ? 'Fechar formulário' : 'Nova conta ou cofrinho'}
        </button>
      </header>

      {showForm && (
        <form
          id="new-account-form"
          className="account-form glass-module"
          onSubmit={handleSubmit}
        >
          <div className="glass-field">
            <label htmlFor="account-name">Nome</label>
            <input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Conta principal"
              maxLength={100}
              required
              autoFocus
            />
          </div>

          <label className="account-form__checkbox">
            <input
              type="checkbox"
              checked={isReserved}
              onChange={(event) => setIsReserved(event.target.checked)}
            />
            <span>
              <strong>É cofrinho</strong>
              <small>O saldo fica reservado e não entra no saldo livre.</small>
            </span>
          </label>

          <div className="glass-field">
            <label htmlFor="opening-balance">Saldo inicial (opcional)</label>
            <input
              id="opening-balance"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
              placeholder="0,00"
            />
          </div>

          <button className="btn-submit" type="submit" disabled={createAccount.isPending}>
            {createAccount.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}

      {mutationError && (
        <div className="accounts-feedback" role="alert">
          Erro: {(mutationError as Error).message}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma conta ainda.</p>
        </div>
      ) : (
        <div className="accounts-cards">
          {accounts.map((account) => (
            <article key={account.id} className="account-card glass-module">
              <div className="account-card__details">
                <div className="account-card__heading">
                  <h2>{account.name}</h2>
                  <span className="account-badge">
                    {account.isReserved ? 'Cofrinho' : 'Conta'}
                  </span>
                  {account.isDefault && (
                    <span className="account-badge account-badge--default">Padrão</span>
                  )}
                </div>
                <span className="account-card__balance">
                  {formatCurrency(account.balance ?? 0)}
                </span>
              </div>

              {!account.isReserved && !account.isDefault && (
                <button
                  type="button"
                  className="account-card__default-action"
                  disabled={setDefault.isPending}
                  onClick={() => setDefault.mutate(account.id)}
                >
                  {setDefault.isPending && setDefault.variables === account.id
                    ? 'Definindo...'
                    : 'Definir como padrão'}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
