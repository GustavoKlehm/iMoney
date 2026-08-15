import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AppLogo } from '../components/AppLogo';
import { ItemActions } from '../components/ItemActions';
import { PageLoading } from '../components/PageLoading';
import { useConfirm } from '../components/ConfirmProvider';
import { transactionRemovalCopy } from '../utils/confirmRemoval';
import {
  formatCurrency,
  formatDateTime,
  getCurrentPeriod,
  TRANSACTION_TYPE_LABELS,
} from '../utils/format';
import './Transactions.css';

export function TransactionsPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { year, month } = getCurrentPeriod();

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => api.transactions.list({ year, month, limit: 100 }),
  });

  const removeTransaction = useMutation({
    mutationFn: api.transactions.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  if (isLoading) return <PageLoading message="Carregando lançamentos..." />;
  if (error) return <div className="page-error">Erro: {(error as Error).message}</div>;

  const transactions = [...(data?.data ?? [])].sort(
    (first, second) => new Date(second.date).getTime() - new Date(first.date).getTime(),
  );

  return (
    <div className="transactions-page">
      <header className="page-header">
        <div>
          <h1>Lançamentos</h1>
          <p className="subtitle">{transactions.length} registros neste mês</p>
        </div>
        <Link to="/lancamentos/novo" className="btn-primary">
          Adicionar lançamento
        </Link>
      </header>

      {removeTransaction.error && (
        <div className="page-error" role="alert">
          Erro: {(removeTransaction.error as Error).message}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="empty-state">
          <AppLogo size="md" className="empty-state__logo" />
          <p>Nenhum lançamento ainda.</p>
          <Link to="/lancamentos/novo" className="btn-primary">
            Adicionar lançamento
          </Link>
        </div>
      ) : (
        <ul className="transactions-list glass-module">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className={`transaction-row ${tx.type.toLowerCase()} ${tx.isCancelled ? 'cancelled' : ''}`}
            >
              <div className="tx-main">
                <span className="tx-desc">
                  {tx.description}
                  {tx.isOpeningBalance && <span className="tx-badge">Saldo inicial</span>}
                </span>
                <span className="tx-meta">
                  {tx.type === 'TRANSFER'
                    ? `${tx.account?.name ?? 'Conta de origem'} → ${tx.toAccount?.name ?? 'Conta de destino'}`
                    : tx.category?.name ?? TRANSACTION_TYPE_LABELS[tx.type]}
                </span>
              </div>
              <div className="tx-values">
                <span className={`tx-amount ${tx.type.toLowerCase()}`}>
                  {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '−' : ''}
                  {formatCurrency(Number(tx.amount))}
                </span>
                <time className="tx-date" dateTime={tx.date}>
                  {formatDateTime(tx.date)}
                </time>
              </div>
              <ItemActions
                name={tx.description}
                actions={[
                  ...(!tx.isCancelled
                    ? [{
                        id: 'edit',
                        label: 'Editar',
                        onSelect: () => navigate(`/lancamentos/novo?id=${encodeURIComponent(tx.id)}`),
                      }]
                    : []),
                  {
                    id: 'remove',
                    label: 'Excluir',
                    danger: true,
                    disabled: removeTransaction.isPending,
                    onSelect: () => {
                      void confirm(transactionRemovalCopy(tx.description)).then((ok) => {
                        if (ok) removeTransaction.mutate(tx.id);
                      });
                    },
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

