import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { AppLogo } from '../components/AppLogo';
import { PageLoading } from '../components/PageLoading';
import {
  formatCurrency,
  formatDate,
  getCurrentPeriod,
  RESPONSIBLE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '../utils/format';
import './Transactions.css';

export function TransactionsPage() {
  const { year, month } = getCurrentPeriod();

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => api.transactions.list({ year, month, limit: 100 }),
  });

  if (isLoading) return <PageLoading message="Carregando lançamentos..." />;
  if (error) return <div className="page-error">Erro: {(error as Error).message}</div>;

  const transactions = data?.data ?? [];

  return (
    <div className="transactions-page">
      <header className="page-header">
        <h1>Lançamentos</h1>
        <p className="subtitle">{transactions.length} registros neste mês</p>
      </header>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <AppLogo size="md" className="empty-state__logo" />
          <p>Nenhum lançamento ainda.</p>
          <a href="/lancamentos/novo" className="btn-primary">Registrar primeiro gasto</a>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((tx) => (
            <article
              key={tx.id}
              className={`transaction-row ${tx.type.toLowerCase()} ${tx.isCancelled ? 'cancelled' : ''}`}
            >
              <div className="tx-main">
                <span className="tx-desc">{tx.description}</span>
                <span className="tx-meta">
                  {tx.category?.name ?? TRANSACTION_TYPE_LABELS[tx.type]}
                  {tx.responsible && ` · ${RESPONSIBLE_LABELS[tx.responsible]}`}
                </span>
              </div>
              <div className="tx-right">
                <span className={`tx-amount ${tx.type === 'INCOME' ? 'income' : 'expense'}`}>
                  {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '−' : ''}
                  {formatCurrency(Number(tx.amount))}
                </span>
                <span className="tx-date">{formatDate(tx.date)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
