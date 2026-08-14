import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type Responsible } from '../api/client';
import { AppLogo } from '../components/AppLogo';
import './NewTransaction.css';

export function NewTransactionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [responsible, setResponsible] = useState<Responsible>('COUPLE');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  });

  const expenseCategories = categories?.filter(
    (c) => c.type === 'EXPENSE' && c.isActive && c.parentId,
  ) ?? [];

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
    if (!parsedAmount || !description || !categoryId) return;

    mutation.mutate({
      date,
      amount: parsedAmount,
      type: 'EXPENSE',
      description,
      categoryId,
      accountId: accountId || undefined,
      responsible,
    });
  }

  return (
    <div className="new-transaction">
      <header className="page-header">
        <h1>Registrar gasto</h1>
        <p className="subtitle">Rápido — ideal para usar no celular</p>
      </header>

      <form className="tx-form" onSubmit={handleSubmit}>
        <div className="tx-form__logo-wrap">
          <AppLogo size="md" />
        </div>
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
            placeholder="Ex: mercado Carrefour"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Categoria</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Data</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="responsible">Quem gastou</label>
            <select
              id="responsible"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value as Responsible)}
            >
              <option value="USER">Gustavo</option>
              <option value="PARTNER">Noiva</option>
              <option value="COUPLE">Casal</option>
            </select>
          </div>
        </div>

        {accounts && accounts.length > 0 && (
          <div className="form-group">
            <label htmlFor="account">Conta (opcional)</label>
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Não especificar</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        )}

        {mutation.error && (
          <p className="form-error">{(mutation.error as Error).message}</p>
        )}

        <button type="submit" className="btn-submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar gasto'}
        </button>
      </form>
    </div>
  );
}
