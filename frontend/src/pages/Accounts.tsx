import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Account, type CreateAccount } from '../api/client';
import { ItemActions } from '../components/ItemActions';
import { MoneyInput } from '../components/MoneyInput';
import { PageToolbar } from '../components/PageToolbar';
import { PageLoading } from '../components/PageLoading';
import { useConfirm } from '../components/ConfirmProvider';
import { removalCopy } from '../utils/confirmRemoval';
import { formatCurrency } from '../utils/format';
import './Accounts.css';

export function AccountsPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isReserved, setIsReserved] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  });

  const invalidateAccounts = async () => {
    await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createAccount = useMutation({
    mutationFn: (data: CreateAccount) => api.accounts.create(data),
    onSuccess: async () => {
      resetForm();
      await invalidateAccounts();
    },
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAccount> & { isActive?: boolean } }) =>
      api.accounts.update(id, data),
    onSuccess: async () => {
      resetForm();
      await invalidateAccounts();
    },
  });

  const setDefault = useMutation({
    mutationFn: api.accounts.setDefault,
    onSuccess: invalidateAccounts,
  });

  const removeAccount = useMutation({
    mutationFn: api.accounts.remove,
    onSuccess: invalidateAccounts,
  });

  if (accountsQuery.isLoading) {
    return <PageLoading message="Carregando contas e cofrinhos..." />;
  }

  if (accountsQuery.error) {
    return <div className="page-error">Erro: {(accountsQuery.error as Error).message}</div>;
  }

  const accounts = [...(accountsQuery.data ?? [])].sort(
    (first, second) => Number(second.isActive) - Number(first.isActive),
  );
  const editingAccount = accounts.find((account) => account.id === editingId);
  const mutationError =
    createAccount.error ?? updateAccount.error ?? setDefault.error ?? removeAccount.error;
  const mutationPending =
    createAccount.isPending || updateAccount.isPending || setDefault.isPending || removeAccount.isPending;

  function resetForm() {
    setName('');
    setIsReserved(false);
    setOpeningBalance(0);
    setEditingId(null);
    setShowForm(false);
  }

  function openCreate() {
    if (editingId) {
      setEditingId(null);
      setName('');
      setIsReserved(false);
      setOpeningBalance(0);
      setShowForm(true);
      return;
    }
    setName('');
    setIsReserved(false);
    setOpeningBalance(0);
    setShowForm((current) => !current);
  }

  function startEditing(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setIsReserved(account.isReserved);
    setOpeningBalance(0);
    setShowForm(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (editingId) {
      updateAccount.mutate({
        id: editingId,
        data: { name: trimmedName, isReserved },
      });
      return;
    }

    createAccount.mutate({
      name: trimmedName,
      isReserved,
      openingBalance: openingBalance || undefined,
    });
  }

  async function handleRemove(account: Account) {
    if (!(await confirm(removalCopy(account.name, Boolean(account.hasHistory))))) return;
    removeAccount.mutate(account.id);
  }

  return (
    <div className="accounts-page">
      <PageToolbar
        title="Contas e cofrinhos"
        subtitle="Separe o dinheiro disponível dos valores reservados"
        backTo="/cadastros"
        action={{
          label: showForm && !editingId ? 'Fechar formulário' : 'Nova conta ou cofrinho',
          onClick: openCreate,
          expanded: showForm,
          controls: 'account-form',
        }}
      />

      {showForm && (
        <form
          id="account-form"
          className="account-form glass-module"
          onSubmit={handleSubmit}
        >
          <h2 className="account-form__title">
            {editingAccount ? 'Editar conta' : 'Nova conta ou cofrinho'}
          </h2>
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
              disabled={Boolean(editingAccount?.isDefault)}
              onChange={(event) => setIsReserved(event.target.checked)}
            />
            <span>
              <strong>É cofrinho</strong>
              <small>
                {editingAccount?.isDefault
                  ? 'A conta padrão não pode virar cofrinho.'
                  : 'O saldo fica reservado e não entra no saldo livre.'}
              </small>
            </span>
          </label>

          {!editingId && (
            <div className="glass-field">
              <label htmlFor="opening-balance">Saldo inicial (opcional)</label>
              <MoneyInput
                id="opening-balance"
                value={openingBalance}
                onChange={setOpeningBalance}
              />
            </div>
          )}

          <button
            className="btn-submit"
            type="submit"
            disabled={createAccount.isPending || updateAccount.isPending}
          >
            {createAccount.isPending || updateAccount.isPending ? 'Salvando...' : 'Salvar'}
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
            <article
              key={account.id}
              className={`account-card glass-module${account.isActive ? '' : ' account-card--inactive'}`}
            >
              <div className="account-card__details">
                <div className="account-card__heading">
                  <h2>{account.name}</h2>
                  <span className="account-badge">
                    {account.isReserved ? 'Cofrinho' : 'Conta'}
                  </span>
                  {account.isDefault && (
                    <span className="account-badge account-badge--default">Padrão</span>
                  )}
                  {!account.isActive && (
                    <span className="account-badge">Inativa</span>
                  )}
                </div>
                <span className="account-card__balance">
                  {formatCurrency(account.balance ?? 0)}
                </span>
              </div>

              <ItemActions
                name={account.name}
                actions={[
                  {
                    id: 'edit',
                    label: 'Editar',
                    onSelect: () => startEditing(account),
                  },
                  ...(!account.isReserved && !account.isDefault && account.isActive
                    ? [{
                        id: 'default',
                        label: setDefault.isPending && setDefault.variables === account.id
                          ? 'Definindo...'
                          : 'Definir como padrão',
                        onSelect: () => setDefault.mutate(account.id),
                        disabled: mutationPending,
                      }]
                    : []),
                  ...(!account.isActive
                    ? [{
                        id: 'reactivate',
                        label: 'Reativar',
                        onSelect: () => updateAccount.mutate({
                          id: account.id,
                          data: { isActive: true },
                        }),
                        disabled: mutationPending,
                      }]
                    : []),
                  {
                    id: 'remove',
                    label: 'Excluir',
                    danger: true,
                    disabled: mutationPending,
                    onSelect: () => handleRemove(account),
                  },
                ]}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
