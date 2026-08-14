import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AppLogo } from '../components/AppLogo';
import { PageLoading } from '../components/PageLoading';
import {
  formatCurrency,
  formatDateTime,
  getCurrentPeriod,
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
        <div>
          <h1>Lançamentos</h1>
          <p className="subtitle">{transactions.length} registros neste mês</p>
        </div>
        <Link to="/lancamentos/novo" className="btn-primary">
          Adicionar lançamento
        </Link>
      </header>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <AppLogo size="md" className="empty-state__logo" />
          <p>Nenhum lançamento ainda.</p>
          <Link to="/lancamentos/novo" className="btn-primary">
            Adicionar lançamento
          </Link>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((tx) => (
            <article
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
              <div className="tx-right">
                <span className={`tx-amount ${tx.type.toLowerCase()}`}>
                  {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '−' : ''}
                  {formatCurrency(Number(tx.amount))}
                </span>
                <span className="tx-date">{formatDateTime(tx.date)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
