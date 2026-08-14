import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type TransactionType } from '../api/client';
import { AppLogo } from '../components/AppLogo';
import './NewTransaction.css';

function nowLocal(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function getInitialType(value: string | null): TransactionType {
  return value === 'INCOME' || value === 'EXPENSE' || value === 'TRANSFER'
    ? value
    : 'EXPENSE';
}

export function NewTransactionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [type, setType] = useState<TransactionType>(() => getInitialType(searchParams.get('type')));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(() => searchParams.get('accountId') ?? '');
  const [toAccountId, setToAccountId] = useState(() => searchParams.get('toAccountId') ?? '');
  const [date, setDate] = useState(nowLocal);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  });

  const availableCategories = categories?.filter(
    (category) => category.type === type && category.isActive && category.parentId,
  ) ?? [];
  const activeAccounts = accounts?.filter((account) => account.isActive) ?? [];
  const transferDisabled = accounts === undefined || activeAccounts.length < 2;

  useEffect(() => {
    if (!accounts) return;
    const defaultId = accounts.find((account) => account.isActive && account.isDefault)?.id ?? '';
    setAccountId((current) => current || defaultId);
  }, [accounts]);

  useEffect(() => {
    if (toAccountId && toAccountId === accountId) {
      setToAccountId('');
    }
  }, [accountId, toAccountId]);

  useEffect(() => {
    if (accounts && transferDisabled && type === 'TRANSFER') {
      setType('EXPENSE');
    }
  }, [accounts, transferDisabled, type]);

  const mutation = useMutation({
    mutationFn: api.transactions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/lancamentos');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!parsedAmount || !description.trim() || !date) return;

    const baseTransaction = {
      date,
      amount: parsedAmount,
      type,
      description: description.trim(),
      accountId: accountId || undefined,
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
        <h1>Novo lançamento</h1>
        <p className="subtitle">Registre uma movimentação financeira</p>
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
              disabled={value === 'TRANSFER' && transferDisabled}
              onClick={() => selectType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {accounts !== undefined && transferDisabled && (
          <p className="transfer-hint">Cadastre contas em Cadastros → Contas.</p>
        )}

        <div className="form-group amount-group">
          <label htmlFor="amount">Valor (R$)</label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
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

          {type !== 'TRANSFER' && activeAccounts.length > 0 && (
            <div className="form-group">
              <label htmlFor="account">Conta (opcional)</label>
              <select
                id="account"
                value={accountId}
                onChange={(e) => selectOrigin(e.target.value)}
              >
                <option value="">Não especificar</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {type === 'TRANSFER' && (
          <div className="form-row transfer-accounts">
            <div className="form-group">
              <label htmlFor="account">Conta de origem</label>
              <select
                id="account"
                value={accountId}
                onChange={(e) => selectOrigin(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="to-account">Conta de destino</label>
              <select
                id="to-account"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {activeAccounts
                  .filter((account) => account.id !== accountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
              </select>
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
