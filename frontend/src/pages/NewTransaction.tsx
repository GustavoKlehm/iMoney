import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type TransactionType } from '../api/client';
import { AppLogo } from '../components/AppLogo';
import { MoneyInput } from '../components/MoneyInput';
import { PageLoading } from '../components/PageLoading';
import { Select } from '../components/Select';
import { toAppDateTimeLocal } from '../utils/appTime';
import { sortByName } from '../utils/sortByName';
import './NewTransaction.css';

function getInitialType(value: string | null): TransactionType {
  return value === 'INCOME' || value === 'EXPENSE' || value === 'TRANSFER'
    ? value
    : 'EXPENSE';
}

export function NewTransactionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const editingId = searchParams.get('id');

  const [type, setType] = useState<TransactionType>(() => getInitialType(searchParams.get('type')));
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(() => searchParams.get('accountId') ?? '');
  const [toAccountId, setToAccountId] = useState(() => searchParams.get('toAccountId') ?? '');
  const [date, setDate] = useState(() => toAppDateTimeLocal());
  const [filled, setFilled] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  });

  const transactionQuery = useQuery({
    queryKey: ['transaction', editingId],
    queryFn: () => api.transactions.get(editingId!),
    enabled: Boolean(editingId),
  });

  const availableCategories = sortByName(
    categories?.filter(
      (category) =>
        category.type === type
        && category.parentId
        && (category.isActive || category.id === categoryId),
    ) ?? [],
  );
  const categoryOptions = availableCategories.map((category) => ({
    value: category.id,
    label: category.name,
    hint: categories?.find((item) => item.id === category.parentId)?.name,
  }));
  const formAccounts = accounts?.filter(
    (account) =>
      account.isActive || account.id === accountId || account.id === toAccountId,
  ) ?? [];
  const accountOptions = sortByName(formAccounts).map((account) => ({
    value: account.id,
    label: account.name,
  }));
  const destinationOptions = accountOptions.filter((account) => account.value !== accountId);
  const transferDisabled = accounts === undefined || formAccounts.length < 2;

  useEffect(() => {
    if (!transactionQuery.data || filled) return;
    const transaction = transactionQuery.data;
    setType(transaction.type);
    setAmount(Number(transaction.amount));
    setDescription(transaction.description);
    setCategoryId(transaction.category?.id ?? '');
    setAccountId(transaction.account?.id ?? '');
    setToAccountId(transaction.toAccount?.id ?? '');
    setDate(toAppDateTimeLocal(transaction.date));
    setFilled(true);
  }, [filled, transactionQuery.data]);

  useEffect(() => {
    if (!accounts || editingId) return;
    const defaultId = accounts.find((account) => account.isActive && account.isDefault)?.id ?? '';
    setAccountId((current) => current || defaultId);
  }, [accounts, editingId]);

  useEffect(() => {
    if (toAccountId && toAccountId === accountId) {
      setToAccountId('');
    }
  }, [accountId, toAccountId]);

  useEffect(() => {
    if (editingId) return;
    if (accounts && transferDisabled && type === 'TRANSFER') {
      setType('EXPENSE');
    }
  }, [accounts, editingId, transferDisabled, type]);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof api.transactions.create>[0]) =>
      editingId ? api.transactions.update(editingId, data) : api.transactions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigate('/lancamentos');
    },
  });

  if (editingId && transactionQuery.isLoading) {
    return <PageLoading message="Carregando lançamento..." />;
  }

  if (editingId && transactionQuery.error) {
    return <div className="page-error">Erro: {(transactionQuery.error as Error).message}</div>;
  }

  if (editingId && transactionQuery.data?.isCancelled) {
    return <div className="page-error">Lançamento cancelado não pode ser editado.</div>;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description.trim() || !date || !accountId) return;

    const baseTransaction = {
      date,
      amount,
      type,
      description: description.trim(),
      accountId,
    };

    if (type === 'TRANSFER') {
      if (!accountId || !toAccountId || accountId === toAccountId) return;
      mutation.mutate({ ...baseTransaction, toAccountId });
      return;
    }

    if (!categoryId) return;
    mutation.mutate({ ...baseTransaction, categoryId });
  }

  function selectType(nextType: TransactionType) {
    if (editingId) return;
    if (nextType === 'TRANSFER' && transferDisabled) return;
    setType(nextType);
    setCategoryId('');
  }

  function selectOrigin(nextAccountId: string) {
    setAccountId(nextAccountId);
    if (nextAccountId === toAccountId) setToAccountId('');
  }

  return (
    <div className="new-transaction">
      <header className="page-header">
        <h1>{editingId ? 'Editar lançamento' : 'Novo lançamento'}</h1>
        <p className="subtitle">
          {editingId ? 'Corrija os dados desta movimentação' : 'Registre uma movimentação financeira'}
        </p>
      </header>

      <form className="tx-form" onSubmit={handleSubmit}>
        <div className="tx-form__logo-wrap">
          <AppLogo size="md" />
        </div>
        <div className="transaction-type" role="group" aria-label="Tipo de lançamento">
          {([
            ['INCOME', 'Entrada'],
            ['EXPENSE', 'Saída'],
            ['TRANSFER', 'Transferência'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={type === value ? 'active' : ''}
              aria-pressed={type === value}
              disabled={Boolean(editingId) || (value === 'TRANSFER' && transferDisabled)}
              onClick={() => selectType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {accounts !== undefined && transferDisabled && !editingId && (
          <p className="transfer-hint">Cadastre contas em Cadastros → Contas.</p>
        )}

        <div className="form-group amount-group">
          <label htmlFor="amount">Valor (R$)</label>
          <MoneyInput
            id="amount"
            value={amount}
            onChange={setAmount}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Descrição</label>
          <input
            id="description"
            type="text"
            placeholder="Ex: mercado, salário ou reserva"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {type !== 'TRANSFER' && (
          <div className="form-group">
            <label htmlFor="category">Categoria</label>
            <Select
              id="category"
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder="Selecione..."
              required
            />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Data e hora</label>
            <input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {type !== 'TRANSFER' && (
            <div className="form-group">
              <label htmlFor="account">Conta de origem</label>
              <Select
                id="account"
                value={accountId}
                onChange={selectOrigin}
                options={accountOptions}
                placeholder="Selecione..."
                required
              />
            </div>
          )}
        </div>

        {type === 'TRANSFER' && (
          <div className="form-row transfer-accounts">
            <div className="form-group">
              <label htmlFor="account">Conta de origem</label>
              <Select
                id="account"
                value={accountId}
                onChange={selectOrigin}
                options={accountOptions}
                placeholder="Selecione..."
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="to-account">Conta de destino</label>
              <Select
                id="to-account"
                value={toAccountId}
                onChange={setToAccountId}
                options={destinationOptions}
                placeholder="Selecione..."
                required
              />
            </div>
          </div>
        )}

        {mutation.error && (
          <p className="form-error">{(mutation.error as Error).message}</p>
        )}

        <button type="submit" className="btn-submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
